import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getSession from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clearAllSessions() {
  const session = await getSession();

  session.user = undefined;
  session.pharm = undefined;
  session.rider = undefined;
  session.admin = undefined;
  session.test = undefined;

  if (typeof (session as any)?.destroy === "function") {
    await session.destroy();
  } else if (typeof (session as any)?.save === "function") {
    await session.save();
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

export async function POST() {
  await clearAllSessions();
  return NextResponse.json({ ok: true }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function GET(req: Request) {
  await clearAllSessions();
  const res = NextResponse.redirect(new URL("/", req.url));
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
}
