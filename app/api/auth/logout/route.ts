import { NextResponse } from "next/server";
import getSession from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clearUserOnly() {
  const session = await getSession();

  session.user = undefined;

  if (typeof (session as any)?.save === "function") {
    await session.save();
  }
}

export async function POST() {
  await clearUserOnly();
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: Request) {
  await clearUserOnly();
  const res = NextResponse.redirect(new URL("/", req.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}
