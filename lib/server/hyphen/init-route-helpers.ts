import { z } from "zod";
import { recordNhisOperationalAttempt } from "@/lib/server/hyphen/fetch-attempt";
import { resolveNhisIdentityHash } from "@/lib/server/hyphen/fetch-cache";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { nhisNoStoreJson } from "@/lib/server/hyphen/nhis-route-responses";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  logHyphenError,
} from "@/lib/server/hyphen/route-utils";
import {
  clearPendingEasyAuth,
  getPendingEasyAuth,
} from "@/lib/server/hyphen/session";

export const SUMMARY_CACHE_TARGET_SETS = [
  ["checkupOverview", "medication"],
  ["checkupOverview"],
] as const;

export const SUMMARY_CACHE_YEAR_LIMIT = 1;

const DEFAULT_PENDING_REUSE_MAX_AGE_SECONDS = 90;
const NON_REUSABLE_LINK_ERROR_CODES = new Set(["LOGIN-999", "C0012-001"]);

export const initSchema = z.object({
  loginMethod: z.literal("EASY").optional().default("EASY"),
  loginOrgCd: z.string().trim().min(1).max(20),
  resNm: z.string().trim().min(1).max(60),
  resNo: z
    .string()
    .trim()
    .regex(/^\d{8}$/),
  mobileNo: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/),
  forceInit: z.boolean().optional().default(false),
});

export function badInitRequest(message: string) {
  return nhisNoStoreJson({ ok: false, error: message }, 400);
}

export function isSameIdentityInput(
  input: { loginOrgCd: string; resNm: string; resNo: string; mobileNo: string },
  pending: {
    loginOrgCd: string;
    resNm: string;
    resNo: string;
    mobileNo: string;
  }
) {
  return (
    input.loginOrgCd === pending.loginOrgCd &&
    input.resNm === pending.resNm &&
    input.resNo === pending.resNo &&
    input.mobileNo === pending.mobileNo
  );
}

type InitIdentityInput = {
  loginOrgCd: string;
  resNm: string;
  resNo: string;
  mobileNo: string;
};

function resolvePendingReuseMaxAgeSeconds() {
  const raw = process.env.HYPHEN_NHIS_PENDING_REUSE_MAX_AGE_SECONDS;
  if (!raw) return DEFAULT_PENDING_REUSE_MAX_AGE_SECONDS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_PENDING_REUSE_MAX_AGE_SECONDS;
  return Math.max(30, Math.min(900, Math.floor(parsed)));
}

export function canReusePendingEasyAuth(
  pending:
    | {
        savedAt: string;
      }
    | null
) {
  if (!pending?.savedAt) return false;
  const savedAt = new Date(pending.savedAt).getTime();
  if (!Number.isFinite(savedAt)) return false;
  const ageMs = Date.now() - savedAt;
  if (ageMs < 0) return false;
  return ageMs <= resolvePendingReuseMaxAgeSeconds() * 1000;
}

export function canReuseStoredStep(lastErrorCode: string | null | undefined) {
  const normalized = (lastErrorCode || "").trim().toUpperCase();
  if (!normalized) return true;
  return !NON_REUSABLE_LINK_ERROR_CODES.has(normalized);
}

type InitExecutionContext = {
  existingLink: Awaited<ReturnType<typeof getNhisLink>>;
  pendingEasyAuth: Awaited<ReturnType<typeof getPendingEasyAuth>>;
  pendingReusable: boolean;
  identity: ReturnType<typeof resolveNhisIdentityHash>;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
};

export async function resolveInitExecutionContext(input: {
  appUserId: string;
  identityInput: InitIdentityInput;
}): Promise<InitExecutionContext> {
  const [existingLink, pendingEasyAuth] = await Promise.all([
    getNhisLink(input.appUserId),
    getPendingEasyAuth(),
  ]);
  const pendingReusable = canReusePendingEasyAuth(pendingEasyAuth);
  if (pendingEasyAuth && !pendingReusable) {
    await clearPendingEasyAuth().catch(() => undefined);
  }

  const identity = resolveNhisIdentityHash({
    appUserId: input.appUserId,
    ...input.identityInput,
  });
  const requestDefaults = buildNhisRequestDefaults();

  return {
    existingLink,
    pendingEasyAuth,
    pendingReusable,
    identity,
    requestDefaults,
  };
}

export function canReuseStoredInitStep(input: {
  forceInit: boolean;
  existingLink: Awaited<ReturnType<typeof getNhisLink>>;
  pendingEasyAuth: Awaited<ReturnType<typeof getPendingEasyAuth>>;
  pendingReusable: boolean;
  identityHash: string;
  identityInput: InitIdentityInput;
}) {
  if (input.forceInit) return false;
  if (input.existingLink?.linked === true) return false;
  if (!input.existingLink?.stepData) return false;
  if (!input.pendingEasyAuth || !input.pendingReusable) return false;
  if (!canReuseStoredStep(input.existingLink.lastErrorCode)) return false;
  if (input.existingLink.lastIdentityHash !== input.identityHash) return false;

  return isSameIdentityInput(input.identityInput, input.pendingEasyAuth);
}

export function recordInitOperationalAttemptSafe(input: {
  appUserId: string;
  statusCode: number;
  ok: boolean;
  reason: string;
  identityHash?: string | null;
}) {
  void recordNhisOperationalAttempt({
    appUserId: input.appUserId,
    action: "init",
    statusCode: input.statusCode,
    ok: input.ok,
    reason: input.reason,
    identityHash: input.identityHash ?? null,
  }).catch((error) => {
    logHyphenError("[hyphen][init] failed to record operational attempt", error);
  });
}
