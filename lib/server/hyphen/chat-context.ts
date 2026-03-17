import "server-only";

import db from "@/lib/db";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { toFetchRoutePayload } from "@/lib/server/hyphen/fetch-route-cache-support";

type HealthLinkChatContext = {
  fetchedAt: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  headline: string;
  summary: string;
  highlights: string[];
  nextSteps: string[];
  metricInsights: Array<{
    metric: string;
    value: string;
    interpretation: string;
    tip: string;
  }>;
  topMedicines: Array<{ label: string; count: number }>;
  topConditions: Array<{ label: string; count: number }>;
  recentMedications: Array<{
    date: string;
    medicine: string;
    effect: string | null;
  }>;
};

type NhisPrimitive = string | number | boolean | null;
type NhisDataRow = Record<string, NhisPrimitive>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter(Boolean);
}

function pickFirstText(row: NhisDataRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function parseSortableDateScore(value: string | null) {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return 0;
  const score = Number(digits.slice(0, 8));
  return Number.isFinite(score) ? score : 0;
}

function toTopCountItems(source: Map<string, number>, maxItems: number) {
  return [...source.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko")
    )
    .slice(0, maxItems)
    .map(([label, count]) => ({ label, count }));
}

function summarizeMedicationRows(rows: NhisDataRow[]) {
  const medicineCount = new Map<string, number>();
  const conditionCount = new Map<string, number>();
  const recentItems = new Map<
    string,
    { date: string; medicine: string; effect: string | null }
  >();

  for (const row of rows) {
    const medicine = pickFirstText(row, [
      "medicineNm",
      "drug_MEDI_PRDC_NM",
      "MEDI_PRDC_NM",
    ]);
    const condition = pickFirstText(row, [
      "diagType",
      "drug_MOHW_CLSF",
      "detail_MOHW_CLSF",
      "medicineEffect",
    ]);
    const date = pickFirstText(row, ["diagDate", "medDate"]);
    const effect = pickFirstText(row, [
      "medicineEffect",
      "drug_EFFT_EFT_CNT",
      "EFFT_EFT_CNT",
    ]);

    if (medicine) {
      medicineCount.set(medicine, (medicineCount.get(medicine) ?? 0) + 1);
    }
    if (condition) {
      conditionCount.set(condition, (conditionCount.get(condition) ?? 0) + 1);
    }

    if (!medicine || !date) continue;
    const signature = `${date}|${medicine}`;
    if (!recentItems.has(signature)) {
      recentItems.set(signature, {
        date,
        medicine,
        effect: effect ?? null,
      });
    }
  }

  return {
    topMedicines: toTopCountItems(medicineCount, 5),
    topConditions: toTopCountItems(conditionCount, 5),
    recentMedications: [...recentItems.values()]
      .sort(
        (left, right) =>
          parseSortableDateScore(right.date) - parseSortableDateScore(left.date) ||
          left.medicine.localeCompare(right.medicine, "ko")
      )
      .slice(0, 3),
  };
}

export async function loadLatestNhisChatContext(
  appUserId: string
): Promise<HealthLinkChatContext | null> {
  const cache = await db.healthProviderFetchCache.findFirst({
    where: {
      appUserId,
      provider: HYPHEN_PROVIDER,
      ok: true,
    },
    orderBy: { fetchedAt: "desc" },
    select: {
      fetchedAt: true,
      payload: true,
    },
  });

  if (!cache) return null;

  const payload = toFetchRoutePayload(cache.payload);
  if (!payload?.ok) return null;

  const data = asRecord(payload.data);
  const normalized = asRecord(data?.normalized);
  if (!normalized) return null;

  const aiSummary = asRecord(normalized.aiSummary);
  const medication = asRecord(normalized.medication);
  const medicationRows = Array.isArray(medication?.list)
    ? medication.list.filter(
        (item): item is NhisDataRow => !!item && typeof item === "object" && !Array.isArray(item)
      )
    : [];
  const medicationDigest = summarizeMedicationRows(medicationRows);

  const headline = asString(aiSummary?.headline);
  const summary = asString(aiSummary?.summary);
  const highlights = asStringArray(aiSummary?.highlights).slice(0, 4);
  const nextSteps = asStringArray(aiSummary?.nextSteps).slice(0, 4);

  const metricInsights = Array.isArray(aiSummary?.metricInsights)
    ? aiSummary.metricInsights
        .map((item) => {
          const record = asRecord(item);
          if (!record) return null;
          const metric = asString(record.metric);
          const value = asString(record.value);
          const interpretation = asString(record.interpretation);
          const tip = asString(record.tip);
          if (!metric || !value) return null;
          return {
            metric,
            value,
            interpretation,
            tip,
          };
        })
        .filter(
          (
            item
          ): item is {
            metric: string;
            value: string;
            interpretation: string;
            tip: string;
          } => !!item
        )
        .slice(0, 4)
    : [];

  const hasAnySummary =
    !!headline ||
    !!summary ||
    highlights.length > 0 ||
    nextSteps.length > 0 ||
    metricInsights.length > 0 ||
    medicationDigest.topMedicines.length > 0;
  if (!hasAnySummary) return null;

  const riskLevelRaw = asString(aiSummary?.riskLevel);
  const riskLevel =
    riskLevelRaw === "low" ||
    riskLevelRaw === "medium" ||
    riskLevelRaw === "high" ||
    riskLevelRaw === "unknown"
      ? riskLevelRaw
      : "unknown";

  return {
    fetchedAt: cache.fetchedAt.toISOString(),
    riskLevel,
    headline,
    summary,
    highlights,
    nextSteps,
    metricInsights,
    topMedicines: medicationDigest.topMedicines,
    topConditions: medicationDigest.topConditions,
    recentMedications: medicationDigest.recentMedications,
  };
}
