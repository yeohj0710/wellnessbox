export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { splitMarkdown } from "@/lib/ai/markdownSplitter";
import { upsertDocuments, resetInMemoryStore } from "@/lib/ai/retriever";

const MAX_TEXT_LEN = Number(process.env.RAG_INGEST_MAX || 2_000_000);
const ALLOWED_DIRS = ["lib/ai", "data", "public"];

function resolveSafe(rel: string) {
  const root = process.cwd();
  const abs = path.resolve(root, rel);
  if (
    !ALLOWED_DIRS.some((d) => abs.startsWith(path.resolve(root, d) + path.sep))
  )
    throw new Error("forbidden path");
  return abs;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const replace = !!body.replace;
  const rel = typeof body.path === "string" ? body.path : undefined;
  const hasText = typeof body.text === "string" && body.text.length > 0;
  let text = hasText ? (body.text as string) : "";
  let file = rel ? rel.replace(/^\/*/, "") : undefined;
  if (!hasText && file) {
    const abs = resolveSafe(file);
    text = await fs.readFile(abs, "utf8");
  }
  if (!text)
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  if (text.length > MAX_TEXT_LEN)
    return NextResponse.json({ error: "too large" }, { status: 413 });
  const name =
    typeof body.docId === "string" && body.docId.trim()
      ? body.docId.trim()
      : file
      ? path.basename(file)
      : "doc";
  if (replace) await resetInMemoryStore();
  const docs = await splitMarkdown(text, name);
  const ids = docs.map((d) => `${name}:${d.metadata.hash}:${d.metadata.idx}`);
  await upsertDocuments(docs, ids);
  return NextResponse.json({ docId: name, count: docs.length });
}
