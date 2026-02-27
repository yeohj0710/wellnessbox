import { Prisma } from "@prisma/client";
import {
  type NhisFetchRoutePayload,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildNhisFetchRequestHash,
  getLatestNhisFetchCacheByIdentity,
  getLatestNhisFetchCacheByIdentityGlobal,
  getValidNhisFetchCache,
  markNhisFetchCacheHit,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";

export function buildBasePayload(input: {
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
}): HyphenNhisRequestPayload {
  return {
    loginMethod: (input.linkLoginMethod as "EASY" | "CERT" | null) ?? "EASY",
    loginOrgCd: input.linkLoginOrgCd ?? undefined,
    ...input.requestDefaults,
    cookieData: input.linkCookieData ?? undefined,
    showCookie: "Y" as const,
  };
}

export function buildDetailPayload(
  basePayload: HyphenNhisRequestPayload
): HyphenNhisRequestPayload {
  return { ...basePayload, detailYn: "Y" as const, imgYn: "N" as const };
}

export function parseCachedPayload(
  payload: Prisma.JsonValue
): NhisFetchRoutePayload | null {
  try {
    return JSON.parse(JSON.stringify(payload)) as NhisFetchRoutePayload;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const MEDICATION_RECENT_LIMIT = 3;
const MEDICATION_NAMES_PER_VISIT_LIMIT = 8;
const MEDICATION_NAME_KEYS = [
  "medicineNm",
  "medicine",
  "drugName",
  "drugNm",
  "medNm",
  "medicineName",
  "prodName",
  "drug_MEDI_PRDC_NM",
  "MEDI_PRDC_NM",
  "drug_CMPN_NM",
  "detail_CMPN_NM",
  "CMPN_NM",
  "drug_CMPN_NM_2",
  "detail_CMPN_NM_2",
  "CMPN_NM_2",
  "mediPrdcNm",
  "drugMediPrdcNm",
  "cmpnNm",
  "drugCmpnNm",
  "detailCmpnNm",
  "cmpnNm2",
  "drugCmpnNm2",
  "detailCmpnNm2",
  "복용약",
  "약품명",
  "약품",
  "성분",
] as const;
const MEDICATION_HOSPITAL_KEYS = [
  "pharmNm",
  "hospitalNm",
  "hospitalName",
  "hospital",
  "clinicName",
  "hspNm",
  "detail_HSP_NM",
  "drug_HSP_NM",
  "HSP_NM",
  "clinicNm",
] as const;
const MEDICATION_VISIT_TYPE_KEYS = [
  "diagType",
  "detail_diagType",
  "drug_diagType",
  "visitType",
] as const;
const MEDICATION_DATE_KEYS = [
  "diagDate",
  "medDate",
  "date",
  "TRTM_YMD",
  "PRSC_YMD",
  "detail_TRTM_YMD",
  "detail_PRSC_YMD",
  "drug_TRTM_YMD",
  "drug_PRSC_YMD",
  "prescribedDate",
  "prescDate",
  "medicationDate",
  "diagSdate",
] as const;

function toText(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function parseSortableDateScore(value: unknown): number {
  const text = toText(value);
  if (!text) return 0;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    const score = Number(digits.slice(0, 8));
    return Number.isFinite(score) ? score : 0;
  }
  if (digits.length >= 6) {
    const score = Number(`${digits.slice(0, 6)}01`);
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

function resolveMedicationDateScore(row: Record<string, unknown>): number {
  for (const key of MEDICATION_DATE_KEYS) {
    const score = parseSortableDateScore(row[key]);
    if (score > 0) return score;
  }
  return 0;
}

function resolveMedicationDateText(row: Record<string, unknown>): string | null {
  for (const key of MEDICATION_DATE_KEYS) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function pickFirstText(
  row: Record<string, unknown>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function extractMedicationName(row: Record<string, unknown>): string | null {
  for (const key of MEDICATION_NAME_KEYS) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function rowHasMedicationName(row: unknown): boolean {
  const record = asRecord(row);
  if (!record) return false;
  return !!extractMedicationName(record);
}

function hasMedicationNameInRows(rows: unknown[]) {
  return rows.some((row) => rowHasMedicationName(row));
}

function compareMedicationRows(
  leftRecord: Record<string, unknown>,
  rightRecord: Record<string, unknown>
) {
  const leftHasName = rowHasMedicationName(leftRecord);
  const rightHasName = rowHasMedicationName(rightRecord);
  if (leftHasName !== rightHasName) {
    return rightHasName ? 1 : -1;
  }
  const dateDiff =
    resolveMedicationDateScore(rightRecord) - resolveMedicationDateScore(leftRecord);
  if (dateDiff !== 0) return dateDiff;
  return JSON.stringify(leftRecord).localeCompare(JSON.stringify(rightRecord), "ko");
}

function resolveMedicationVisitKey(
  row: Record<string, unknown>,
  fallbackIndex: number
) {
  const date = resolveMedicationDateText(row) ?? "";
  const hospital = pickFirstText(row, MEDICATION_HOSPITAL_KEYS) ?? "";
  const visitType = pickFirstText(row, MEDICATION_VISIT_TYPE_KEYS) ?? "";
  if (!date && !hospital && !visitType) return `unknown-${fallbackIndex}`;
  return `${date}|${hospital}|${visitType}`;
}

function limitRecentMedicationRows(rows: unknown[], maxRows: number) {
  if (rows.length === 0) return rows;
  const byVisit = new Map<
    string,
    {
      rows: Record<string, unknown>[];
      score: number;
      firstIndex: number;
    }
  >();

  rows.forEach((row, index) => {
    const record = asRecord(row);
    if (!record) return;
    const key = resolveMedicationVisitKey(record, index);
    const current = byVisit.get(key);
    const score = resolveMedicationDateScore(record);
    if (!current) {
      byVisit.set(key, { rows: [record], score, firstIndex: index });
      return;
    }
    current.rows.push(record);
    if (score > current.score) current.score = score;
  });

  const selectedVisits = [...byVisit.entries()]
    .sort((left, right) => {
      const scoreDiff = right[1].score - left[1].score;
      if (scoreDiff !== 0) return scoreDiff;
      return left[1].firstIndex - right[1].firstIndex;
    })
    .slice(0, maxRows);

  return selectedVisits.map(([, group]) => {
    const representative = [...group.rows].sort(compareMedicationRows)[0] ?? {};
    const names = [...new Set(group.rows.map(extractMedicationName).filter(Boolean))];
    if (names.length === 0) return representative;
    const previewNames = names.slice(0, MEDICATION_NAMES_PER_VISIT_LIMIT);
    const suffix =
      names.length > MEDICATION_NAMES_PER_VISIT_LIMIT
        ? ` 외 ${names.length - MEDICATION_NAMES_PER_VISIT_LIMIT}`
        : "";
    return {
      ...representative,
      medicineNm: `${previewNames.join(", ")}${suffix}`.trim(),
    };
  });
}

function normalizeMedicationContainer(value: unknown) {
  if (Array.isArray(value)) {
    return limitRecentMedicationRows(value, MEDICATION_RECENT_LIMIT);
  }
  const record = asRecord(value);
  if (!record) return value;
  const rows = asArray(record.list ?? record.rows ?? record.items ?? record.history);
  if (rows.length === 0) return value;
  const limitedRows = limitRecentMedicationRows(rows, MEDICATION_RECENT_LIMIT);
  const summary = asRecord(record.summary) ?? {};
  return {
    ...record,
    list: limitedRows,
    summary: {
      ...summary,
      totalCount: limitedRows.length,
    },
  };
}

function payloadHasMedicationNames(payload: NhisFetchRoutePayload) {
  if (!payload.ok) return false;
  const rows = resolveMedicationRows(payload.data?.normalized ?? null);
  if (rows == null) return false;
  return hasMedicationNameInRows(rows);
}

function resolveMedicationRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medication = normalized?.medication;
  if (Array.isArray(medication)) return medication;
  const medicationRecord = asRecord(medication);
  if (!medicationRecord) return null;
  if (Array.isArray(medicationRecord.list)) return medicationRecord.list;
  if (Array.isArray(medicationRecord.rows)) return medicationRecord.rows;
  if (Array.isArray(medicationRecord.items)) return medicationRecord.items;
  if (Array.isArray(medicationRecord.history)) return medicationRecord.history;
  if (
    "list" in medicationRecord ||
    "rows" in medicationRecord ||
    "items" in medicationRecord ||
    "history" in medicationRecord
  ) {
    return [];
  }
  return null;
}

function resolveCheckupRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const checkup = normalized?.checkup;
  if (Array.isArray(checkup)) return checkup;
  const checkupRecord = asRecord(checkup);
  if (!checkupRecord) return null;
  if (Array.isArray(checkupRecord.overview)) return checkupRecord.overview;
  if (Array.isArray(checkupRecord.list)) return checkupRecord.list;
  if ("overview" in checkupRecord || "list" in checkupRecord) return [];
  return null;
}

function resolveSummaryPatchNeeds(normalizedJson: unknown) {
  const missing = new Set<NhisFetchTarget>();
  const medicationRows = resolveMedicationRows(normalizedJson);
  const checkupRows = resolveCheckupRows(normalizedJson);
  const medicationNeedsNameBackfill =
    medicationRows != null &&
    (medicationRows.length === 0 || !hasMedicationNameInRows(medicationRows));

  if (medicationRows == null) {
    missing.add("medication");
  } else if (medicationNeedsNameBackfill) {
    missing.add("medication");
  }
  if (checkupRows == null) {
    missing.add("checkupOverview");
  }
  return {
    targets: [...missing],
    medicationNeedsNameBackfill,
  };
}

function mergeSummaryNormalizedPayload(input: {
  baseNormalized: unknown;
  patchNormalized: unknown;
  targets: NhisFetchTarget[];
  medicationNameBackfill: boolean;
}) {
  const base = asRecord(input.baseNormalized) ?? {};
  const patch = asRecord(input.patchNormalized) ?? {};
  const merged: Record<string, unknown> = { ...base };

  if (input.targets.includes("medication") && patch.medication !== undefined) {
    const patchMedicationRows = resolveMedicationRows({
      medication: patch.medication,
    });
    const patchHasMedicationNames =
      patchMedicationRows != null && hasMedicationNameInRows(patchMedicationRows);
    if (!input.medicationNameBackfill || patchHasMedicationNames) {
      merged.medication = normalizeMedicationContainer(patch.medication);
    }
  }

  if (input.targets.includes("checkupOverview")) {
    const baseCheckup = asRecord(base.checkup) ?? {};
    const patchCheckup = asRecord(patch.checkup) ?? {};
    const mergedCheckup: Record<string, unknown> = { ...baseCheckup };
    if (patchCheckup.overview !== undefined) {
      mergedCheckup.overview = patchCheckup.overview;
    } else if (patch.checkup !== undefined && Array.isArray(patch.checkup)) {
      mergedCheckup.overview = patch.checkup;
    }
    merged.checkup = mergedCheckup;
  }

  return merged;
}

export type SummaryPatchResult = {
  payload: NhisFetchRoutePayload;
  usedNetwork: boolean;
  patchedTargets: NhisFetchTarget[];
};

async function resolveSummaryPatchPayload(input: {
  appUserId: string;
  identityHash: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  allowNetwork: boolean;
  requireMedicationNames: boolean;
}) {
  if (input.targets.length === 0) return null;

  const hashMeta = buildNhisFetchRequestHash({
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
  });

  const validCache = await getValidNhisFetchCache(
    input.appUserId,
    hashMeta.requestHash
  );
  if (validCache) {
    await markNhisFetchCacheHit(validCache.id).catch(() => undefined);
    const parsed = parseCachedPayload(validCache.payload);
    if (
      parsed?.ok &&
      (!input.requireMedicationNames || payloadHasMedicationNames(parsed))
    ) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  const historyCache = await getLatestNhisFetchCacheByIdentity({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    subjectType: input.requestDefaults.subjectType,
  });
  if (historyCache) {
    const parsed = parseCachedPayload(historyCache.payload);
    if (
      parsed?.ok &&
      (!input.requireMedicationNames || payloadHasMedicationNames(parsed))
    ) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  const globalHistoryCache = await getLatestNhisFetchCacheByIdentityGlobal({
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    subjectType: input.requestDefaults.subjectType,
    excludeAppUserId: input.appUserId,
  });
  if (globalHistoryCache) {
    const parsed = parseCachedPayload(globalHistoryCache.payload);
    if (
      parsed?.ok &&
      (!input.requireMedicationNames || payloadHasMedicationNames(parsed))
    ) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  if (!input.allowNetwork) return null;
  if (!input.linkCookieData) return null;

  const basePayload = buildBasePayload({
    linkLoginMethod: input.linkLoginMethod,
    linkLoginOrgCd: input.linkLoginOrgCd,
    linkCookieData: input.linkCookieData,
    requestDefaults: input.requestDefaults,
  });
  const detailPayload = buildDetailPayload(basePayload);
  const executed = await executeNhisFetch({
    targets: input.targets,
    effectiveYearLimit: input.effectiveYearLimit,
    basePayload,
    detailPayload,
    requestDefaults: input.requestDefaults,
  });

  await saveNhisFetchCache({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    requestHash: hashMeta.requestHash,
    requestKey: hashMeta.requestKey,
    targets: hashMeta.normalizedTargets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
    statusCode: executed.payload.ok ? 200 : 502,
    payload: executed.payload,
  });

  if (!executed.payload.ok) return null;
  if (input.requireMedicationNames && !payloadHasMedicationNames(executed.payload)) {
    return null;
  }
  return { payload: executed.payload, usedNetwork: true };
}

export async function patchSummaryTargetsIfNeeded(input: {
  appUserId: string;
  identityHash: string;
  payload: NhisFetchRoutePayload;
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
}): Promise<SummaryPatchResult> {
  const baseNormalized = input.payload.data?.normalized ?? null;
  const summaryPatchNeeds = resolveSummaryPatchNeeds(baseNormalized);
  const missingTargets = summaryPatchNeeds.targets;
  if (missingTargets.length === 0) {
    return { payload: input.payload, usedNetwork: false, patchedTargets: [] };
  }

  const skipNetworkFetchForMedicationBackfillOnly =
    summaryPatchNeeds.medicationNeedsNameBackfill &&
    missingTargets.length === 1 &&
    missingTargets[0] === "medication";

  const patch = await resolveSummaryPatchPayload({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: missingTargets,
    effectiveYearLimit: input.effectiveYearLimit,
    requestDefaults: input.requestDefaults,
    linkLoginMethod: input.linkLoginMethod,
    linkLoginOrgCd: input.linkLoginOrgCd,
    linkCookieData: input.linkCookieData,
    allowNetwork: !skipNetworkFetchForMedicationBackfillOnly,
    requireMedicationNames: summaryPatchNeeds.medicationNeedsNameBackfill,
  });
  if (!patch) {
    return { payload: input.payload, usedNetwork: false, patchedTargets: [] };
  }

  const patchedNormalized = mergeSummaryNormalizedPayload({
    baseNormalized,
    patchNormalized: patch.payload.data?.normalized ?? null,
    targets: missingTargets,
    medicationNameBackfill: summaryPatchNeeds.medicationNeedsNameBackfill,
  });
  const mergedPayload: NhisFetchRoutePayload = {
    ...input.payload,
    partial: input.payload.partial === true || patch.payload.partial === true,
    failed: [
      ...asArray(input.payload.failed),
      ...asArray(patch.payload.failed),
    ] as NhisFetchRoutePayload["failed"],
    data: {
      ...asRecord(input.payload.data),
      normalized: patchedNormalized,
      raw: input.payload.data?.raw ?? patch.payload.data?.raw ?? null,
    },
  };

  return {
    payload: mergedPayload,
    usedNetwork: patch.usedNetwork,
    patchedTargets: missingTargets,
  };
}
