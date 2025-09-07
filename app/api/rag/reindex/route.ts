export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { reindexAll } from "@/lib/ai/indexer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const dir =
    typeof body.dir === "string" && body.dir.trim() ? body.dir : "data";
  const results = await reindexAll(dir);
  return NextResponse.json({ ok: true, results });
}
