import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CLIENT_COOKIE_NAME,
  CLIENT_ID_MAX_AGE,
  generateClientId,
  isLikelyBot,
} from "./lib/shared/client-id";
import { isValidAdminCookieToken } from "@/lib/admin-token";

const EN_LOCALE_PREFIX = "/en";
const EN_LOCALE_COOKIE = "wb-locale";
const EN_LOCALE_HEADER = "x-wb-locale";
const EN_CHECK_AI_PATH = "/en/check-ai";
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
  return (
    pathname === EN_LOCALE_PREFIX || pathname.startsWith(`${EN_LOCALE_PREFIX}/`)
  );
}

function isProtectedPath(pathname: string) {
  const protectedRoots = ["/features", "/admin"];
  return protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`)
  );
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

export async function middleware(req: NextRequest) {
  const originalUrl = req.nextUrl.clone();
  const pathname = originalUrl.pathname;
  const isEnglishCheckAi =
    pathname === EN_CHECK_AI_PATH ||
    pathname.startsWith(`${EN_CHECK_AI_PATH}/`);

  if (isEnglishCheckAi) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(EN_LOCALE_HEADER, "en");
    requestHeaders.set("x-wb-disable-translate", "1");

    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    res.cookies.set(EN_LOCALE_COOKIE, "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.headers.set(EN_LOCALE_HEADER, "en");

    return attachClientCookie(req, res);
  }

  const accept = req.headers.get("accept") || "";
  const fetchDest = req.headers.get("sec-fetch-dest") || "";
  const isDocumentNav =
    fetchDest === "document" || accept.includes("text/html");

  const isEnglishRoute = isEnglishPrefixed(pathname);
  const hasEnglishCookie = req.cookies.get(EN_LOCALE_COOKIE)?.value === "en";

  const referer = req.headers.get("referer");
  let refererPathname: string | null = null;
  if (referer) {
    try {
      const refererUrl = new URL(referer, originalUrl);
      if (refererUrl.origin === originalUrl.origin) {
        refererPathname = refererUrl.pathname;
      }
    } catch {
      if (referer.startsWith("/")) {
        refererPathname = referer;
      }
    }
  }

  const cameFromEnglish = refererPathname
    ? isEnglishPrefixed(refererPathname)
    : false;
  const isEnglishSession =
    isEnglishRoute || (hasEnglishCookie && cameFromEnglish);

  if (!isDocumentNav) {
    const res = NextResponse.next();
    if (!cameFromEnglish && hasEnglishCookie) {
      res.cookies.delete(EN_LOCALE_COOKIE);
    }
    return attachClientCookie(req, res);
  }

  if (!isEnglishRoute && cameFromEnglish && hasEnglishCookie) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname =
      redirectUrl.pathname === "/"
        ? EN_LOCALE_PREFIX
        : `${EN_LOCALE_PREFIX}${redirectUrl.pathname}`;

    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set(EN_LOCALE_COOKIE, "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.headers.set(EN_LOCALE_HEADER, "en");

    return attachClientCookie(req, res);
  }

  const normalizedPathname = stripEnglishPrefix(pathname);
  const adminToken = req.cookies.get("admin")?.value;

  const shouldProtect = isProtectedPath(normalizedPathname);
  const isAdminLogin = normalizedPathname === "/admin-login";

  if (shouldProtect && !isAdminLogin) {
    const isAdminAuthorized = await isValidAdminCookieToken(adminToken);
    if (!isAdminAuthorized) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = isEnglishSession
        ? `${EN_LOCALE_PREFIX}/admin-login`
        : "/admin-login";
      redirectUrl.searchParams.set("redirect", pathname);

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

    const res = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });

    res.cookies.set(EN_LOCALE_COOKIE, "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.headers.set(EN_LOCALE_HEADER, "en");

    return attachClientCookie(req, res);
  }

  const res = NextResponse.next();
  if (!cameFromEnglish && hasEnglishCookie) {
    res.cookies.delete(EN_LOCALE_COOKIE);
  }
  return attachClientCookie(req, res);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
