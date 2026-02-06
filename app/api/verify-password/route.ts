import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getSession from "@/lib/session";
import { buildAdminCookieToken } from "@/lib/admin-token";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const TEST_LOGIN_ALLOWED =
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_TEST_LOGIN === "1";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof (body as any)?.password === "string"
    ? (body as any).password
    : "";
  const loginType = typeof (body as any)?.loginType === "string"
    ? (body as any).loginType
    : "";

  if (!password || (loginType !== "admin" && loginType !== "test")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (loginType === "admin") {
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  } else if (loginType === "test") {
    if (!TEST_LOGIN_ALLOWED) {
      return NextResponse.json({ message: "Disabled" }, { status: 403 });
    }
    if (!TEST_PASSWORD || password !== TEST_PASSWORD) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  const session = await getSession();
  if (loginType === "admin") {
    session.admin = { loggedIn: true };
  } else if (loginType === "test") {
    session.test = { loggedIn: true };
  }
  await session.save();

  const cookieStore = await cookies();
  if (loginType === "admin") {
    const token = await buildAdminCookieToken();
    if (!token) {
      return NextResponse.json(
        { message: "Server is not configured" },
        { status: 500 }
      );
    }
    cookieStore.set("admin", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });
  } else {
    cookieStore.delete("admin");
  }
  return NextResponse.json({ success: true });
}
