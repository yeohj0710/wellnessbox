import "server-only";

import { NextResponse } from "next/server";
import { reindexAll } from "@/lib/ai/indexer";
import { NO_CACHE_HEADERS } from "@/lib/server/no-cache";

type ReindexResult = {
  docId: string;
  chunks: number;
  updated: boolean;
};

function toSafeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toReindexResult(raw: unknown): ReindexResult {
  const value = (raw ?? {}) as {
    docId?: unknown;
    chunks?: unknown;
    updated?: unknown;
  };
  return {
    docId: toSafeString(value.docId),
    chunks: toSafeNumber(value.chunks),
    updated: value.updated === true,
  };
}

function buildReindexSummary(results: ReindexResult[]) {
  return results
    .map((item) => `${item.docId}:${item.chunks}${item.updated ? " updated" : " skipped"}`)
    .join(", ");
}

export async function runRagReindexPostRoute() {
  const startedAt = Date.now();
  const rawResults = await reindexAll("data");
  const sourceResults: unknown[] = Array.isArray(rawResults) ? rawResults : [];
  const results = sourceResults.map((item) => toReindexResult(item));

  const summary = buildReindexSummary(results);
  console.log(
    `[rag:reindexAll] ${results.length} files | ${summary} | ${Date.now() - startedAt}ms`
  );

  return NextResponse.json(
    { ok: true, forced: true, results },
    {
      headers: NO_CACHE_HEADERS,
    }
  );
}
