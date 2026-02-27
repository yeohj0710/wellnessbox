import "server-only";

import { NextResponse } from "next/server";
import { resolvePhoneStatusForUser } from "@/lib/server/me-phone-route";
import { NO_CACHE_HEADERS_NO_PRAGMA } from "@/lib/server/no-cache";
import { requireUserSession } from "@/lib/server/route-auth";

export async function runMePhoneStatusGetRoute() {
  const auth = await requireUserSession();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, loggedIn: false },
      {
        status: 401,
        headers: NO_CACHE_HEADERS_NO_PRAGMA,
      }
    );
  }

  const { kakaoId, phone: sessionPhone } = auth.data;
  const phoneStatus = await resolvePhoneStatusForUser({
    kakaoId,
    sessionPhone: sessionPhone ?? "",
  });

  return NextResponse.json(
    {
      ok: true,
      loggedIn: true,
      phone: phoneStatus.phone,
      linkedAt: phoneStatus.linkedAt,
    },
    { headers: NO_CACHE_HEADERS_NO_PRAGMA }
  );
}
