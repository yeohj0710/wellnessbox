import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { NO_CACHE_HEADERS } from "@/lib/server/no-cache";

async function clearAllSessions() {
  const session = await getSession();

  session.user = undefined;
  session.pharm = undefined;
  session.rider = undefined;
  session.admin = undefined;
  session.test = undefined;

  const sessionOps = session as unknown as {
    destroy?: () => void | Promise<void>;
    save?: () => void | Promise<void>;
  };
  if (typeof sessionOps.destroy === "function") {
    await sessionOps.destroy();
  } else if (typeof sessionOps.save === "function") {
    await sessionOps.save();
  }

  const cookieStore = await cookies();
  const expireOptions = {
    path: "/",
    httpOnly: false,
    maxAge: 0,
  } as const;

  cookieStore.set("pharm", "", expireOptions);
  cookieStore.set("rider", "", expireOptions);
  cookieStore.set("admin", "", expireOptions);
  cookieStore.set("test", "", expireOptions);
}

export async function runLogoutPostRoute() {
  await clearAllSessions();
  return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
}

export async function runLogoutGetRoute(req: Request) {
  await clearAllSessions();
  const response = NextResponse.redirect(new URL("/", req.url));
  response.headers.set("Cache-Control", NO_CACHE_HEADERS["Cache-Control"]);
  response.headers.set("Pragma", NO_CACHE_HEADERS.Pragma);
  return response;
}
