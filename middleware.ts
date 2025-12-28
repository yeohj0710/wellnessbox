import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CLIENT_COOKIE_NAME,
  CLIENT_ID_MAX_AGE,
  generateClientId,
  isLikelyBot,
} from "./lib/shared/client-id";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const EN_LOCALE_PREFIX = "/en";
const EN_LOCALE_COOKIE = "wb-locale";
const EN_LOCALE_HEADER = "x-wb-locale";
const CLIENT_COOKIE_PATH = "/";

function stripEnglishPrefix(pathname: string) {
  if (pathname === EN_LOCALE_PREFIX) {
    return "/";
  }
  if (pathname.startsWith(`${EN_LOCALE_PREFIX}/`)) {
    const stripped = pathname.slice(EN_LOCALE_PREFIX.length);
    return stripped.length === 0 ? "/" : stripped;
  }
  return pathname;
}

function isEnglishPrefixed(pathname: string) {
  return pathname === EN_LOCALE_PREFIX || pathname.startsWith(`${EN_LOCALE_PREFIX}/`);
}

function isProtectedPath(pathname: string) {
  const protectedRoots = ["/features", "/admin"];
  return protectedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

function shouldSetClientCookie(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  const ua = req.headers.get("user-agent");
  const purpose = req.headers.get("purpose")?.toLowerCase();
  const fetchDest = req.headers.get("sec-fetch-dest");
  if (isLikelyBot(ua)) return false;
  if (purpose === "prefetch") return false;
  if (fetchDest) return fetchDest === "document";
  return accept.includes("text/html");
}

function attachClientCookie(req: NextRequest, res: NextResponse) {
  if (!shouldSetClientCookie(req)) return res;
  const existing = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
  if (existing) return res;
  const id = generateClientId();
  const secure = req.nextUrl.protocol === "https:";
  res.cookies.set(CLIENT_COOKIE_NAME, id, {
    path: CLIENT_COOKIE_PATH,
    maxAge: CLIENT_ID_MAX_AGE,
    sameSite: "lax",
    secure,
  });
  return res;
}

export function middleware(req: NextRequest) {
  const originalUrl = req.nextUrl.clone();
  const isEnglishRoute = isEnglishPrefixed(originalUrl.pathname);
  const hasEnglishCookie = req.cookies.get(EN_LOCALE_COOKIE)?.value === "en";
  const referer = req.headers.get("referer");
  let refererPathname: string | null = null;
  if (referer) {
    try {
      const refererUrl = new URL(referer, originalUrl);
      if (refererUrl.origin === originalUrl.origin) {
        refererPathname = refererUrl.pathname;
      }
    } catch (error) {
      if (referer.startsWith("/")) {
        refererPathname = referer;
      }
    }
  }
  const cameFromEnglish = refererPathname
    ? isEnglishPrefixed(refererPathname)
    : false;
  const isEnglishSession = isEnglishRoute || (hasEnglishCookie && cameFromEnglish);

  let response: NextResponse | null = null;

  if (!isEnglishRoute && cameFromEnglish && hasEnglishCookie) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname =
      redirectUrl.pathname === "/"
        ? EN_LOCALE_PREFIX
        : `${EN_LOCALE_PREFIX}${redirectUrl.pathname}`;
    response = NextResponse.redirect(redirectUrl);
    response.cookies.set(EN_LOCALE_COOKIE, "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.headers.set(EN_LOCALE_HEADER, "en");
    return attachClientCookie(req, response);
  }

  const normalizedPathname = stripEnglishPrefix(originalUrl.pathname);
  const cookiePassword = req.cookies.get("admin")?.value;

  const shouldProtect = isProtectedPath(normalizedPathname);
  const isAdminLogin = normalizedPathname === "/admin-login";

  if (shouldProtect && !isAdminLogin) {
    if (!cookiePassword || cookiePassword !== ADMIN_PASSWORD) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = isEnglishSession
        ? `${EN_LOCALE_PREFIX}/admin-login`
        : "/admin-login";
      redirectUrl.searchParams.set("redirect", req.nextUrl.pathname);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      if (isEnglishSession) {
        redirectResponse.cookies.set(EN_LOCALE_COOKIE, "en", {
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
      }
      return attachClientCookie(req, redirectResponse);
    }
  }

  if (isEnglishRoute) {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = normalizedPathname;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(EN_LOCALE_HEADER, "en");
    response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
    response.cookies.set(EN_LOCALE_COOKIE, "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.headers.set(EN_LOCALE_HEADER, "en");
    return attachClientCookie(req, response);
  }

  response = NextResponse.next();
  if (!cameFromEnglish && hasEnglishCookie) {
    response.cookies.delete(EN_LOCALE_COOKIE);
  }
  return attachClientCookie(req, response);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
