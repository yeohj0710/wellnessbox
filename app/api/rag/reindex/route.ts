import { NextRequest, NextResponse } from "next/server";
import { ensureIndexed, reindexAll } from "@/lib/ai/indexer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const dir =
      typeof payload?.dir === "string" && payload.dir ? payload.dir : "data";
    const force = !!payload?.force;
    const results = force ? await reindexAll(dir) : await ensureIndexed(dir);
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    const msg = e?.message || String(e ?? "error");
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
