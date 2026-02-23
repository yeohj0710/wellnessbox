import "server-only";

import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { clearNhisFetchCaches } from "@/lib/server/hyphen/fetch-cache";
import { clearNhisFetchMemoryCacheForUser } from "@/lib/server/hyphen/fetch-memory-cache";

const provider = HYPHEN_PROVIDER;

function whereByAppUser(appUserId: string) {
  return {
    appUserId_provider: {
      appUserId,
      provider,
    },
  };
}

export async function getNhisLink(appUserId: string) {
  return db.healthProviderLink.findUnique({
    where: whereByAppUser(appUserId),
  });
}

export async function upsertNhisLink(
  appUserId: string,
  patch: {
    linked?: boolean;
    loginMethod?: string | null;
    loginOrgCd?: string | null;
    stepMode?: string | null;
    stepData?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    cookieData?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    lastIdentityHash?: string | null;
    lastLinkedAt?: Date | null;
    lastFetchedAt?: Date | null;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
  }
) {
  const createData: Prisma.HealthProviderLinkUncheckedCreateInput = {
    appUserId,
    provider,
    ...(patch.linked !== undefined ? { linked: patch.linked } : {}),
    ...(patch.loginMethod !== undefined ? { loginMethod: patch.loginMethod } : {}),
    ...(patch.loginOrgCd !== undefined ? { loginOrgCd: patch.loginOrgCd } : {}),
    ...(patch.stepMode !== undefined ? { stepMode: patch.stepMode } : {}),
    ...(patch.stepData !== undefined ? { stepData: patch.stepData } : {}),
    ...(patch.cookieData !== undefined ? { cookieData: patch.cookieData } : {}),
    ...(patch.lastIdentityHash !== undefined ? { lastIdentityHash: patch.lastIdentityHash } : {}),
    ...(patch.lastLinkedAt !== undefined ? { lastLinkedAt: patch.lastLinkedAt } : {}),
    ...(patch.lastFetchedAt !== undefined ? { lastFetchedAt: patch.lastFetchedAt } : {}),
    ...(patch.lastErrorCode !== undefined ? { lastErrorCode: patch.lastErrorCode } : {}),
    ...(patch.lastErrorMessage !== undefined
      ? { lastErrorMessage: patch.lastErrorMessage }
      : {}),
  };

  const updateData: Prisma.HealthProviderLinkUncheckedUpdateInput = {
    ...(patch.linked !== undefined ? { linked: patch.linked } : {}),
    ...(patch.loginMethod !== undefined ? { loginMethod: patch.loginMethod } : {}),
    ...(patch.loginOrgCd !== undefined ? { loginOrgCd: patch.loginOrgCd } : {}),
    ...(patch.stepMode !== undefined ? { stepMode: patch.stepMode } : {}),
    ...(patch.stepData !== undefined ? { stepData: patch.stepData } : {}),
    ...(patch.cookieData !== undefined ? { cookieData: patch.cookieData } : {}),
    ...(patch.lastIdentityHash !== undefined ? { lastIdentityHash: patch.lastIdentityHash } : {}),
    ...(patch.lastLinkedAt !== undefined ? { lastLinkedAt: patch.lastLinkedAt } : {}),
    ...(patch.lastFetchedAt !== undefined ? { lastFetchedAt: patch.lastFetchedAt } : {}),
    ...(patch.lastErrorCode !== undefined ? { lastErrorCode: patch.lastErrorCode } : {}),
    ...(patch.lastErrorMessage !== undefined
      ? { lastErrorMessage: patch.lastErrorMessage }
      : {}),
  };

  return db.healthProviderLink.upsert({
    where: whereByAppUser(appUserId),
    create: createData,
    update: updateData,
  });
}

export async function saveNhisLinkError(
  appUserId: string,
  error: { code?: string; message?: string }
) {
  return upsertNhisLink(appUserId, {
    lastErrorCode: error.code ?? null,
    lastErrorMessage: error.message ?? null,
  });
}

export async function clearNhisLink(appUserId: string) {
  await Promise.all([
    upsertNhisLink(appUserId, {
      linked: false,
      stepData: Prisma.JsonNull,
      cookieData: Prisma.JsonNull,
      lastIdentityHash: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      loginMethod: null,
      loginOrgCd: null,
      stepMode: null,
    }),
    clearNhisFetchCaches(appUserId),
  ]);
  clearNhisFetchMemoryCacheForUser(appUserId);
}
