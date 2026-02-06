import { NextRequest, NextResponse } from "next/server";
import { reindexAll } from "@/lib/ai/indexer";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const t0 = Date.now();

  const results = await reindexAll("data");

  const summary = results
    .map((r: any) => `${r.docId}:${r.chunks}${r.updated ? "↑" : "="}`)
    .join(", ");
  console.log(
    `[rag:reindexAll] ${results.length} files | ${summary} | ${
      Date.now() - t0
    }ms`
  );

  return new Response(JSON.stringify({ ok: true, forced: true, results }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",

      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
