import "server-only";

import db from "@/lib/db";
import { maskBirthDate, maskPhone } from "@/lib/b2b/identity";
import { monthRangeFromPeriodKey, periodKeyToCycle } from "@/lib/b2b/period";
import {
  resolveReportScores,
  type ReportScoreDetailMap,
  type ReportScoreKey,
} from "@/lib/b2b/report-score-engine";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeCompact(text: string) {
  return text.replace(/\s+/g, "").trim();
}

function normalizeUnit(unit: string | null | undefined) {
  if (!unit) return null;
  const normalized = normalizeCompact(unit).toLowerCase();
  if (!normalized) return null;
  const table: Record<string, string> = {
    mmhg: "mmHg",
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "kg/m2": "kg/m2",
    "kg/m²": "kg/m2",
    cm: "cm",
    kg: "kg",
    bpm: "bpm",
    "%": "%",
  };
  return table[normalized] ?? unit.trim();
}

function mergeValueWithUnit(value: string, unit: string | null) {
  if (!unit) return value;
  const compactValue = normalizeCompact(value).toLowerCase();
  const compactUnit = normalizeCompact(unit).toLowerCase();
  if (compactValue.includes(compactUnit)) return value;
  return `${value} ${unit}`.trim();
}

function parseSortableDateScore(value: unknown) {
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

function extractHealthMetrics(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const checkup = asRecord(normalized?.checkup);
  const overview = asArray(checkup?.overview);
  const metrics: Array<{ metric: string; value: string; unit: string | null }> = [];
  const seen = new Set<string>();

  for (const item of overview) {
    const row = asRecord(item);
    if (!row) continue;
    const metric = toText(row.itemName ?? row.metric ?? row.inspectItem ?? row.type);
    const valueRaw = toText(row.value ?? row.itemData ?? row.result);
    const unit = normalizeUnit(toText(row.unit) || null);
    if (!metric || !valueRaw) continue;
    const value = mergeValueWithUnit(valueRaw, unit);
    const uniqueKey = `${metric}|${value}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);
    metrics.push({ metric, value, unit });
    if (metrics.length >= 16) break;
  }

  return metrics;
}

type MedicationContainerState = "present" | "missing" | "unrecognized";

function extractMedicationRows(normalizedJson: unknown): {
  rows: Array<{
    medicationName: string;
    hospitalName: string | null;
    date: string | null;
    dosageDay: string | null;
  }>;
  containerState: MedicationContainerState;
} {
  const normalized = asRecord(normalizedJson);
  if (!normalized || !("medication" in normalized)) {
    return { rows: [], containerState: "missing" };
  }
  const medicationRaw = normalized.medication;
  const medicationRecord = asRecord(medicationRaw);
  const list = Array.isArray(medicationRaw)
    ? medicationRaw
    : asArray(
        medicationRecord?.list ??
          medicationRecord?.rows ??
          medicationRecord?.items ??
          medicationRecord?.history
      );
  const containerState: MedicationContainerState =
    Array.isArray(medicationRaw) ||
    Array.isArray(medicationRecord?.list) ||
    Array.isArray(medicationRecord?.rows) ||
    Array.isArray(medicationRecord?.items) ||
    Array.isArray(medicationRecord?.history)
      ? "present"
      : medicationRecord
      ? "unrecognized"
      : "missing";
  const rows: Array<{
    medicationName: string;
    hospitalName: string | null;
    date: string | null;
    dosageDay: string | null;
  }> = [];
  const seen = new Set<string>();

  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const medicationName = toText(
      row.medicineNm ??
        row.medicine ??
        row.drugName ??
        row.drugNm ??
        row.medNm ??
        row.medicineName ??
        row.prodName ??
        row.drug_MEDI_PRDC_NM ??
        row.MEDI_PRDC_NM ??
        row.detail_CMPN_NM ??
        row.CMPN_NM
    );
    if (!medicationName) continue;

    const hospitalName =
      toText(
        row.hospitalNm ??
          row.hospitalName ??
          row.hospital ??
          row.clinicName ??
          row.hspNm ??
          row.detail_HSP_NM ??
          row.drug_HSP_NM ??
          row.clinicNm
      ) || null;

    const date =
      toText(
        row.diagDate ??
          row.medDate ??
          row.date ??
          row.rxDate ??
          row.prescribeDate ??
          row.prscDate ??
          row.takeDate ??
          row.TRTM_YMD ??
          row.detail_PRSC_YMD ??
          row.detail_TRTM_YMD ??
          row.drug_PRSC_YMD ??
          row.drug_TRTM_YMD ??
          row.PRSC_YMD ??
          row.medicationDate
      ) || null;

    const dosageDay =
      toText(
        row.dosageDay ??
          row.period ??
          row.takeDay ??
          row.dayCount ??
          row.detail_DOSAGE_DAY ??
          row.drug_DOSAGE_DAY
      ) || null;

    const uniqueKey = `${medicationName}|${date ?? ""}|${hospitalName ?? ""}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    rows.push({
      medicationName,
      hospitalName,
      date,
      dosageDay,
    });
  }

  return {
    rows: rows
      .sort((a, b) => parseSortableDateScore(b.date) - parseSortableDateScore(a.date))
      .slice(0, 3),
    containerState,
  };
}

function extractFailedTargets(rawJson: unknown) {
  const root = asRecord(rawJson);
  const meta = asRecord(root?.meta);
  const failedRaw = asArray(meta?.failed ?? root?.failed);
  const targets = failedRaw
    .map((item) => asRecord(item))
    .map((item) => toText(item?.target))
    .filter((item): item is string => Boolean(item));
  return [...new Set(targets)];
}

function resolveMedicationStatus(input: {
  medications: Array<{
    medicationName: string;
    hospitalName: string | null;
    date: string | null;
    dosageDay: string | null;
  }>;
  containerState: MedicationContainerState;
  sourceMode: string | null;
  rawJson: unknown;
}) {
  const failedTargets = extractFailedTargets(input.rawJson);
  const medicationFailed = failedTargets.includes("medication");
  if (medicationFailed) {
    return {
      type: "fetch_failed" as const,
      message: "복약 정보를 불러오지 못했습니다.",
      failedTargets,
    };
  }
  if (input.medications.length > 0) {
    return {
      type: "available" as const,
      message: null,
      failedTargets,
    };
  }
  if (!input.rawJson) {
    return {
      type: "unknown" as const,
      message: "아직 건강 연동이 완료되지 않았습니다.",
      failedTargets,
    };
  }
  if (input.sourceMode === "mock") {
    return {
      type: "unknown" as const,
      message: "데모 데이터에서는 복약 정보를 확인할 수 없습니다.",
      failedTargets,
    };
  }
  if (input.containerState === "missing" || input.containerState === "unrecognized") {
    return {
      type: "unknown" as const,
      message: "복약 데이터 구조를 확인하지 못했습니다. 잠시 후 다시 연동해 주세요.",
      failedTargets,
    };
  }
  return {
    type: "none" as const,
    message: "최근 3회 복약 이력이 없습니다.",
    failedTargets,
  };
}

function parseFetchFlags(rawJson: unknown) {
  const root = asRecord(rawJson);
  const meta = asRecord(root?.meta);
  const partialValue = meta?.partial ?? root?.partial;
  const partial = partialValue === true;
  return {
    partial,
    failedTargets: extractFailedTargets(rawJson),
  };
}

function extractAnalysisSummary(payload: unknown) {
  const record = asRecord(payload);
  const summary = asRecord(record?.summary);
  return {
    overallScore:
      typeof summary?.overallScore === "number" ? summary.overallScore : null,
    surveyScore: typeof summary?.surveyScore === "number" ? summary.surveyScore : null,
    healthScore: typeof summary?.healthScore === "number" ? summary.healthScore : null,
    medicationScore:
      typeof summary?.medicationScore === "number" ? summary.medicationScore : null,
    riskLevel: typeof summary?.riskLevel === "string" ? summary.riskLevel : "unknown",
    topIssues: Array.isArray(summary?.topIssues)
      ? summary.topIssues
          .map((item) => asRecord(item))
          .filter((item): item is JsonRecord => Boolean(item))
          .map((item) => ({
            sectionKey: toText(item.sectionKey) || "-",
            title: toText(item.title) || "이슈",
            score:
              typeof item.score === "number"
                ? item.score
                : Number(toText(item.score) || 0),
          }))
      : [],
  };
}

function extractAnalysisSurvey(payload: unknown) {
  const record = asRecord(payload);
  const survey = asRecord(record?.survey);
  const sectionScores = Array.isArray(survey?.sectionScores)
    ? survey.sectionScores
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          sectionKey: toText(item.sectionKey) || "-",
          sectionTitle: toText(item.sectionTitle) || toText(item.sectionKey) || "-",
          score:
            typeof item.score === "number"
              ? item.score
              : Number(toText(item.score) || 0),
          answeredCount: typeof item.answeredCount === "number" ? item.answeredCount : 0,
          questionCount: typeof item.questionCount === "number" ? item.questionCount : 0,
        }))
    : [];

  return {
    sectionScores,
    overallScore: typeof survey?.overallScore === "number" ? survey.overallScore : null,
    topIssues: Array.isArray(survey?.topIssues)
      ? survey.topIssues
          .map((item) => asRecord(item))
          .filter((item): item is JsonRecord => Boolean(item))
          .map((item) => ({
            sectionKey: toText(item.sectionKey) || "-",
            title: toText(item.title) || "이슈",
            score:
              typeof item.score === "number"
                ? item.score
                : Number(toText(item.score) || 0),
          }))
      : [],
  };
}

function extractAnalysisHealth(payload: unknown) {
  const record = asRecord(payload);
  const health = asRecord(record?.health);
  const coreMetrics = Array.isArray(health?.coreMetrics)
    ? health.coreMetrics
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          key: toText(item.key) || "-",
          label: toText(item.label) || "-",
          value: toText(item.value) || "-",
          unit: toText(item.unit) || null,
          status: toText(item.status) || "unknown",
        }))
    : [];

  const riskFlags = Array.isArray(health?.riskFlags)
    ? health.riskFlags
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          key: toText(item.key) || "-",
          label: toText(item.label) || "-",
          severity: toText(item.severity) || "unknown",
          value: toText(item.value) || "-",
          reason: toText(item.reason) || "",
        }))
    : [];

  const abnormalFlags = Array.isArray(health?.abnormalFlags)
    ? health.abnormalFlags.map((item) => toText(item)).filter(Boolean)
    : [];

  return { coreMetrics, riskFlags, abnormalFlags };
}

function extractAnalysisTrend(payload: unknown) {
  const record = asRecord(payload);
  const trend = asRecord(record?.trend);
  const months = Array.isArray(trend?.months)
    ? trend.months
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          periodKey: toText(item.periodKey) || "-",
          overallScore: typeof item.overallScore === "number" ? item.overallScore : 0,
          surveyScore: typeof item.surveyScore === "number" ? item.surveyScore : 0,
          healthScore: typeof item.healthScore === "number" ? item.healthScore : 0,
        }))
    : [];
  return { months };
}

function extractExternalCards(payload: unknown) {
  const record = asRecord(payload);
  const external = asRecord(record?.externalAnalysis);
  const cards = Array.isArray(external?.cards)
    ? external.cards
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          key: toText(item.key) || "-",
          title: toText(item.title) || toText(item.key) || "-",
          value: toText(item.value) || "",
        }))
    : [];
  return cards;
}

function extractAiEvaluation(payload: unknown) {
  const record = asRecord(payload);
  const ai = asRecord(record?.aiEvaluation);
  if (!ai) return null;
  const summary = toText(ai.summary);
  const monthlyGuide = toText(ai.monthlyGuide);
  if (!summary || !monthlyGuide) return null;
  return {
    generatedAt: toText(ai.generatedAt) || new Date().toISOString(),
    model: toText(ai.model) || "gpt-4o-mini",
    summary,
    monthlyGuide,
    actionItems: Array.isArray(ai.actionItems)
      ? ai.actionItems.map((item) => toText(item)).filter(Boolean)
      : [],
    caution: toText(ai.caution) || "",
  };
}

function extractWellnessSectionAdvice(payload: unknown) {
  const sectionAdviceRecord = asRecord(payload);
  if (!sectionAdviceRecord) return {};

  const entries = Object.entries(sectionAdviceRecord).map(([sectionId, value]) => {
    const row = asRecord(value);
    const sectionTitle = toText(row?.sectionTitle) || sectionId;
    const items = Array.isArray(row?.items)
      ? row.items
          .map((item) => asRecord(item))
          .filter((item): item is JsonRecord => Boolean(item))
          .map((item) => ({
            questionNumber:
              typeof item.questionNumber === "number"
                ? item.questionNumber
                : Number.parseInt(toText(item.questionNumber), 10),
            text: toText(item.text),
          }))
          .filter(
            (item) => Number.isFinite(item.questionNumber) && Boolean(item.text)
          )
          .sort((left, right) => left.questionNumber - right.questionNumber)
      : [];
    return [
      sectionId,
      {
        sectionTitle,
        items,
      },
    ] as const;
  });

  return Object.fromEntries(entries);
}

function extractWellness(payload: unknown) {
  const record = asRecord(payload);
  const wellness = asRecord(record?.wellness);
  if (!wellness) return null;

  const lifestyleRiskRecord = asRecord(wellness.lifestyleRisk);
  const lifestyleDomains = Array.isArray(lifestyleRiskRecord?.domains)
    ? lifestyleRiskRecord.domains
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          id: toText(item.id) || "-",
          name: toText(item.name) || toText(item.id) || "-",
          normalized:
            typeof item.normalized === "number"
              ? item.normalized
              : Number(toText(item.normalized) || 0),
          percent:
            typeof item.percent === "number"
              ? item.percent
              : Number(toText(item.percent) || 0),
        }))
    : [];

  const healthNeedRecord = asRecord(wellness.healthManagementNeed);
  const healthNeedSections = Array.isArray(healthNeedRecord?.sections)
    ? healthNeedRecord.sections
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          sectionId: toText(item.sectionId) || "-",
          sectionTitle:
            toText(item.sectionTitle) || toText(item.sectionId) || "-",
          percent:
            typeof item.percent === "number"
              ? item.percent
              : Number(toText(item.percent) || 0),
        }))
    : [];

  const supplementDesign = Array.isArray(wellness.supplementDesign)
    ? wellness.supplementDesign
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          sectionId: toText(item.sectionId) || "-",
          title: toText(item.title) || toText(item.sectionId) || "-",
          paragraphs: Array.isArray(item.paragraphs)
            ? item.paragraphs.map((paragraph) => toText(paragraph)).filter(Boolean)
            : [],
        }))
    : [];

  return {
    schemaVersion: toText(wellness.schemaVersion) || "wellness-score-v1",
    selectedSections: Array.isArray(wellness.selectedSections)
      ? wellness.selectedSections.map((item) => toText(item)).filter(Boolean)
      : [],
    lifestyleRisk: {
      domainScoresNormalized: asRecord(lifestyleRiskRecord?.domainScoresNormalized) ?? {},
      domainScoresPercent: asRecord(lifestyleRiskRecord?.domainScoresPercent) ?? {},
      domains: lifestyleDomains,
      overallPercent:
        typeof lifestyleRiskRecord?.overallPercent === "number"
          ? lifestyleRiskRecord.overallPercent
          : Number(toText(lifestyleRiskRecord?.overallPercent) || 0),
    },
    healthManagementNeed: {
      sectionNeedPercentById: asRecord(healthNeedRecord?.sectionNeedPercentById) ?? {},
      sections: healthNeedSections,
      averagePercent:
        typeof healthNeedRecord?.averagePercent === "number"
          ? healthNeedRecord.averagePercent
          : Number(toText(healthNeedRecord?.averagePercent) || 0),
    },
    overallHealthScore:
      typeof wellness.overallHealthScore === "number"
        ? wellness.overallHealthScore
        : Number(toText(wellness.overallHealthScore) || 0),
    sectionAdvice: extractWellnessSectionAdvice(wellness.sectionAdvice),
    lifestyleRoutineAdvice: Array.isArray(wellness.lifestyleRoutineAdvice)
      ? wellness.lifestyleRoutineAdvice
          .map((item) => toText(item))
          .filter(Boolean)
      : [],
    supplementDesign,
    perQuestionScores: asRecord(wellness.perQuestionScores) ?? {},
  };
}

type CredibleTopIssue = {
  sectionKey: string;
  title: string;
  score: number;
  reason: string;
};

function clampIssueScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function pushCredibleIssue(list: CredibleTopIssue[], issue: CredibleTopIssue) {
  const title = toText(issue.title);
  if (!title) return;
  const normalizedKey = `${toText(issue.sectionKey)}|${title}`;
  const existingIndex = list.findIndex((item) => {
    const itemKey = `${toText(item.sectionKey)}|${toText(item.title)}`;
    return itemKey === normalizedKey;
  });
  const nextIssue = {
    sectionKey: toText(issue.sectionKey) || "-",
    title,
    score: clampIssueScore(issue.score),
    reason: toText(issue.reason),
  };
  if (existingIndex < 0) {
    list.push(nextIssue);
    return;
  }
  if (nextIssue.score > list[existingIndex].score) {
    list[existingIndex] = nextIssue;
  }
}

function buildCredibleTopIssues(input: {
  scoreDetails: ReportScoreDetailMap;
  analysisSummaryTopIssues: Array<{ sectionKey: string; title: string; score: number }>;
  surveySectionScores: Array<{
    sectionKey: string;
    sectionTitle: string;
    score: number;
    answeredCount: number;
    questionCount: number;
  }>;
  healthRiskFlags: Array<{
    key: string;
    label: string;
    severity: string;
    value: string;
    reason: string;
  }>;
  healthCoreMetrics: Array<{
    key: string;
    label: string;
    value: string;
    unit: string | null;
    status: string;
  }>;
  medicationStatus: {
    type: "available" | "none" | "fetch_failed" | "unknown";
    message: string | null;
    failedTargets: string[];
  };
  fetchStatus: {
    partial: boolean;
    failedTargets: string[];
  };
}) {
  const issues: CredibleTopIssue[] = [];
  const scoreDetailOrder: ReportScoreKey[] = ["health", "survey", "medication", "overall"];

  for (const key of scoreDetailOrder) {
    const detail = input.scoreDetails[key];
    if (!detail) continue;
    if (detail.status === "missing") {
      pushCredibleIssue(issues, {
        sectionKey: key,
        title: `${detail.label} 근거 데이터 부족`,
        score: 82,
        reason: detail.reason,
      });
      continue;
    }
    if (detail.value == null || detail.value >= 74) continue;
    pushCredibleIssue(issues, {
      sectionKey: key,
      title: `${detail.label} 보완 필요`,
      score: 100 - detail.value,
      reason: detail.reason,
    });
  }

  const lowSurveySections = [...input.surveySectionScores]
    .filter((section) => Number.isFinite(section.score) && section.score < 72)
    .sort((left, right) => left.score - right.score)
    .slice(0, 2);
  for (const section of lowSurveySections) {
    const completion =
      section.questionCount > 0
        ? Math.round((section.answeredCount / section.questionCount) * 100)
        : 0;
    pushCredibleIssue(issues, {
      sectionKey: section.sectionKey || "survey",
      title: `${section.sectionTitle} 설문 보완 필요`,
      score: Math.max(38, 100 - section.score),
      reason: `응답 ${section.answeredCount}/${section.questionCount} (${completion}%)`,
    });
  }

  for (const flag of input.healthRiskFlags.slice(0, 3)) {
    const severity = toText(flag.severity).toLowerCase();
    const severityScore =
      severity === "high" ? 84 : severity === "medium" ? 68 : 54;
    const measuredValue = toText(flag.value);
    pushCredibleIssue(issues, {
      sectionKey: flag.key || "health",
      title: `${flag.label} 위험 신호`,
      score: severityScore,
      reason: toText(flag.reason) || (measuredValue ? `측정값 ${measuredValue}` : "지표 추적 필요"),
    });
  }

  if (input.healthRiskFlags.length === 0) {
    const metricWarnings = input.healthCoreMetrics
      .filter((metric) => {
        const status = toText(metric.status).toLowerCase();
        return status === "high" || status === "caution" || status === "low";
      })
      .slice(0, 2);
    for (const metric of metricWarnings) {
      const status = toText(metric.status).toLowerCase();
      const severityScore = status === "high" ? 76 : 58;
      const valueWithUnit = mergeValueWithUnit(metric.value, metric.unit);
      pushCredibleIssue(issues, {
        sectionKey: metric.key || "health",
        title: `${metric.label} 수치 확인 필요`,
        score: severityScore,
        reason: `측정값 ${valueWithUnit}`,
      });
    }
  }

  if (input.medicationStatus.type === "fetch_failed") {
    pushCredibleIssue(issues, {
      sectionKey: "medication",
      title: "복약 이력 수집 실패",
      score: 86,
      reason: input.medicationStatus.message || "복약 데이터를 다시 동기화해 주세요.",
    });
  } else if (input.medicationStatus.type === "unknown") {
    pushCredibleIssue(issues, {
      sectionKey: "medication",
      title: "복약 이력 확인 불충분",
      score: 63,
      reason:
        input.medicationStatus.message ||
        "복약 정보가 불명확해 안전성 평가의 신뢰도가 떨어집니다.",
    });
  }

  if (input.fetchStatus.partial || input.fetchStatus.failedTargets.length > 0) {
    pushCredibleIssue(issues, {
      sectionKey: "fetch",
      title: "데이터 동기화 일부 누락",
      score: 72,
      reason:
        input.fetchStatus.failedTargets.length > 0
          ? `누락 대상: ${input.fetchStatus.failedTargets.join(", ")}`
          : "원천 데이터 재수집이 필요합니다.",
    });
  }

  if (issues.length < 3) {
    for (const issue of input.analysisSummaryTopIssues) {
      if (issues.length >= 4) break;
      pushCredibleIssue(issues, {
        sectionKey: issue.sectionKey || "analysis",
        title: issue.title,
        score: clampIssueScore(100 - issue.score),
        reason: "기존 분석 결과에서 반복 관찰된 항목입니다.",
      });
    }
  }

  return issues.sort((left, right) => right.score - left.score).slice(0, 4);
}

async function findLatestByPeriodOrFallback<T>(input: {
  periodKey: string;
  exactFinder: () => Promise<T | null>;
  fallbackFinder: (to: Date) => Promise<T | null>;
}) {
  const exact = await input.exactFinder();
  if (exact) return exact;
  const range = monthRangeFromPeriodKey(input.periodKey);
  if (!range) return null;
  return input.fallbackFinder(range.to);
}

export type B2bReportPayload = {
  meta: {
    employeeId: string;
    employeeName: string;
    birthDateMasked: string;
    phoneMasked: string;
    generatedAt: string;
    periodKey: string;
    reportCycle: number | null;
    variantIndex: number;
    stylePreset: string;
    sourceMode: string | null;
    isMockData: boolean;
  };
  health: {
    fetchedAt: string | null;
    metrics: Array<{ metric: string; value: string; unit: string | null }>;
    coreMetrics: Array<{
      key: string;
      label: string;
      value: string;
      unit: string | null;
      status: string;
    }>;
    riskFlags: Array<{
      key: string;
      label: string;
      severity: string;
      value: string;
      reason: string;
    }>;
    abnormalFlags: string[];
    medications: Array<{
      medicationName: string;
      hospitalName: string | null;
      date: string | null;
      dosageDay: string | null;
    }>;
    fetchStatus: {
      partial: boolean;
      failedTargets: string[];
    };
    medicationStatus: {
      type: "available" | "none" | "fetch_failed" | "unknown";
      message: string | null;
      failedTargets: string[];
    };
  };
  survey: {
    templateVersion: number | null;
    selectedSections: string[];
    sectionScores: Array<{
      sectionKey: string;
      sectionTitle: string;
      score: number;
      answeredCount: number;
      questionCount: number;
    }>;
    overallScore: number | null;
    topIssues: Array<{
      sectionKey: string;
      title: string;
      score: number;
      reason?: string;
    }>;
    answers: Array<{
      questionKey: string;
      sectionKey: string | null;
      answerText: string | null;
      answerValue: string | null;
    }>;
    updatedAt: string | null;
  };
  analysis: {
    version: number | null;
    periodKey: string;
    reportCycle: number | null;
    payload: unknown;
    summary: {
      overallScore: number | null;
      surveyScore: number | null;
      healthScore: number | null;
      medicationScore: number | null;
      riskLevel: string;
      topIssues: Array<{
        sectionKey: string;
        title: string;
        score: number;
        reason?: string;
      }>;
    };
    scoreDetails: ReportScoreDetailMap;
    scoreEngineVersion: string;
    riskFlags: string[];
    recommendations: string[];
    trend: {
      months: Array<{
        periodKey: string;
        overallScore: number;
        surveyScore: number;
        healthScore: number;
      }>;
    };
    externalCards: Array<{
      key: string;
      title: string;
      value: string;
    }>;
    aiEvaluation: {
      generatedAt: string;
      model: string;
      summary: string;
      monthlyGuide: string;
      actionItems: string[];
      caution: string;
    } | null;
    wellness: {
      schemaVersion: string;
      selectedSections: string[];
      lifestyleRisk: {
        domainScoresNormalized: Record<string, unknown>;
        domainScoresPercent: Record<string, unknown>;
        domains: Array<{
          id: string;
          name: string;
          normalized: number;
          percent: number;
        }>;
        overallPercent: number;
      };
      healthManagementNeed: {
        sectionNeedPercentById: Record<string, unknown>;
        sections: Array<{
          sectionId: string;
          sectionTitle: string;
          percent: number;
        }>;
        averagePercent: number;
      };
      overallHealthScore: number;
      sectionAdvice: Record<
        string,
        {
          sectionTitle: string;
          items: Array<{ questionNumber: number; text: string }>;
        }
      >;
      lifestyleRoutineAdvice: string[];
      supplementDesign: Array<{
        sectionId: string;
        title: string;
        paragraphs: string[];
      }>;
      perQuestionScores: Record<string, unknown>;
    } | null;
    updatedAt: string | null;
  };
  pharmacist: {
    note: string | null;
    recommendations: string | null;
    cautions: string | null;
    summary: string | null;
    dosingGuide: string | null;
    updatedAt: string | null;
  };
};

export async function buildB2bReportPayload(input: {
  employeeId: string;
  periodKey: string;
  variantIndex: number;
  stylePreset: string;
}) {
  const reportCycle = periodKeyToCycle(input.periodKey);

  const employee = await db.b2bEmployee.findUnique({
    where: { id: input.employeeId },
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

  const [latestHealth, latestSurvey, latestAnalysis, latestNote] = await Promise.all([
    findLatestByPeriodOrFallback({
      periodKey: input.periodKey,
      exactFinder: () =>
        db.b2bHealthDataSnapshot.findFirst({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
          orderBy: { fetchedAt: "desc" },
        }),
      fallbackFinder: (to) =>
        db.b2bHealthDataSnapshot.findFirst({
          where: { employeeId: input.employeeId, fetchedAt: { lt: to } },
          orderBy: { fetchedAt: "desc" },
        }),
    }),
    findLatestByPeriodOrFallback({
      periodKey: input.periodKey,
      exactFinder: () =>
        db.b2bSurveyResponse.findFirst({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
          include: {
            answers: {
              orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
      fallbackFinder: (to) =>
        db.b2bSurveyResponse.findFirst({
          where: { employeeId: input.employeeId, updatedAt: { lt: to } },
          include: {
            answers: {
              orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
    }),
    findLatestByPeriodOrFallback({
      periodKey: input.periodKey,
      exactFinder: () =>
        db.b2bAnalysisResult.findFirst({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
          orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
        }),
      fallbackFinder: (to) =>
        db.b2bAnalysisResult.findFirst({
          where: { employeeId: input.employeeId, updatedAt: { lt: to } },
          orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
        }),
    }),
    findLatestByPeriodOrFallback({
      periodKey: input.periodKey,
      exactFinder: () =>
        db.b2bPharmacistNote.findFirst({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
          orderBy: { updatedAt: "desc" },
        }),
      fallbackFinder: (to) =>
        db.b2bPharmacistNote.findFirst({
          where: { employeeId: input.employeeId, updatedAt: { lt: to } },
          orderBy: { updatedAt: "desc" },
        }),
    }),
  ]);

  const metrics = extractHealthMetrics(latestHealth?.normalizedJson);
  const medicationExtraction = extractMedicationRows(latestHealth?.normalizedJson);
  const medications = medicationExtraction.rows;
  const fetchStatus = parseFetchFlags(latestHealth?.rawJson);
  const medicationStatus = resolveMedicationStatus({
    medications,
    containerState: medicationExtraction.containerState,
    sourceMode: latestHealth?.sourceMode ?? null,
    rawJson: latestHealth?.rawJson,
  });

  const analysisSummary = extractAnalysisSummary(latestAnalysis?.payload);
  const analysisSurvey = extractAnalysisSurvey(latestAnalysis?.payload);
  const analysisHealth = extractAnalysisHealth(latestAnalysis?.payload);
  const analysisTrend = extractAnalysisTrend(latestAnalysis?.payload);
  const externalCards = extractExternalCards(latestAnalysis?.payload);
  const aiEvaluation = extractAiEvaluation(latestAnalysis?.payload);
  const wellness = extractWellness(latestAnalysis?.payload);
  const scoreResolution = resolveReportScores({
    analysisSummary,
    analysisSurveyOverallScore: analysisSurvey.overallScore,
    surveySectionScores: analysisSurvey.sectionScores,
    healthCoreMetrics: analysisHealth.coreMetrics,
    medicationStatusType: medicationStatus.type,
    medicationCount: medications.length,
  });
  const analysisRecord = asRecord(latestAnalysis?.payload);

  const riskFlagsFromPayload = Array.isArray(analysisRecord?.riskFlags)
    ? analysisRecord.riskFlags.map((item) => toText(item)).filter(Boolean)
    : [];
  const riskFlags =
    riskFlagsFromPayload.length > 0
      ? riskFlagsFromPayload
      : analysisHealth.riskFlags
          .map((item) => toText(item.reason) || toText(item.label))
          .filter(Boolean);
  const recommendationsFromPayload = Array.isArray(analysisRecord?.recommendations)
    ? analysisRecord.recommendations.map((item) => toText(item)).filter(Boolean)
    : [];
  const credibleTopIssues = buildCredibleTopIssues({
    scoreDetails: scoreResolution.details,
    analysisSummaryTopIssues: analysisSummary.topIssues,
    surveySectionScores: analysisSurvey.sectionScores,
    healthRiskFlags: analysisHealth.riskFlags,
    healthCoreMetrics: analysisHealth.coreMetrics,
    medicationStatus,
    fetchStatus,
  });
  const recommendations = [
    ...recommendationsFromPayload,
    ...credibleTopIssues
      .map((item) =>
        item.reason ? `${item.title}: ${item.reason}` : item.title
      )
      .filter(Boolean),
  ].filter((item, index, source) => source.indexOf(item) === index);

  const pharmacistRecord = asRecord(latestAnalysis?.payload)?.pharmacist;
  const pharmacistSummary = asRecord(pharmacistRecord);

  const payload: B2bReportPayload = {
    meta: {
      employeeId: employee.id,
      employeeName: employee.name,
      birthDateMasked: maskBirthDate(employee.birthDate),
      phoneMasked: maskPhone(employee.phoneNormalized),
      generatedAt: new Date().toISOString(),
      periodKey: input.periodKey,
      reportCycle,
      variantIndex: input.variantIndex,
      stylePreset: input.stylePreset,
      sourceMode: latestHealth?.sourceMode ?? null,
      isMockData: latestHealth?.sourceMode === "mock",
    },
    health: {
      fetchedAt: latestHealth?.fetchedAt?.toISOString() ?? null,
      metrics,
      coreMetrics: analysisHealth.coreMetrics,
      riskFlags: analysisHealth.riskFlags,
      abnormalFlags: analysisHealth.abnormalFlags,
      medications,
      fetchStatus,
      medicationStatus,
    },
    survey: {
      templateVersion: latestSurvey?.templateVersion ?? null,
      selectedSections: latestSurvey?.selectedSections ?? [],
      sectionScores: analysisSurvey.sectionScores,
      overallScore: scoreResolution.summary.surveyScore,
      topIssues: credibleTopIssues,
      answers:
        latestSurvey?.answers.map((answer) => ({
          questionKey: answer.questionKey,
          sectionKey: answer.sectionKey ?? null,
          answerText: answer.answerText ?? null,
          answerValue: answer.answerValue ?? null,
        })) ?? [],
      updatedAt: latestSurvey?.updatedAt?.toISOString() ?? null,
    },
    analysis: {
      version: latestAnalysis?.version ?? null,
      periodKey: latestAnalysis?.periodKey ?? input.periodKey,
      reportCycle:
        latestAnalysis?.reportCycle ??
        periodKeyToCycle(latestAnalysis?.periodKey ?? input.periodKey),
      payload: latestAnalysis?.payload ?? null,
      summary: {
        overallScore: scoreResolution.summary.overallScore,
        surveyScore: scoreResolution.summary.surveyScore,
        healthScore: scoreResolution.summary.healthScore,
        medicationScore: scoreResolution.summary.medicationScore,
        riskLevel: scoreResolution.summary.riskLevel,
        topIssues: credibleTopIssues,
      },
      scoreDetails: scoreResolution.details,
      scoreEngineVersion: scoreResolution.version,
      riskFlags,
      recommendations: recommendations.slice(0, 6),
      trend: analysisTrend,
      externalCards,
      aiEvaluation,
      wellness,
      updatedAt:
        latestAnalysis?.updatedAt?.toISOString() ??
        latestAnalysis?.createdAt?.toISOString() ??
        null,
    },
    pharmacist: {
      note: latestNote?.note ?? null,
      recommendations: latestNote?.recommendations ?? null,
      cautions: latestNote?.cautions ?? null,
      summary: toText(pharmacistSummary?.summary) || latestNote?.note || null,
      dosingGuide: toText(pharmacistSummary?.dosingGuide) || null,
      updatedAt: latestNote?.updatedAt?.toISOString() ?? null,
    },
  };

  return payload;
}
