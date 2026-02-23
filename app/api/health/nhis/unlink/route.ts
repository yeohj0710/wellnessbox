import { NextResponse } from "next/server";
import { clearNhisLink } from "@/lib/server/hyphen/link";
import { NO_STORE_HEADERS } from "@/lib/server/hyphen/route-utils";
import { clearPendingEasyAuth } from "@/lib/server/hyphen/session";
import { requireNhisSession } from "@/lib/server/route-auth";
export const runtime = "nodejs";
export async function POST() {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  await Promise.all([
    clearNhisLink(auth.data.appUserId),
    clearPendingEasyAuth(),
  ]);
  return NextResponse.json(
    { ok: true, linked: false },
    { headers: NO_STORE_HEADERS }
  );
}
