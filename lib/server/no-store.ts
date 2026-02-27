import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: NO_STORE_HEADERS,
  });
}
