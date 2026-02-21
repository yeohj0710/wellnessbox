import "server-only";

import getSession from "@/lib/session";

const PENDING_AUTH_TTL_MS = 60 * 60 * 1000;

export type HyphenPendingEasyAuth = {
  loginMethod: "EASY";
  loginOrgCd: string;
  resNm: string;
  resNo: string;
  mobileNo: string;
  mobileCo?: string;
  savedAt: string;
};

type HyphenSessionShape = {
  pendingEasyAuth?: HyphenPendingEasyAuth;
};

type SessionWithHyphen = Awaited<ReturnType<typeof getSession>> & {
  hyphen?: HyphenSessionShape;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePendingEasyAuth(raw: unknown): HyphenPendingEasyAuth | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.loginMethod !== "EASY") return null;
  if (!isNonEmptyString(value.loginOrgCd)) return null;
  if (!isNonEmptyString(value.resNm)) return null;
  if (!isNonEmptyString(value.resNo)) return null;
  if (!isNonEmptyString(value.mobileNo)) return null;
  if (!isNonEmptyString(value.savedAt)) return null;
  return {
    loginMethod: "EASY",
    loginOrgCd: value.loginOrgCd,
    resNm: value.resNm,
    resNo: value.resNo,
    mobileNo: value.mobileNo,
    mobileCo: isNonEmptyString(value.mobileCo) ? value.mobileCo : undefined,
    savedAt: value.savedAt,
  };
}

export async function savePendingEasyAuth(
  payload: Omit<HyphenPendingEasyAuth, "savedAt">
) {
  const session = (await getSession()) as SessionWithHyphen;
  session.hyphen = {
    ...(session.hyphen ?? {}),
    pendingEasyAuth: {
      ...payload,
      savedAt: new Date().toISOString(),
    },
  };
  await session.save();
}

export async function getPendingEasyAuth(): Promise<HyphenPendingEasyAuth | null> {
  const session = (await getSession()) as SessionWithHyphen;
  const parsed = parsePendingEasyAuth(session.hyphen?.pendingEasyAuth);
  if (!parsed) return null;

  const savedAt = new Date(parsed.savedAt);
  if (!Number.isFinite(savedAt.getTime())) return null;
  if (Date.now() - savedAt.getTime() > PENDING_AUTH_TTL_MS) {
    session.hyphen = { ...(session.hyphen ?? {}), pendingEasyAuth: undefined };
    await session.save();
    return null;
  }

  return parsed;
}

export async function clearPendingEasyAuth() {
  const session = (await getSession()) as SessionWithHyphen;
  if (!session.hyphen?.pendingEasyAuth) return;
  session.hyphen = { ...(session.hyphen ?? {}), pendingEasyAuth: undefined };
  await session.save();
}
