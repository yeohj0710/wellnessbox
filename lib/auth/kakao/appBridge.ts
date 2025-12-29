import "server-only";
import { createHash, randomBytes } from "crypto";
import db from "@/lib/db";
import { buildAppDeepLink } from "./constants";

export type AppTransferPayload = {
  kakaoId: number;
  nickname?: string | null;
  profileImageUrl?: string | null;
  email?: string | null;
  kakaoEmail?: string | null;
  clientId?: string | null;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function sanitizePayload(payload: AppTransferPayload): AppTransferPayload {
  return {
    kakaoId: payload.kakaoId,
    nickname: payload.nickname ?? null,
    profileImageUrl: payload.profileImageUrl ?? null,
    email: payload.email ?? null,
    kakaoEmail: payload.kakaoEmail ?? null,
    clientId: payload.clientId ?? null,
  };
}

async function purgeExpiredTokens() {
  const cutoff = new Date();
  // Minimal cleanup to avoid unbounded growth; runs opportunistically.
  await db.appLoginTransferToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function createAppTransferToken(payload: AppTransferPayload) {
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);
  const sanitizedPayload = sanitizePayload(payload);

  await db.appLoginTransferToken.create({
    data: {
      tokenHash,
      payload: sanitizedPayload,
      expiresAt,
    },
  });

  void purgeExpiredTokens().catch(() => undefined);

  return {
    token,
    deepLink: buildAppDeepLink(token),
    expiresAt,
  };
}

export async function consumeAppTransferToken(token: string) {
  const tokenHash = hashToken(token);

  const updated = await db.$transaction(async (tx) => {
    const fetched = await tx.appLoginTransferToken.findUnique({
      where: { tokenHash },
      select: { payload: true, consumedAt: true, expiresAt: true },
    });

    if (!fetched || fetched.consumedAt || fetched.expiresAt.getTime() < Date.now()) {
      return null;
    }

    await tx.appLoginTransferToken.update({
      where: { tokenHash },
      data: { consumedAt: new Date() },
    });

    return sanitizePayload(fetched.payload as AppTransferPayload);
  });

  void purgeExpiredTokens().catch(() => undefined);

  return updated;
}
