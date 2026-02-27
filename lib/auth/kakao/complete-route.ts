import "server-only";

import type { NextRequest } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import {
  consumeAppTransferToken,
  type AppTransferPayload,
} from "@/lib/auth/kakao/appBridge";
import { ensureClient, resolveOrCreateClientId } from "@/lib/server/client";
import { attachClientToAppUser } from "@/lib/server/client-link";

type AppUserProfile = {
  kakaoId: string;
  nickname: string | null;
  email: string | null;
  profileImageUrl: string | null;
  kakaoEmail: string | null;
  clientId: string | null;
};

type CompleteUserFields = {
  nextNickname: string | undefined;
  nextEmail: string | undefined;
  nextProfileImage: string | undefined;
  nextKakaoEmail: string | undefined;
};

type CompleteFlowSuccess = {
  ok: true;
  attachResult: Awaited<ReturnType<typeof attachClientToAppUser>>;
};

type CompleteFlowFailure = {
  ok: false;
};

export type KakaoCompleteTransferFlowResult =
  | CompleteFlowSuccess
  | CompleteFlowFailure;

function resolveCompleteUserFields(
  profile: AppUserProfile | null,
  payload: AppTransferPayload
): CompleteUserFields {
  return {
    nextNickname: profile?.nickname ?? payload.nickname ?? undefined,
    nextEmail: profile?.email ?? payload.email ?? undefined,
    nextProfileImage: profile?.profileImageUrl ?? payload.profileImageUrl ?? undefined,
    nextKakaoEmail: profile?.kakaoEmail ?? payload.kakaoEmail ?? undefined,
  };
}

async function fetchAppUserProfile(kakaoIdStr: string) {
  return db.appUser.findUnique({
    where: { kakaoId: kakaoIdStr },
    select: {
      kakaoId: true,
      nickname: true,
      email: true,
      profileImageUrl: true,
      kakaoEmail: true,
      clientId: true,
    },
  });
}

async function ensureTransferProfileRecord(input: {
  req: NextRequest;
  kakaoIdStr: string;
  profile: AppUserProfile | null;
  fields: CompleteUserFields;
}) {
  const appClientId = input.profile?.clientId ?? resolveOrCreateClientId(null);

  if (!input.profile) {
    await ensureClient(appClientId, {
      userAgent: input.req.headers.get("user-agent"),
    });
    await db.appUser.create({
      data: {
        kakaoId: input.kakaoIdStr,
        clientId: appClientId,
        nickname: input.fields.nextNickname ?? null,
        email: input.fields.nextEmail ?? null,
        profileImageUrl: input.fields.nextProfileImage ?? null,
        kakaoEmail: input.fields.nextKakaoEmail ?? null,
      },
    });
    return;
  }

  if (input.profile.clientId) return;

  await ensureClient(appClientId, {
    userAgent: input.req.headers.get("user-agent"),
  });
  await db.appUser.update({
    where: { kakaoId: input.kakaoIdStr },
    data: { clientId: appClientId },
  });
}

async function finalizeTransferSession(input: {
  payload: AppTransferPayload;
  fields: CompleteUserFields;
}) {
  const session = await getSession();
  session.user = {
    kakaoId: input.payload.kakaoId,
    loggedIn: true,
    nickname: input.fields.nextNickname,
    profileImageUrl: input.fields.nextProfileImage,
    email: input.fields.nextEmail,
    kakaoEmail: input.fields.nextKakaoEmail,
  };
  await session.save();
}

export async function runKakaoCompleteTransferFlow(input: {
  req: NextRequest;
  token: string;
}): Promise<KakaoCompleteTransferFlowResult> {
  const payload = await consumeAppTransferToken(input.token);
  if (!payload) {
    return { ok: false };
  }

  const kakaoIdStr = String(payload.kakaoId);
  const profile = await fetchAppUserProfile(kakaoIdStr);
  const fields = resolveCompleteUserFields(profile, payload);

  await ensureTransferProfileRecord({
    req: input.req,
    kakaoIdStr,
    profile,
    fields,
  });

  const attachResult = await attachClientToAppUser({
    req: input.req,
    kakaoId: kakaoIdStr,
    source: "kakao-login",
    allowMerge: true,
    userAgent: input.req.headers.get("user-agent"),
  });

  await finalizeTransferSession({
    payload,
    fields,
  });

  return {
    ok: true,
    attachResult,
  };
}
