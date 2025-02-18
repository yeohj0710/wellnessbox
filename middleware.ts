import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const cookiePassword = req.cookies.get("admin")?.value;
  if (url.pathname === "/admin-login") {
    return NextResponse.next();
  }
  if (!cookiePassword || cookiePassword !== ADMIN_PASSWORD) {
    url.pathname = "/admin-login";
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/features/:path*", "/admin/:path*"],
};
