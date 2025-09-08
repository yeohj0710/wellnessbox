import { NextRequest, NextResponse } from "next/server";
import { getRelevantDocuments } from "@/lib/ai/retriever";
import { ensureIndexed, reindexAll } from "@/lib/ai/indexer";

export const runtime = "nodejs";

function makeSnippet(t: string, q: string, size = 420) {
  const rx = /(1차\s*기능|2차\s*기능|3차\s*기능)/;
  let idx = t.search(rx);
  if (idx < 0) {
    const qi = t.toLowerCase().indexOf(q.toLowerCase());
    idx = qi >= 0 ? qi : 0;
  }
  const s = Math.max(0, idx - Math.floor(size / 2));
  const e = Math.min(t.length, s + size);
  return (s > 0 ? "…" : "") + t.slice(s, e) + (e < t.length ? "…" : "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const force = searchParams.get("force") === "1";
  if (!process.env.RAG_DATABASE_URL) await reindexAll("data");
  else if (force) await reindexAll("data");
  else await ensureIndexed("data");
  const docs = await getRelevantDocuments(q, 5, 0.8, -1);
  const out = docs.map((d: any) => ({
    title: d.metadata?.title,
    source: d.metadata?.source,
    score: d.metadata?.score,
    rank: d.metadata?.rank,
    excerpt: makeSnippet(String(d.pageContent || ""), q, 420),
  }));
  return NextResponse.json({ q, count: out.length, out });
}
