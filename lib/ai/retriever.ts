import { VectorStore } from "@langchain/core/vectorstores";
import type { Document } from "@langchain/core/documents";
import { getEmbeddings } from "@/lib/ai/model";

const RAG_TOP_K = 8;
const RAG_MMR = 0.8;
const RAG_SCORE_MIN = -1;
const LEX_CANDIDATES = 25;
const FETCH_MULTIPLIER = 10;

class InMemoryStore extends VectorStore {
  texts: string[] = [];
  vectors: number[][] = [];
  docs: Document[] = [];
  embeddings: ReturnType<typeof getEmbeddings>;
  constructor(embeddings: ReturnType<typeof getEmbeddings>) {
    // @ts-ignore
    super(embeddings, {});
    this.embeddings = embeddings;
  }
  async addVectors(
    vectors: number[][],
    docs: Document[],
    options?: { ids?: string[] }
  ) {
    this.vectors.push(...vectors);
    this.docs.push(...docs);
    return options?.ids || [];
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

let store: any;
let embeddings: ReturnType<typeof getEmbeddings> | null = null;

async function init() {
  if (!embeddings) embeddings = getEmbeddings();
  if (!store) {
    if (process.env.RAG_DATABASE_URL) {
      const { PGVectorStore } = await import(
        "@langchain/community/vectorstores/pgvector"
      );
      store = await PGVectorStore.initialize(embeddings, {
        postgresConnectionOptions: {
          connectionString: process.env.RAG_DATABASE_URL as string,
        },
        tableName: "rag_chunks",
      });
    } else {
      store = new InMemoryStore(embeddings);
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

function phraseScore(q: string, text: string) {
  const t = norm(text);
  const hit3 = (
    t.match(
      /(?:^|[^\p{L}\p{N}])(1차\s*기능|2차\s*기능|3차\s*기능)(?=$|[^\p{L}\p{N}])/gu
    ) || []
  ).length;
  const nq = norm(q);
  const exact = nq.length >= 3 && t.includes(nq) ? 1 : 0;
  const ts = tokens(t);
  const qs = tokens(q);
  if (!qs.length) return 0;
  let hits = 0;
  for (const k of qs) if (t.includes(k)) hits++;
  const frac = hits / qs.length;
  return hit3 * 4 + exact * 2 + (frac >= 1 ? 2 : frac >= 0.5 ? 1 : 0);
}

function keywordBoost(q: string, text: string) {
  const nq = norm(q);
  const nt = norm(text);
  const keys = nq
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!keys.length) return 0;
  let hit = 0;
  for (const k of keys) if (nt.includes(k)) hit++;
  if (!hit) return 0;
  return hit === keys.length
    ? 0.15
    : hit >= Math.ceil(keys.length / 2)
    ? 0.05
    : 0;
}

export async function getRelevantDocuments(
  question: string,
  k = RAG_TOP_K,
  mmr = RAG_MMR,
  scoreThreshold = RAG_SCORE_MIN
) {
  await init();
  const fetchK = Math.min(40, k * FETCH_MULTIPLIER);
  const qvec = await embeddings!.embedQuery(question);
  const vecResults: Array<[Document, number]> =
    await store.similaritySearchVectorWithScore(qvec, fetchK);

  const baseTexts = vecResults.map(([d]) => d.pageContent);
  const baseVecs = baseTexts.length
    ? await embeddings!.embedDocuments(baseTexts)
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
    let dup = false;
    for (const p of picked)
      if (cos(p.vec, v) > 0.985) {
        dup = true;
        break;
      }
    if (!dup) picked.push({ doc, score, vec: v, text: baseTexts[i] });
    if (picked.length >= fetchK) break;
  }

  if ((store as any).docs && Array.isArray((store as any).docs)) {
    const allDocs: Document[] = (store as any).docs;
    const scored = allDocs
      .map((d, i) => ({ i, s: phraseScore(question, d.pageContent) }))
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
      const addVecs = await embeddings!.embedDocuments(addTexts);
      for (let i = 0; i < addDocs.length; i++) {
        const doc = addDocs[i];
        const vec = addVecs[i];
        const kw = keywordBoost(question, addTexts[i]);
        const base = 0.35;
        picked.push({ doc, score: base + kw, vec, text: addTexts[i] });
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
    let bestIdx = 0,
      bestVal = -Infinity;
    for (let i = 0; i < picked.length; i++) {
      const cand = picked[i];
      let sim = 0;
      for (const s of selected) sim = Math.max(sim, cos(cand.vec, s.vec));
      const kb = keywordBoost(question, cand.text);
      const val = mmr * (cand.score + kb) - (1 - mmr) * sim;
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
      .map((d) => ({ d, s: phraseScore(question, d.pageContent) }))
      .sort((a, b) => b.s - a.s)[0];
    if (best)
      return [
        {
          ...best.d,
          metadata: { ...(best.d.metadata || {}), score: 0.3, rank: 0 },
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
  const vectors = await embeddings!.embedDocuments(
    docs.map((d) => d.pageContent)
  );
  await (store as any).addVectors(vectors, docs, { ids });
}

export async function resetInMemoryStore() {
  if (process.env.RAG_DATABASE_URL) return false;
  embeddings = getEmbeddings();
  store = new InMemoryStore(embeddings);
  return true;
}
