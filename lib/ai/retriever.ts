import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { VectorStore } from "@langchain/core/vectorstores";
import type { Document } from "@langchain/core/documents";

class InMemoryStore extends VectorStore {
  texts: string[] = [];
  vectors: number[][] = [];
  docs: Document[] = [];
  constructor(public embeddings: OpenAIEmbeddings) {
    super(embeddings, {});
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

let store: InMemoryStore | PGVectorStore;
let embeddings: OpenAIEmbeddings;

async function init() {
  if (!embeddings)
    embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      openAIApiKey: process.env.OPENAI_KEY,
    });
  if (!store) {
    if (process.env.RAG_DATABASE_URL)
      store = await PGVectorStore.initialize(embeddings, {
        postgresConnectionOptions: {
          connectionString: process.env.RAG_DATABASE_URL,
        },
        tableName: "rag_chunks",
      });
    else store = new InMemoryStore(embeddings);
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

export async function getRelevantDocuments(
  question: string,
  k = 6,
  mmr = 0.5,
  scoreThreshold = 0.2
) {
  await init();
  const fetchK = Math.min(20, k * 4);
  const q = await embeddings.embedQuery(question);
  const results = await store.similaritySearchVectorWithScore(q, fetchK);
  const texts = results.map(([d]) => d.pageContent);
  const vecs = await embeddings.embedDocuments(texts);
  const picked: { doc: Document; score: number; vec: number[] }[] = [];
  for (let i = 0; i < results.length; i++) {
    const [doc, score] = results[i];
    if (score < scoreThreshold) continue;
    const v = vecs[i];
    let dup = false;
    for (const p of picked)
      if (cos(p.vec, v) > 0.95) {
        dup = true;
        break;
      }
    if (!dup) picked.push({ doc, score, vec: v });
    if (picked.length >= fetchK) break;
  }
  const selected: { doc: Document; score: number; vec: number[] }[] = [];
  while (selected.length < k && picked.length) {
    let bestIdx = 0,
      bestVal = -Infinity;
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
  await (store as any).addVectors(vectors, docs, { ids });
}

export async function resetInMemoryStore() {
  if (process.env.RAG_DATABASE_URL) return false;
  embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_KEY,
  });
  store = new InMemoryStore(embeddings);
  return true;
}
