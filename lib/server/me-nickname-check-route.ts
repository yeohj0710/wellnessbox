import "server-only";

import { NextResponse } from "next/server";
import { isNicknameAvailable, normalizeNickname } from "@/lib/nickname";

const NICKNAME_INPUT_REQUIRED_ERROR =
  "\uB2C9\uB124\uC784\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.";

function badRequest(message = "Invalid input") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

export async function runMeNicknameCheckPostRoute(
  req: Request,
  auth: { kakaoId: string }
) {
  const rawBody = await req.json().catch(() => null);
  if (!rawBody) return badRequest("Invalid JSON");

  const nickname = normalizeNickname((rawBody as { nickname?: unknown }).nickname, 60);
  if (!nickname) {
    return badRequest(NICKNAME_INPUT_REQUIRED_ERROR);
  }

  const available = await isNicknameAvailable(nickname, auth.kakaoId);
  return NextResponse.json(
    { ok: true, available, nickname },
    { headers: { "Cache-Control": "no-store" } }
  );
}
