import "server-only";

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { NO_STORE_HEADERS } from "@/lib/server/no-store";

async function clearUserOnlySession() {
  const session = await getSession();
  session.user = undefined;

  const sessionOps = session as unknown as {
    save?: () => void | Promise<void>;
  };
  if (typeof sessionOps.save === "function") {
    await sessionOps.save();
  }
}

export async function runLogoutUserPostRoute() {
  await clearUserOnlySession();
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}

export async function runLogoutUserGetRoute(req: Request) {
  await clearUserOnlySession();
  const response = NextResponse.redirect(new URL("/", req.url));
  response.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
  return response;
}
