import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { splitMarkdown } from "@/lib/ai/markdownSplitter";
import { resetInMemoryStore, upsertDocuments } from "@/lib/ai/retriever";

const MAX_TEXT_LEN = Number(process.env.RAG_INGEST_MAX || 2_000_000);
const ALLOWED_DIRS = ["lib/ai", "data", "public"];

function resolveSafePath(relPath: string) {
  const root = process.cwd();
  const absolutePath = path.resolve(root, relPath);
  const isAllowed = ALLOWED_DIRS.some((dir) =>
    absolutePath.startsWith(path.resolve(root, dir) + path.sep)
  );
  if (!isAllowed) throw new Error("forbidden path");
  return absolutePath;
}

function parseDocId(input: unknown, fallbackName: string) {
  if (typeof input === "string" && input.trim()) return input.trim();
  return fallbackName;
}

export async function runRagIngestPostRoute(req: Request) {
  const body = await req.json();
  const replace = Boolean(body?.replace);
  const relPath =
    typeof body?.path === "string" ? body.path.replace(/^\/*/, "") : undefined;
  const hasInlineText = typeof body?.text === "string" && body.text.length > 0;

  let text = hasInlineText ? (body.text as string) : "";
  if (!hasInlineText && relPath) {
    const absolutePath = resolveSafePath(relPath);
    text = await fs.readFile(absolutePath, "utf8");
  }

  if (!text) {
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  const docId = parseDocId(body?.docId, relPath ? path.basename(relPath) : "doc");
  if (replace) await resetInMemoryStore();

  const docs = await splitMarkdown(text, docId);
  const ids = docs.map((doc) => `${docId}:${doc.metadata.hash}:${doc.metadata.idx}`);
  await upsertDocuments(docs, ids);

  return NextResponse.json({ docId, count: docs.length });
}
