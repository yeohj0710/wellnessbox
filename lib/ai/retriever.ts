import { VectorStore } from "@langchain/core/vectorstores";
import type { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { getEmbeddings } from "@/lib/ai/model";

const RAG_TOP_K = 6;
const RAG_MMR = 0.8;
const RAG_SCORE_MIN = -1;
const VEC_CANDIDATES = 64;
const LEX_CANDIDATES = 32;

class InMemoryStore extends VectorStore {
  texts: string[] = [];
  vectors: number[][] = [];
  docs: Document[] = [];
  idIndex: Map<string, number> = new Map();
  embeddings: EmbeddingsInterface;
  constructor(embeddings: EmbeddingsInterface) {
    // @ts-ignore
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
let embeddings: EmbeddingsInterface | null = null;
let store: any = null;

async function init() {
  if (!embeddings)
    embeddings =
      g.__RAG_EMBEDDINGS ||
      (g.__RAG_EMBEDDINGS = getEmbeddings() as unknown as EmbeddingsInterface);
  if (!store) {
    if (process.env.RAG_DATABASE_URL) {
      if (!g.__RAG_STORE) {
        const { PGVectorStore } = await import(
          "@langchain/community/vectorstores/pgvector"
        );
        const e = embeddings as EmbeddingsInterface;
        g.__RAG_STORE = await PGVectorStore.initialize(e, {
          postgresConnectionOptions: {
            connectionString: process.env.RAG_DATABASE_URL as string,
          },
          tableName: "rag_chunks",
        });
      }
      store = g.__RAG_STORE;
    } else {
      if (!g.__RAG_STORE)
        g.__RAG_STORE = new InMemoryStore(embeddings as EmbeddingsInterface);
      store = g.__RAG_STORE;
    }
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

export async function getRelevantDocuments(
  question: string,
  k = RAG_TOP_K,
  mmr = RAG_MMR,
  scoreThreshold = RAG_SCORE_MIN
) {
  await init();
  const qvec = await (embeddings as EmbeddingsInterface).embedQuery(question);
  const vecResults: Array<[Document, number]> =
    await store.similaritySearchVectorWithScore(qvec, VEC_CANDIDATES);

  const baseTexts = vecResults.map(([d]) => d.pageContent);
  const baseVecs = baseTexts.length
    ? await (embeddings as EmbeddingsInterface).embedDocuments(baseTexts)
    : [];

  const picked: {
    doc: Document;
    score: number;
    vec: number[];
    text: string;
  }[] = [];
  for (let i = 0; i < vecResults.length; i++) {
    const [doc, score] = vecResults[i];
    if (score < scoreThreshold) continue;
    const v = baseVecs[i];
    const l = lexicalScore(question, baseTexts[i]);
    let dup = false;
    for (const p of picked)
      if (cos(p.vec, v) > 0.985) {
        dup = true;
        break;
      }
    if (!dup)
      picked.push({ doc, score: score + l, vec: v, text: baseTexts[i] });
  }

  if ((store as any).docs && Array.isArray((store as any).docs)) {
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
      const addVecs = await (embeddings as EmbeddingsInterface).embedDocuments(
        addTexts
      );
      for (let i = 0; i < addDocs.length; i++) {
        const doc = addDocs[i];
        const vec = addVecs[i];
        const l = lexicalScore(question, addTexts[i]);
        picked.push({ doc, score: l, vec, text: addTexts[i] });
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

  if (!selected.length && (store as any).docs?.length) {
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
  const vectors = await (embeddings as EmbeddingsInterface).embedDocuments(
    docs.map((d) => d.pageContent)
  );
  await (store as any).addVectors(vectors, docs, { ids });
}

export async function resetInMemoryStore() {
  if (process.env.RAG_DATABASE_URL) return false;
  embeddings =
    g.__RAG_EMBEDDINGS ||
    (g.__RAG_EMBEDDINGS = getEmbeddings() as unknown as EmbeddingsInterface);
  g.__RAG_STORE = new InMemoryStore(embeddings as EmbeddingsInterface);
  if (g.__RAG_INDEX_CACHE) g.__RAG_INDEX_CACHE = {};
  return true;
}
