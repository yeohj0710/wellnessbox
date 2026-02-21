import { NextResponse } from "next/server";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { getPendingEasyAuth } from "@/lib/server/hyphen/session";
import { NO_STORE_HEADERS } from "@/lib/server/hyphen/route-utils";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;

  const [link, pendingEasyAuth] = await Promise.all([
    getNhisLink(auth.data.appUserId),
    getPendingEasyAuth(),
  ]);

  return NextResponse.json(
    {
      ok: true,
      status: {
        linked: !!link?.linked,
        provider: link?.provider ?? "HYPHEN_NHIS",
        loginMethod: link?.loginMethod ?? null,
        loginOrgCd: link?.loginOrgCd ?? null,
        lastLinkedAt: link?.lastLinkedAt?.toISOString() ?? null,
        lastFetchedAt: link?.lastFetchedAt?.toISOString() ?? null,
        lastError: link?.lastErrorCode || link?.lastErrorMessage
          ? {
              code: link.lastErrorCode,
              message: link.lastErrorMessage,
            }
          : null,
        hasStepData: !!link?.stepData,
        hasCookieData: !!link?.cookieData,
        pendingAuthReady: !!pendingEasyAuth,
      },
    },
    {
      headers: NO_STORE_HEADERS,
    }
  );
}
