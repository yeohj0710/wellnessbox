import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/server/hyphen/route-utils";

type ObjectLike = Record<string, unknown>;

export function nhisNoStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export function nhisNoStoreRetryJson(
  payload: ObjectLike,
  status: number,
  retryAfterSec: number
) {
  return NextResponse.json(payload, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      "Retry-After": String(retryAfterSec),
    },
  });
}

export function nhisInitRequiredJson(
  error: string,
  extra: ObjectLike = {}
) {
  return nhisNoStoreJson(
    {
      ok: false,
      code: "NHIS_INIT_REQUIRED",
      reason: "nhis_init_required",
      nextAction: "init",
      error,
      ...extra,
    },
    409
  );
}

export function nhisAuthExpiredJson(
  error: string,
  extra: ObjectLike = {}
) {
  return nhisNoStoreJson(
    {
      ok: false,
      code: "NHIS_AUTH_EXPIRED",
      reason: "nhis_auth_expired",
      nextAction: "init",
      error,
      ...extra,
    },
    409
  );
}
