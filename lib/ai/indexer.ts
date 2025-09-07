import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { splitMarkdown } from "@/lib/ai/markdownSplitter";
import { initVectorStore } from "@/lib/ai/vector";

type Cache = Record<string, string>;
const g = globalThis as any;
if (!g.__RAG_INDEX_CACHE) g.__RAG_INDEX_CACHE = {} as Cache;

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function loadFile(p: string) {
  const text = await fs.readFile(p, "utf8");
  const hash = sha(text);
  return { text, hash };
}

async function ingestFile(abs: string, rel: string, force = false) {
  const { text, hash } = await loadFile(abs);
  const cached = g.__RAG_INDEX_CACHE[rel];
  if (!force && cached === hash)
    return { docId: rel, updated: false, chunks: 0 };
  const name = path.basename(rel);
  const docs = await splitMarkdown(text, name);
  const store = await initVectorStore();
  await store.addDocuments(docs as any);
  g.__RAG_INDEX_CACHE[rel] = hash;
  return { docId: rel, updated: true, chunks: docs.length };
}

async function listMarkdownFiles(dir: string) {
  const abs = path.resolve(process.cwd(), dir);
  try {
    const names = await fs.readdir(abs);
    const files: Array<{ abs: string; rel: string }> = [];
    for (const n of names)
      if (n.toLowerCase().endsWith(".md"))
        files.push({ abs: path.join(abs, n), rel: path.join(dir, n) });
    return files;
  } catch {
    return [];
  }
}

const builtFlag = "__RAG_INDEX_BUILT";
const DATA_DIR = "data";

export async function ensureIndexed(dir: string = DATA_DIR) {
  if (!g[builtFlag] || process.env.RAG_FORCE_REINDEX) {
    const files = await listMarkdownFiles(dir);
    const results: Array<{ docId: string; updated: boolean; chunks: number }> =
      [];
    for (const f of files)
      results.push(
        await ingestFile(f.abs, f.rel, !!process.env.RAG_FORCE_REINDEX)
      );
    g[builtFlag] = true;
    return results;
  }
  return [];
}

export async function reindexAll(dir: string = DATA_DIR) {
  const files = await listMarkdownFiles(dir);
  const results: Array<{ docId: string; updated: boolean; chunks: number }> =
    [];
  for (const f of files) results.push(await ingestFile(f.abs, f.rel, true));
  return results;
}
