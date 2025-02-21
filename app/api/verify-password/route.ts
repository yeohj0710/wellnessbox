import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getSession from "@/lib/session";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

export async function POST(req: Request) {
  const body = await req.json();
  const { password, loginType } = body;
  if (loginType === "admin") {
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  } else if (loginType === "test") {
    if (password !== TEST_PASSWORD) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const session = await getSession();
  if (loginType === "admin") {
    session.admin = { loggedIn: true };
  } else if (loginType === "test") {
    session.test = { loggedIn: true };
  }
  await session.save();
  const cookieStore = await cookies();
  cookieStore.set(loginType, password, {
    path: "/",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });
  return NextResponse.json({ success: true });
}
