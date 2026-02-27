import "server-only";

import type { Document } from "@langchain/core/documents";
import { getRelevantDocuments, RAG_MMR, RAG_SCORE_MIN, RAG_TOP_K } from "@/lib/ai/retriever";
import { ensureIndexed, reindexAll } from "@/lib/ai/indexer";
import { makeSnippet } from "@/lib/ai/snippet";
import { noStoreJson } from "@/lib/server/no-store";

type RagDocumentMetadata = {
  source?: unknown;
  section?: unknown;
  idx?: unknown;
  score?: unknown;
  rank?: unknown;
};

type RagDebugResult = {
  source: string;
  section: string;
  idx: number;
  score: number | null;
  rank: number | null;
  snippet: string;
};

function toSafeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDebugResult(doc: Document, query: string): RagDebugResult {
  const metadata = (doc.metadata ?? {}) as RagDocumentMetadata;
  return {
    source: toSafeString(metadata.source),
    section: toSafeString(metadata.section),
    idx: toSafeNumber(metadata.idx),
    score: toNullableNumber(metadata.score),
    rank: toNullableNumber(metadata.rank),
    snippet: makeSnippet(String(doc.pageContent || ""), query, 1000),
  };
}

export async function runRagDebugGetRoute(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const force = searchParams.get("force") === "1";

  if (force) {
    await reindexAll("data");
  } else {
    await ensureIndexed("data");
  }

  const docs = await getRelevantDocuments(q, RAG_TOP_K, RAG_MMR, RAG_SCORE_MIN);
  const out = docs.map((doc) => toDebugResult(doc, q));
  return noStoreJson({ q, count: out.length, out });
}
