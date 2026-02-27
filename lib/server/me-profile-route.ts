import db from "@/lib/db";
import getSession from "@/lib/session";
import { isNicknameAvailable, normalizeNickname } from "@/lib/nickname";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";
import type { NextRequest } from "next/server";

type ParsedProfileBody =
  | {
      ok: true;
      data: {
        nickname: string;
        email: string;
        profileImageUrl: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseMeProfileBody(rawBody: unknown): ParsedProfileBody {
  const body = asRecord(rawBody);
  if (!body) return { ok: false, error: "Invalid JSON" };

  return {
    ok: true,
    data: {
      nickname: normalizeNickname(body.nickname, 60),
      email: normalizeNickname(body.email, 120),
      profileImageUrl: normalizeNickname(body.profileImageUrl, 500),
    },
  };
}

export async function saveMeProfile(input: {
  kakaoId: string;
  nickname: string;
  email: string;
  profileImageUrl: string;
}) {
  const [profile, session] = await Promise.all([
    db.appUser.findUnique({
      where: { kakaoId: input.kakaoId },
      select: {
        kakaoEmail: true,
        clientId: true,
      },
    }),
    getSession(),
  ]);

  const sessionUser = session.user;
  const nextKakaoEmail =
    profile?.kakaoEmail ?? sessionUser?.kakaoEmail ?? sessionUser?.email ?? undefined;
  const clientIdForUpsert = profile?.clientId ?? undefined;

  await db.appUser.upsert({
    where: { kakaoId: input.kakaoId },
    create: {
      kakaoId: input.kakaoId,
      clientId: clientIdForUpsert,
      nickname: input.nickname || null,
      email: input.email || null,
      profileImageUrl: input.profileImageUrl || null,
      kakaoEmail: nextKakaoEmail || null,
    },
    update: {
      clientId: clientIdForUpsert,
      nickname: input.nickname || null,
      email: input.email || null,
      profileImageUrl: input.profileImageUrl || null,
      kakaoEmail: nextKakaoEmail || null,
    },
  });

  if (session.user?.loggedIn) {
    session.user = {
      ...session.user,
      nickname: input.nickname || undefined,
      email: input.email || undefined,
      profileImageUrl: input.profileImageUrl || undefined,
      kakaoEmail: nextKakaoEmail,
    };
    await session.save();
  }

  return {
    nickname: input.nickname,
    email: input.email,
    profileImageUrl: input.profileImageUrl,
    kakaoEmail: nextKakaoEmail,
  };
}

const NICKNAME_ALREADY_USED_ERROR =
  "\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC778 \uB2C9\uB124\uC784\uC774\uC5D0\uC694. \uB2E4\uB978 \uC774\uB984\uC744 \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const PROFILE_SAVE_FAILED_ERROR =
  "\uD504\uB85C\uD544 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export async function runMeProfilePostRoute(
  req: NextRequest,
  auth: { kakaoId: string }
) {
  const rawBody = await req.json().catch(() => null);
  if (!rawBody) {
    return noStoreJson({ ok: false, error: "Invalid JSON" }, 400);
  }

  const parsed = parseMeProfileBody(rawBody);
  if (!parsed.ok) {
    return noStoreJson({ ok: false, error: parsed.error }, 400);
  }

  if (parsed.data.nickname) {
    const available = await isNicknameAvailable(
      parsed.data.nickname,
      auth.kakaoId
    );
    if (!available) {
      return noStoreJson({ ok: false, error: NICKNAME_ALREADY_USED_ERROR }, 400);
    }
  }

  try {
    const saved = await saveMeProfile({
      kakaoId: auth.kakaoId,
      nickname: parsed.data.nickname,
      email: parsed.data.email,
      profileImageUrl: parsed.data.profileImageUrl,
    });

    return noStoreJson({
      ok: true,
      nickname: saved.nickname,
      email: saved.email,
      profileImageUrl: saved.profileImageUrl,
      kakaoEmail: saved.kakaoEmail,
    });
  } catch (error) {
    const dbError = resolveDbRouteError(error, PROFILE_SAVE_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
