import { VectorStore } from "@langchain/core/vectorstores";
import type { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { getEmbeddings } from "@/lib/ai/model";
import pg from "pg";

export const RAG_TOP_K = 6;
export const RAG_MMR = 0.8;
export const RAG_SCORE_MIN = -1;
const VEC_CANDIDATES = 128;
const LEX_CANDIDATES = 64;

const RAG_DEBUG = !!process.env.RAG_DEBUG;
const REQUIRE_PG = process.env.RAG_REQUIRE_PG === "1";

class InMemoryStore extends VectorStore {
  texts: string[] = [];
  vectors: number[][] = [];
  docs: Document[] = [];
  idIndex: Map<string, number> = new Map();
  embeddings: EmbeddingsInterface;
  constructor(embeddings: EmbeddingsInterface) {
    super(embeddings, {});
    this.embeddings = embeddings;
  }
  async addVectors(
    vectors: number[][],
    docs: Document[],
    options?: { ids?: string[] }
  ) {
    const ids = options?.ids || [];
    for (let i = 0; i < vectors.length; i++) {
      const id = ids[i];
      if (id && this.idIndex.has(id)) {
        const idx = this.idIndex.get(id)!;
        this.vectors[idx] = vectors[i];
        this.docs[idx] = docs[i];
      } else {
        this.vectors.push(vectors[i]);
        this.docs.push(docs[i]);
        if (id) this.idIndex.set(id, this.vectors.length - 1);
      }
    }
    return ids;
  }
  async similaritySearchVectorWithScore(query: number[], k: number) {
    const scores = this.vectors.map(
      (v, i) => [this.docs[i], cos(query, v)] as [Document, number]
    );
    scores.sort((a, b) => b[1] - a[1]);
    return scores.slice(0, k);
  }
  _vectorstoreType() {
    return "inmemory";
  }
  async addDocuments(docs: Document[]) {
    const vectors = await this.embeddings.embedDocuments(
      docs.map((d) => d.pageContent)
    );
    return this.addVectors(vectors, docs);
  }
}

const g = globalThis as any;
let embeddings: EmbeddingsInterface;
let store: any;

async function init() {
  if (!embeddings)
    embeddings = g.__RAG_EMBEDDINGS || (g.__RAG_EMBEDDINGS = getEmbeddings());
  if (!store) {
    const hasPg = !!process.env.WELLNESSBOX_PRISMA_URL;
    if (hasPg) {
      if (!g.__RAG_STORE) {
        const { PGVectorStore } = await import(
          "@langchain/community/vectorstores/pgvector"
        );
        const e = embeddings;
        g.__RAG_STORE = await PGVectorStore.initialize(e, {
          postgresConnectionOptions: {
            connectionString: process.env.WELLNESSBOX_PRISMA_URL as string,
          },
          tableName: "rag_chunks",
        });
      }
      store = g.__RAG_STORE;
    } else {
      if (REQUIRE_PG) {
        throw new Error(
          "RAG_REQUIRE_PG=1 but WELLNESSBOX_PRISMA_URL is not set"
        );
      }
      if (!g.__RAG_STORE) g.__RAG_STORE = new InMemoryStore(embeddings);
      store = g.__RAG_STORE;
    }
    if (RAG_DEBUG)
      console.debug(`[rag:init] store=${hasPg ? "pgvector" : "memory"}`);
  }
}

function isPg() {
  return !!process.env.WELLNESSBOX_PRISMA_URL;
}

export function ragStoreKind() {
  return isPg() ? "pgvector" : "memory";
}

let pool: pg.Pool | null = null;
function getPgPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.WELLNESSBOX_PRISMA_URL as string,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
      allowExitOnIdle: true,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    pool.on("error", () => {});
  }
  return pool;
}

async function keywordAugmentFromPg(q: string, limit = LEX_CANDIDATES) {
  const ks = tokens(q);
  if (!ks.length) return [];
  const like = ks.map((k) => `%${k}%`);
  const sql = `
    SELECT id, "text" AS "pageContent", metadata
    FROM rag_chunks
    WHERE ${like.map((_, i) => `"text" ILIKE $${i + 1}`).join(" OR ")}
    LIMIT ${limit}
  `;
  try {
    const { rows } = await getPgPool().query(sql, like);
    return rows.map((r: any) => ({
      pageContent: r.pageContent,
      metadata: r.metadata,
    }));
  } catch {
    return [];
  }
}

function cos(a: number[], b: number[]) {
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

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokens(s: string) {
  return norm(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function lexicalScore(q: string, text: string) {
  const nq = norm(q);
  const t = norm(text);
  if (!nq) return 0;
  const qs = tokens(nq);
  if (!qs.length) return 0;
  let hits = 0;
  for (const k of qs) if (t.includes(k)) hits++;
  const frac = hits / qs.length;
  let score = frac;
  if (nq.length >= 3 && t.includes(nq)) score += 1;
  return score;
}

function toSimFromPgDistance(d: number) {
  const clamped = Math.max(0, Math.min(2, d));
  return 1 - clamped / 2;
}

export async function getRelevantDocuments(
  question: string,
  k = RAG_TOP_K,
  mmr = RAG_MMR,
  scoreThreshold = RAG_SCORE_MIN
) {
  await init();
  const qvec = await embeddings.embedQuery(question);
  const vecResults: Array<[Document, number]> =
    await store.similaritySearchVectorWithScore(qvec, VEC_CANDIDATES);

  const baseTexts = vecResults.map(([d]) => d.pageContent);
  const baseVecs = baseTexts.length
    ? await embeddings.embedDocuments(baseTexts)
    : [];

  const picked: {
    doc: Document;
    score: number;
    vec: number[];
    text: string;
  }[] = [];

  for (let i = 0; i < vecResults.length; i++) {
    const [doc, rawScore] = vecResults[i];
    if (rawScore < scoreThreshold) continue;
    const v = baseVecs[i];
    const l = lexicalScore(question, baseTexts[i]);
    const sim = isPg() ? toSimFromPgDistance(rawScore) : rawScore;
    let dup = false;
    for (const p of picked)
      if (cos(p.vec, v) > 0.985) {
        dup = true;
        break;
      }
    if (!dup)
      picked.push({ doc, score: sim + 0.3 * l, vec: v, text: baseTexts[i] });
  }

  if (isPg()) {
    const addDocs = await keywordAugmentFromPg(question, LEX_CANDIDATES);
    if (addDocs.length) {
      const addTexts = addDocs.map((d) => d.pageContent);
      const addVecs = await embeddings.embedDocuments(addTexts);
      for (let i = 0; i < addDocs.length; i++) {
        const doc = addDocs[i];
        const vec = addVecs[i];
        const l = lexicalScore(question, addTexts[i]);
        let dup = false;
        for (const p of picked)
          if (
            doc.metadata?.hash === p.doc.metadata?.hash &&
            doc.metadata?.idx === p.doc.metadata?.idx
          ) {
            dup = true;
            break;
          }
        if (!dup) picked.push({ doc, score: 0.3 * l, vec, text: addTexts[i] });
      }
    }
  } else if ((store as any).docs && Array.isArray((store as any).docs)) {
    const allDocs: Document[] = (store as any).docs;
    const scored = allDocs
      .map((d, i) => ({ i, s: lexicalScore(question, d.pageContent) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, LEX_CANDIDATES);

    const addDocs = scored
      .map(({ i }) => allDocs[i])
      .filter(
        (d) =>
          !picked.some(
            (p) =>
              p.doc.metadata?.hash === d.metadata?.hash &&
              p.doc.metadata?.idx === d.metadata?.idx
          )
      );

    if (addDocs.length) {
      const addTexts = addDocs.map((d) => d.pageContent);
      const addVecs = await embeddings.embedDocuments(addTexts);
      for (let i = 0; i < addDocs.length; i++) {
        const doc = addDocs[i];
        const vec = addVecs[i];
        const l = lexicalScore(question, addTexts[i]);
        picked.push({ doc, score: 0.3 * l, vec, text: addTexts[i] });
      }
    }
  }

  const selected: {
    doc: Document;
    score: number;
    vec: number[];
    text: string;
  }[] = [];
  while (selected.length < k && picked.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < picked.length; i++) {
      const cand = picked[i];
      let sim = 0;
      for (const s of selected) sim = Math.max(sim, cos(cand.vec, s.vec));
      const val = mmr * cand.score - (1 - mmr) * sim;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    const [chosen] = picked.splice(bestIdx, 1);
    selected.push(chosen);
  }

  if (!selected.length && !isPg() && (store as any).docs?.length) {
    const allDocs: Document[] = (store as any).docs;
    const best = allDocs
      .map((d) => ({ d, s: lexicalScore(question, d.pageContent) }))
      .sort((a, b) => b.s - a.s)[0];
    if (best)
      return [
        {
          ...best.d,
          metadata: { ...(best.d.metadata || {}), score: best.s, rank: 0 },
        },
      ];
  }

  return selected.map((s, i) => ({
    ...s.doc,
    metadata: { ...s.doc.metadata, score: s.score, rank: i },
  }));
}

export async function upsertDocuments(docs: Document[], ids: string[]) {
  await init();
  const vectors = await embeddings.embedDocuments(
    docs.map((d) => d.pageContent)
  );
  const usePg = !!process.env.WELLNESSBOX_PRISMA_URL;
  if (usePg) {
    const sources = Array.from(
      new Set(
        docs
          .map((d: any) => d?.metadata?.source)
          .filter((s: any) => typeof s === "string" && s.length > 0)
      )
    );
    try {
      for (const src of sources) {
        await (store as any).delete({ filter: { source: src } });
      }
    } catch {}
    await (store as any).addVectors(vectors, docs); // ids 전달 X (PG는 uuid)
  } else {
    await (store as any).addVectors(vectors, docs, { ids });
  }
}

export async function resetInMemoryStore() {
  if (process.env.WELLNESSBOX_PRISMA_URL) return false;
  embeddings = g.__RAG_EMBEDDINGS || (g.__RAG_EMBEDDINGS = getEmbeddings());
  g.__RAG_STORE = new InMemoryStore(embeddings);
  if (g.__RAG_INDEX_CACHE) g.__RAG_INDEX_CACHE = {};
  return true;
}
