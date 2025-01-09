import { NextResponse } from "next/server";

const PASSWORD = process.env.ACCESS_PASSWORD;

export async function POST(req: Request) {
  const body = await req.json();
  if (body.password === PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("access_password", body.password, {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  }
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
