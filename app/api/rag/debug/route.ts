import { NextRequest, NextResponse } from "next/server";
import {
  getRelevantDocuments,
  RAG_TOP_K,
  RAG_MMR,
  RAG_SCORE_MIN,
} from "@/lib/ai/retriever";
import { ensureIndexed, reindexAll } from "@/lib/ai/indexer";
import { makeSnippet } from "@/lib/ai/snippet";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const force = searchParams.get("force") === "1";
  if (force) await reindexAll("data");
  else await ensureIndexed("data");
  const docs = await getRelevantDocuments(q, RAG_TOP_K, RAG_MMR, RAG_SCORE_MIN);
  const out = docs.map((d: any) => ({
    source: d.metadata?.source,
    section: d.metadata?.section ?? "",
    idx: d.metadata?.idx ?? 0,
    score: d.metadata?.score,
    rank: d.metadata?.rank,
    snippet: makeSnippet(String(d.pageContent || ""), q, 1000),
  }));
  return NextResponse.json({ q, count: out.length, out });
}
