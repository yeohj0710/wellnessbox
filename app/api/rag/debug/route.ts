import { NextRequest, NextResponse } from "next/server";
import { getRelevantDocuments } from "@/lib/ai/retriever";
import { ensureIndexed, reindexAll } from "@/lib/ai/indexer";
import { makeSnippet } from "@/lib/ai/snippet";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const force = searchParams.get("force") === "1";
  if (force) await reindexAll("data");
  else await ensureIndexed("data");
  const docs = await getRelevantDocuments(q, 6, 0.8, -1);
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
