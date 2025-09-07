import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
// Avoid eager imports of heavy backends to keep bundles small.
import type { VectorStore } from "@langchain/core/vectorstores";
import { getEmbeddings } from "./model";
import { splitMarkdown } from "./markdownSplitter";

let store: VectorStore | null = null;
let cache: Record<string, string> = (globalThis as any).__RAG_INDEX_CACHE || {};
let indexedOnce: boolean = (globalThis as any).__RAG_INDEX_BUILT || false;
(globalThis as any).__RAG_INDEX_CACHE = cache;
function markIndexed() {
  (globalThis as any).__RAG_INDEX_BUILT = true;
  indexedOnce = true;
}

async function initVectorStore() {
  if (store) return store;
  const embeddings = getEmbeddings();
  if (process.env.RAG_DATABASE_URL) {
    // Load PGVector lazily only when actually used.
    const { PGVectorStore } = await import("@langchain/community/vectorstores/pgvector");
    store = await PGVectorStore.initialize(embeddings, {
      postgresConnectionOptions: {
        connectionString: process.env.RAG_DATABASE_URL,
      },
      tableName: "rag_chunks",
    });
  } else {
    const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
    store = new MemoryVectorStore(embeddings);
  }
  return store;
}

async function ingestFile(abs: string, rel: string, force = false) {
  const text = await fs.readFile(abs, "utf8");
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  if (!force && cache[rel] === hash)
    return { docId: rel, updated: false, chunks: 0 };
  const docs = await splitMarkdown(text, path.basename(rel));
  await (await initVectorStore()).addDocuments(docs);
  cache[rel] = hash;
  return { docId: rel, updated: true, chunks: docs.length };
}

async function listMarkdownFiles(dir: string) {
  const abs = path.resolve(process.cwd(), dir);
  const names = await fs.readdir(abs);
  return names
    .filter((n) => n.toLowerCase().endsWith(".md"))
    .map((n) => ({ abs: path.join(abs, n), rel: path.join(dir, n) }));
}

export async function ensureIndexed(dir = "data") {
  // Fast path: index once per process unless forced.
  if (indexedOnce && !process.env.RAG_FORCE_REINDEX) return [];
  const files = await listMarkdownFiles(dir);
  const results = [] as any[];
  for (const f of files) results.push(await ingestFile(f.abs, f.rel));
  markIndexed();
  return results;
}

export async function getRetriever() {
  const s = await initVectorStore();
  const k = Number(process.env.RAG_TOP_K) || 8;
  return s.asRetriever({ k });
}

export { initVectorStore };
