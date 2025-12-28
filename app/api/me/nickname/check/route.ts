import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { isNicknameAvailable, normalizeNickname } from "@/lib/nickname";

export const runtime = "nodejs";

function unauthorized(message = "Unauthorized") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

function badRequest(message = "Invalid input") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const session = await getSession();
  const user = session.user;

  if (!user?.loggedIn || typeof user.kakaoId !== "number") {
    return unauthorized();
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const nickname = normalizeNickname((body as any)?.nickname, 60);

  if (!nickname) {
    return badRequest("닉네임을 입력해 주세요.");
  }

  const available = await isNicknameAvailable(nickname, String(user.kakaoId));

  return NextResponse.json(
    { ok: true, available, nickname },
    { headers: { "Cache-Control": "no-store" } }
  );
}
