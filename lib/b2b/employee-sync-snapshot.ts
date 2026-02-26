import "server-only";

import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import type { NhisFetchRoutePayload } from "@/lib/server/hyphen/fetch-contract";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { upsertNhisLink } from "@/lib/server/hyphen/link";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { extractSessionArtifactsFromPayload } from "@/lib/b2b/employee-sync-link-artifacts";

export function asJsonValue(
  value: unknown
): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function persistNhisLinkFromPayload(input: {
  appUserId: string;
  identityHash: string;
  payload: NhisFetchRoutePayload;
  markFetchedAt?: boolean;
}) {
  if (!input.payload.ok) return;
  const artifacts = extractSessionArtifactsFromPayload(input.payload);
  const patch: {
    lastIdentityHash: string;
    lastErrorCode: null;
    lastErrorMessage: null;
    lastFetchedAt?: Date;
    cookieData?: Prisma.InputJsonValue | Prisma.JsonNullValueInput;
    stepData?: Prisma.InputJsonValue | Prisma.JsonNullValueInput;
  } = {
    lastIdentityHash: input.identityHash,
    lastErrorCode: null,
    lastErrorMessage: null,
    ...(input.markFetchedAt ? { lastFetchedAt: new Date() } : {}),
  };
  if (artifacts.cookieData !== undefined) {
    patch.cookieData = toPrismaJson(artifacts.cookieData);
  }
  if (artifacts.stepData !== undefined) {
    patch.stepData = toPrismaJson(artifacts.stepData);
  }

  try {
    await upsertNhisLink(input.appUserId, patch);
  } catch (error) {
    console.error("[b2b][employee-sync] failed to update NHIS link session artifacts", {
      appUserId: input.appUserId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function buildSnapshotRawEnvelope(input: {
  source: "cache-valid" | "cache-history" | "fresh";
  payload: NhisFetchRoutePayload;
}) {
  return {
    meta: {
      ok: input.payload.ok,
      partial: input.payload.partial === true,
      failed: input.payload.failed ?? [],
      source: input.source,
      capturedAt: new Date().toISOString(),
    },
    raw: input.payload.data?.raw ?? null,
  };
}

async function createB2bHealthSnapshot(input: {
  employeeId: string;
  normalizedJson: unknown;
  rawJson: unknown;
  fetchedAt?: Date;
}) {
  const fetchedAt = input.fetchedAt ?? new Date();
  const periodKey = resolveCurrentPeriodKey(fetchedAt);
  const reportCycle = periodKeyToCycle(periodKey);
  return db.b2bHealthDataSnapshot.create({
    data: {
      employeeId: input.employeeId,
      provider: HYPHEN_PROVIDER,
      sourceMode: process.env.HYPHEN_MOCK_MODE === "1" ? "mock" : "hyphen",
      rawJson: asJsonValue(input.rawJson),
      normalizedJson: asJsonValue(input.normalizedJson),
      fetchedAt,
      periodKey,
      reportCycle: reportCycle ?? null,
    },
  });
}

export type SnapshotSource = "cache-valid" | "cache-history" | "fresh";

export async function persistSnapshotAndSyncState(input: {
  employeeId: string;
  appUserId: string;
  identityHash: string;
  source: SnapshotSource;
  payload: NhisFetchRoutePayload;
  persistLinkArtifacts: boolean;
}) {
  const normalizedJson = input.payload.data?.normalized ?? null;
  const rawJson = buildSnapshotRawEnvelope({
    source: input.source,
    payload: input.payload,
  });

  const snapshot = await createB2bHealthSnapshot({
    employeeId: input.employeeId,
    normalizedJson,
    rawJson,
  });

  await db.b2bEmployee.update({
    where: { id: input.employeeId },
    data: {
      lastSyncedAt: new Date(),
    },
  });

  if (input.persistLinkArtifacts) {
    await persistNhisLinkFromPayload({
      appUserId: input.appUserId,
      identityHash: input.identityHash,
      payload: input.payload,
      markFetchedAt: true,
    });
  }

  return {
    source: input.source,
    payload: input.payload,
    snapshot,
  };
}
