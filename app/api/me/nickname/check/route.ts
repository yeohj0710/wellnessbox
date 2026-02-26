import { NextResponse } from "next/server";
import { isNicknameAvailable, normalizeNickname } from "@/lib/nickname";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

function badRequest(message = "Invalid input") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  const { kakaoId } = auth.data;

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

  const available = await isNicknameAvailable(nickname, kakaoId);

  return NextResponse.json(
    { ok: true, available, nickname },
    { headers: { "Cache-Control": "no-store" } }
  );
}
