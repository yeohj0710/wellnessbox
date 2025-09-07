import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Document } from "@langchain/core/documents";
import { getEmbeddings } from "./model";
import { splitMarkdown } from "./markdownSplitter";

type Vec = number[];
type Cache = Record<string, string>;

class LocalVectorStore {
  docs: Document[] = [];
  vecs: Vec[] = [];
  async addDocuments(docs: Document[]) {
    const emb = getEmbeddings();
    const vectors = await emb.embedDocuments(docs.map((d) => d.pageContent));
    this.docs.push(...docs);
    this.vecs.push(...vectors);
  }
  asRetriever({ k }: { k: number }) {
    const self = this;
    return {
      async getRelevantDocuments(query: string) {
        const emb = getEmbeddings();
        const q = await emb.embedQuery(query);
        const pairs = self.vecs.map(
          (v, i) => [self.docs[i], cos(q, v)] as [Document, number]
        );
        pairs.sort((a, b) => b[1] - a[1]);
        const top = pairs.slice(0, Math.min(20, k * 4));
        const selected: { doc: Document; score: number; vec: Vec }[] = [];
        const docVecs = await emb.embedDocuments(
          top.map(([d]) => d.pageContent)
        );
        for (let i = 0; i < top.length; i++) {
          const [doc, score] = top[i];
          if (score < 0.2) continue;
          const v = docVecs[i];
          let dup = false;
          for (const s of selected)
            if (cos(s.vec, v) > 0.95) {
              dup = true;
              break;
            }
          if (!dup) selected.push({ doc, score, vec: v });
          if (selected.length >= Math.min(20, k * 4)) break;
        }
        const out: Document[] = [];
        const pick: typeof selected = [];
        while (out.length < k && selected.length) {
          let best = 0,
            bestVal = -Infinity;
          for (let i = 0; i < selected.length; i++) {
            const cand = selected[i];
            let sim = 0;
            for (const s of pick) sim = Math.max(sim, cos(cand.vec, s.vec));
            const val = 0.5 * cand.score - 0.5 * sim;
            if (val > bestVal) {
              bestVal = val;
              best = i;
            }
          }
          const [chosen] = selected.splice(best, 1);
          pick.push(chosen);
          out.push(chosen.doc);
        }
        return out;
      },
    };
  }
}

function cos(a: Vec, b: Vec) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

let store: LocalVectorStore | any = null;
let cache: Cache = (globalThis as any).__RAG_INDEX_CACHE || {};
let indexedOnce: boolean = (globalThis as any).__RAG_INDEX_BUILT || false;
const DATA_DIR = process.env.RAG_DATA_DIR || "data";
(globalThis as any).__RAG_INDEX_CACHE = cache;

function markIndexed() {
  (globalThis as any).__RAG_INDEX_BUILT = true;
  indexedOnce = true;
}

async function initVectorStore() {
  if (store) return store;
  if (process.env.RAG_DATABASE_URL) {
    const { PGVectorStore } = await import(
      "@langchain/community/vectorstores/pgvector"
    );
    const emb = getEmbeddings();
    store = await PGVectorStore.initialize(emb, {
      postgresConnectionOptions: {
        connectionString: process.env.RAG_DATABASE_URL as string,
      },
      tableName: "rag_chunks",
    });
  } else {
    store = new LocalVectorStore();
  }
  return store;
}

async function ingestFile(abs: string, rel: string, force = false) {
  const text = await fs.readFile(abs, "utf8");
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  if (!force && cache[rel] === hash)
    return { docId: rel, updated: false, chunks: 0 };
  const docs = await splitMarkdown(text, path.basename(rel));
  await (await initVectorStore()).addDocuments(docs as any);
  cache[rel] = hash;
  return { docId: rel, updated: true, chunks: docs.length };
}

async function listMarkdownFiles(dir: string) {
  const abs = path.resolve(process.cwd(), dir);
  try {
    const names = await fs.readdir(abs);
    return names
      .filter((n) => n.toLowerCase().endsWith(".md"))
      .map((n) => ({ abs: path.join(abs, n), rel: path.join(dir, n) }));
  } catch {
    return [];
  }
}

export async function ensureIndexed(dir = DATA_DIR) {
  if (indexedOnce && !process.env.RAG_FORCE_REINDEX) return [];
  const files = await listMarkdownFiles(dir);
  const results: any[] = [];
  for (const f of files) results.push(await ingestFile(f.abs, f.rel));
  markIndexed();
  return results;
}

export async function getRetriever() {
  const s = await initVectorStore();
  const k = Number(process.env.RAG_TOP_K) || 8;
  if (typeof s.asRetriever === "function") return s.asRetriever({ k });
  return (s as LocalVectorStore).asRetriever({ k });
}

export { initVectorStore };
