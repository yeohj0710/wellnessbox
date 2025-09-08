import { NextRequest, NextResponse } from "next/server";
import { getRelevantDocuments } from "@/lib/ai/retriever";
import { ensureIndexed, reindexAll } from "@/lib/ai/indexer";

export const runtime = "nodejs";

function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function makeSnippet(t: string, q: string, size = 1000) {
  const lt = t.toLowerCase();
  const qs = tokenize(q);
  let idx = 0;
  for (const tk of qs) {
    const i = lt.indexOf(tk);
    if (i >= 0 && (idx === 0 || i < idx)) idx = i;
  }
  const half = Math.floor(size / 2);
  let s = Math.max(0, idx - half);
  let e = Math.min(t.length, s + size);
  const pre = t.lastIndexOf(".", s - 1);
  if (pre >= 0 && pre < s) s = pre + 1;
  const post = t.indexOf(".", e);
  if (post >= 0) e = post + 1;
  return (s > 0 ? "…" : "") + t.slice(s, e).trim() + (e < t.length ? "…" : "");
}

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
