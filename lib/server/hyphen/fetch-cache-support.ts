import "server-only";

import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

export type FetchLikePayload = {
  ok: boolean;
  partial?: boolean;
  failed?: unknown;
  data?: unknown;
  error?: string;
  [key: string]: unknown;
};

export type IdentitySource = "pii" | "stored" | "appUser";

export type ResolveIdentityInput = {
  appUserId: string;
  loginOrgCd?: string | null;
  resNm?: string | null;
  resNo?: string | null;
  mobileNo?: string | null;
  storedIdentityHash?: string | null;
};

export type BuildRequestHashInput = {
  identityHash: string;
  targets: string[];
  yearLimit?: number;
  fromDate?: string;
  toDate?: string;
  subjectType?: string;
};

const DEFAULT_HASH_SALT = "wellnessbox-hyphen-cache-v1";
const DEFAULT_SUMMARY_TTL_MINUTES = 60 * 24 * 30;
const DEFAULT_DETAIL_TTL_MINUTES = 60 * 24 * 180;
const DEFAULT_PARTIAL_TTL_MINUTES = 60 * 24 * 7;
const DEFAULT_FAILURE_TTL_MINUTES = 30;

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeDigits(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function cacheSalt() {
  const salt = normalizeText(process.env.HYPHEN_NHIS_CACHE_HASH_SALT);
  return salt || DEFAULT_HASH_SALT;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashWithSalt(value: string) {
  return sha256(`${cacheSalt()}|${value}`);
}

export function normalizeNhisFetchTargets(targets: string[]) {
  return [...new Set(targets.map((target) => target.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}

export function toNhisFetchCacheJsonValue(
  value: unknown
): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function resolveNhisFetchCacheTtlMinutes(
  targets: string[],
  payload: FetchLikePayload
) {
  if (!payload.ok) {
    return envNumber("HYPHEN_NHIS_FAILURE_CACHE_TTL_MINUTES", DEFAULT_FAILURE_TTL_MINUTES);
  }

  if (payload.partial) {
    return envNumber("HYPHEN_NHIS_PARTIAL_CACHE_TTL_MINUTES", DEFAULT_PARTIAL_TTL_MINUTES);
  }

  if (targets.includes("checkupYearly") || targets.includes("checkupList")) {
    return envNumber("HYPHEN_NHIS_DETAIL_CACHE_TTL_MINUTES", DEFAULT_DETAIL_TTL_MINUTES);
  }

  return envNumber("HYPHEN_NHIS_SUMMARY_CACHE_TTL_MINUTES", DEFAULT_SUMMARY_TTL_MINUTES);
}

export function resolveNhisIdentityHash(input: ResolveIdentityInput): {
  identityHash: string;
  source: IdentitySource;
} {
  const org = normalizeText(input.loginOrgCd).toLowerCase();
  const name = normalizeText(input.resNm).toLowerCase().replace(/\s+/g, "");
  const birth = normalizeDigits(input.resNo);
  const mobile = normalizeDigits(input.mobileNo);

  if (org && name && /^\d{8}$/.test(birth) && /^\d{10,11}$/.test(mobile)) {
    return {
      identityHash: hashWithSalt(`pii|${org}|${name}|${birth}|${mobile}`),
      source: "pii",
    };
  }

  const stored = normalizeText(input.storedIdentityHash);
  if (stored) {
    return {
      identityHash: stored,
      source: "stored",
    };
  }

  return {
    identityHash: hashWithSalt(`app-user|${input.appUserId}`),
    source: "appUser",
  };
}

export function buildNhisFetchRequestHash(input: BuildRequestHashInput) {
  const normalizedTargets = normalizeNhisFetchTargets(input.targets);
  const requestKey = [
    `targets=${normalizedTargets.join(",") || "none"}`,
    `yearLimit=${input.yearLimit ?? "-"}`,
    `from=${input.fromDate ?? "-"}`,
    `to=${input.toDate ?? "-"}`,
    `subjectType=${input.subjectType ?? "-"}`,
  ].join("|");

  const requestHash = hashWithSalt(`${input.identityHash}|${requestKey}`);
  return {
    requestHash,
    requestKey,
    normalizedTargets,
  };
}
