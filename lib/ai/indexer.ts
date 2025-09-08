import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { splitMarkdown } from "@/lib/ai/markdownSplitter";
import { upsertDocuments, resetInMemoryStore } from "@/lib/ai/retriever";
import pg from "pg";

type Cache = Record<string, string>;
const g = globalThis as any;

if (!g.__RAG_INDEX_CACHE) g.__RAG_INDEX_CACHE = {} as Cache;
if (!g.__RAG_INDEX_BUILT) g.__RAG_INDEX_BUILT = false;
if (!g.__RAG_INDEX_LOCK) g.__RAG_INDEX_LOCK = null;
if (!g.__RAG_REINDEX_LOCK) g.__RAG_REINDEX_LOCK = null;

const DATA_DIR = "data";
const builtFlag = "__RAG_INDEX_BUILT";

async function wipePgTableHard(): Promise<boolean> {
  const url = process.env.WELLNESSBOX_PRISMA_URL;
  if (!url) return false;
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await pool.query(`TRUNCATE TABLE public.rag_chunks;`);
    if (process.env.RAG_DEBUG) console.debug("[reindex] TRUNCATE rag_chunks");
    return true;
  } catch (e) {
    if (process.env.RAG_DEBUG) console.warn("[reindex] TRUNCATE failed", e);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

const RAG_DEBUG = !!process.env.RAG_DEBUG;

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function loadFile(abs: string) {
  const text = await fs.readFile(abs, "utf8");
  const hash = sha256(text);
  return { text, hash };
}

async function ingestFile(abs: string, rel: string, force = false) {
  const normRel = rel.replace(/\\/g, "/");
  const { text, hash } = await loadFile(abs);
  const cached = g.__RAG_INDEX_CACHE[normRel];
  if (!force && cached === hash)
    return { docId: normRel, updated: false, chunks: 0 };

  const name = path.basename(normRel);
  const rawDocs = await splitMarkdown(text, name);
  const docs = rawDocs.map((d: any) => ({
    ...d,
    metadata: { ...(d.metadata || {}), source: normRel },
  }));
  const ids = docs.map(
    (d: any) => `${normRel}:${d.metadata.hash}:${d.metadata.idx}`
  );
  await upsertDocuments(docs as any, ids);

  g.__RAG_INDEX_CACHE[normRel] = hash;
  return { docId: normRel, updated: true, chunks: docs.length };
}

async function listMarkdownFiles(dir: string) {
  const projectRoot = path.resolve(process.cwd());
  const root = path.resolve(projectRoot, dir);
  async function walk(
    current: string
  ): Promise<{ abs: string; rel: string }[]> {
    const ents = await fs.readdir(current, { withFileTypes: true });
    const out: { abs: string; rel: string }[] = [];
    for (const e of ents) {
      const p = path.join(current, e.name);
      if (e.isDirectory()) out.push(...(await walk(p)));
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        const sub = path.relative(root, p).replace(/\\/g, "/");
        const rel = path.posix.join(dir, sub);
        out.push({ abs: p, rel });
      }
    }
    return out;
  }
  try {
    return await walk(root);
  } catch {
    return [];
  }
}

export async function ensureIndexed(dir = DATA_DIR) {
  if (g.__RAG_INDEX_LOCK) return g.__RAG_INDEX_LOCK;
  g.__RAG_INDEX_LOCK = (async () => {
    const first = !g[builtFlag];
    if (first && !process.env.WELLNESSBOX_PRISMA_URL)
      await resetInMemoryStore();
    const files = await listMarkdownFiles(dir);
    const force = !!process.env.RAG_FORCE_REINDEX;
    const results: any[] = [];
    for (const f of files) results.push(await ingestFile(f.abs, f.rel, force));
    g[builtFlag] = true;
    if (RAG_DEBUG)
      console.debug(`[rag:index] ensureIndexed files=${files.length}`);
    return results;
  })();
  try {
    return await g.__RAG_INDEX_LOCK;
  } finally {
    g.__RAG_INDEX_LOCK = null;
  }
}

export async function reindexAll(dir = DATA_DIR) {
  if (g.__RAG_INDEX_LOCK) await g.__RAG_INDEX_LOCK;
  if (g.__RAG_REINDEX_LOCK) return g.__RAG_REINDEX_LOCK;
  g.__RAG_REINDEX_LOCK = (async () => {
    await resetInMemoryStore();

    let wiped = false;
    if (process.env.WELLNESSBOX_PRISMA_URL) {
      try {
        const { getEmbeddings } = await import("@/lib/ai/model");
        const { PGVectorStore } = await import(
          "@langchain/community/vectorstores/pgvector"
        );
        const e = getEmbeddings();
        const pg = await PGVectorStore.initialize(e, {
          postgresConnectionOptions: {
            connectionString: process.env.WELLNESSBOX_PRISMA_URL as string,
          },
          tableName: "rag_chunks",
        });
        await (pg as any).delete({ deleteAll: true });
        wiped = true;
        if (process.env.RAG_DEBUG)
          console.debug("[reindex] PGVectorStore.delete(all)");
      } catch (e) {
        if (process.env.RAG_DEBUG)
          console.warn("[reindex] PGVectorStore.delete failed", e);
      }

      if (!wiped) {
        wiped = await wipePgTableHard();
      }
    }

    const files = await listMarkdownFiles(dir);
    const results: any[] = [];
    for (const f of files) results.push(await ingestFile(f.abs, f.rel, true));
    g[builtFlag] = true;
    return results;
  })();
  try {
    return await g.__RAG_REINDEX_LOCK;
  } finally {
    g.__RAG_REINDEX_LOCK = null;
  }
}
