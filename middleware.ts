import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PASSWORD = process.env.ACCESS_PASSWORD;

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const cookiePassword = req.cookies.get("access_password")?.value;
  if (url.pathname === "/admin-login") {
    return NextResponse.next();
  }
  if (!cookiePassword || cookiePassword !== PASSWORD) {
    url.pathname = "/admin-login";
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/features/:path*", "/admin/:path*"],
};
