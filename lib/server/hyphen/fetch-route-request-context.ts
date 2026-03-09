import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";
import { buildNhisFetchRequestHash, resolveNhisIdentityHash } from "@/lib/server/hyphen/fetch-cache";
import type { NhisFetchTarget } from "@/lib/server/hyphen/fetch-contract";
import type { NhisRequestDefaults } from "@/lib/server/hyphen/fetch-route-types";

type NhisLinkLike = {
  loginMethod?: string | null;
  loginOrgCd?: string | null;
  cookieData?: unknown;
  lastIdentityHash?: string | null;
};

export function buildBasePayload(options: {
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  requestDefaults: NhisRequestDefaults;
}): HyphenNhisRequestPayload {
  return {
    loginMethod: (options.linkLoginMethod as "EASY" | "CERT" | null) ?? "EASY",
    loginOrgCd: options.linkLoginOrgCd ?? undefined,
    ...options.requestDefaults,
    cookieData: options.linkCookieData ?? undefined,
    showCookie: "Y" as const,
  };
}

export function buildDetailPayload(
  basePayload: HyphenNhisRequestPayload
): HyphenNhisRequestPayload {
  return { ...basePayload, detailYn: "Y" as const, imgYn: "N" as const };
}

export function resolveNhisFetchRequestContext(input: {
  appUserId: string;
  link: NhisLinkLike;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  requestDefaults: NhisRequestDefaults;
}) {
  const identity = resolveNhisIdentityHash({
    appUserId: input.appUserId,
    loginOrgCd: input.link.loginOrgCd,
    storedIdentityHash: input.link.lastIdentityHash,
  });
  const requestHashMeta = buildNhisFetchRequestHash({
    identityHash: identity.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
  });
  const shouldUpdateIdentityHash = input.link.lastIdentityHash !== identity.identityHash;

  const basePayload = buildBasePayload({
    linkLoginMethod: input.link.loginMethod,
    linkLoginOrgCd: input.link.loginOrgCd,
    linkCookieData: input.link.cookieData,
    requestDefaults: input.requestDefaults,
  });

  return {
    identityHash: identity.identityHash,
    requestHashMeta,
    shouldUpdateIdentityHash,
    basePayload,
    detailPayload: buildDetailPayload(basePayload),
  };
}
