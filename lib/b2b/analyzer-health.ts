import "server-only";

import type { B2bAnalyzerInput } from "@/lib/b2b/analyzer";
import {
  asArray,
  asRecord,
  clampScore,
  formatDateTime,
  parseSortableDateScore,
  resolveMedicationList,
  toNumber,
  toText,
} from "@/lib/b2b/analyzer-helpers";
import { resolveSectionTitle } from "@/lib/b2b/analyzer-survey";

type RiskFlag = {
  key: string;
  label: string;
  severity: "low" | "medium" | "high";
  value: string;
  reason: string;
};

type CoreMetric = {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  status: "normal" | "caution" | "high" | "unknown";
};

type MedicationStatusType = "available" | "none" | "fetch_failed" | "unknown";

function parseBloodPressure(value: string) {
  const match = value.replace(/\s/g, "").match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!match) return null;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  return { systolic, diastolic };
}

function inferMetricStatus(metricKey: string, valueText: string): CoreMetric["status"] {
  const numeric = toNumber(valueText);
  if (metricKey === "bloodPressure") {
    const bp = parseBloodPressure(valueText);
    if (!bp) return "unknown";
    if (bp.systolic >= 140 || bp.diastolic >= 90) return "high";
    if (bp.systolic >= 130 || bp.diastolic >= 80) return "caution";
    return "normal";
  }
  if (numeric == null) return "unknown";

  switch (metricKey) {
    case "bmi":
      if (numeric >= 30) return "high";
      if (numeric >= 25) return "caution";
      return "normal";
    case "glucose":
      if (numeric >= 126) return "high";
      if (numeric >= 100) return "caution";
      return "normal";
    case "cholesterol":
      if (numeric >= 240) return "high";
      if (numeric >= 200) return "caution";
      return "normal";
    case "triglyceride":
      if (numeric >= 200) return "high";
      if (numeric >= 150) return "caution";
      return "normal";
    case "ldl":
      if (numeric >= 160) return "high";
      if (numeric >= 130) return "caution";
      return "normal";
    case "hdl":
      if (numeric < 40) return "caution";
      return "normal";
    default:
      return "unknown";
  }
}

function severityPenalty(status: CoreMetric["status"]) {
  if (status === "high") return 18;
  if (status === "caution") return 10;
  return 0;
}

export function buildHealth(input: B2bAnalyzerInput) {
  const normalized = asRecord(input.healthSnapshot?.normalizedJson);
  const checkup = asRecord(normalized?.checkup);
  const overview = asArray(checkup?.overview);
  const metrics = new Map<string, CoreMetric>();

  const metricCatalog = [
    { key: "bmi", label: "BMI", keywords: ["체질량지수", "bmi"] },
    { key: "bloodPressure", label: "혈압", keywords: ["혈압"] },
    { key: "glucose", label: "혈당", keywords: ["공복혈당", "혈당"] },
    { key: "cholesterol", label: "총콜레스테롤", keywords: ["총콜레스테롤", "콜레스테롤"] },
    { key: "triglyceride", label: "중성지방", keywords: ["중성지방"] },
    { key: "hdl", label: "HDL", keywords: ["hdl"] },
    { key: "ldl", label: "LDL", keywords: ["ldl"] },
  ];

  for (const item of overview) {
    const row = asRecord(item);
    if (!row) continue;
    const name = toText(row.itemName ?? row.inspectItem ?? row.metric).toLowerCase();
    if (!name) continue;
    const value = toText(row.value ?? row.itemData ?? row.result);
    if (!value) continue;
    const unit = toText(row.unit) || null;

    for (const metric of metricCatalog) {
      const matched = metric.keywords.some((keyword) => name.includes(keyword.toLowerCase()));
      if (!matched) continue;
      const status = inferMetricStatus(metric.key, value);
      metrics.set(metric.key, {
        key: metric.key,
        label: metric.label,
        value,
        unit,
        status,
      });
      break;
    }
  }

  const coreMetrics = metricCatalog.map((metric) => {
    return (
      metrics.get(metric.key) || {
        key: metric.key,
        label: metric.label,
        value: "-",
        unit: null,
        status: "unknown" as const,
      }
    );
  });

  const riskFlags: RiskFlag[] = coreMetrics
    .filter((metric) => metric.status === "high" || metric.status === "caution")
    .map((metric) => ({
      key: metric.key,
      label: metric.label,
      severity: metric.status === "high" ? "high" : "medium",
      value: metric.unit ? `${metric.value} ${metric.unit}` : metric.value,
      reason:
        metric.status === "high"
          ? `${metric.label} 수치가 높게 관찰됩니다.`
          : `${metric.label} 수치가 주의 범위입니다.`,
    }));

  const healthScore = clampScore(
    100 - coreMetrics.reduce((sum, metric) => sum + severityPenalty(metric.status), 0)
  );

  return {
    fetchedAt: formatDateTime(input.healthSnapshot?.fetchedAt) ?? null,
    coreMetrics,
    riskFlags,
    abnormalFlags: riskFlags.map((item) => `${item.label}:${item.severity}`),
    healthScore,
  };
}

function resolveMedicationStatus(input: B2bAnalyzerInput): MedicationStatusType {
  const raw = asRecord(input.healthSnapshot?.rawJson);
  const meta = asRecord(raw?.meta);
  const failed = asArray(meta?.failed ?? raw?.failed)
    .map((item) => asRecord(item))
    .map((item) => toText(item?.target))
    .filter(Boolean);
  if (failed.includes("medication")) return "fetch_failed";

  const list = resolveMedicationList(input.healthSnapshot?.normalizedJson);
  if (list.length > 0) return "available";

  if (!input.healthSnapshot) return "unknown";
  if (input.healthSnapshot.sourceMode === "mock") return "unknown";
  return "none";
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return null;
}

function hasPositiveSignal(value: string | null) {
  if (!value) return false;
  const digits = value.replace(/[^\d.-]/g, "");
  if (!digits) return true;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return true;
  return numeric > 0;
}

function resolveMedicationFallbackName(row: Record<string, unknown>) {
  const diagType = pickFirstText(
    row.diagType ??
      row.detail_diagType ??
      row.drug_diagType ??
      row.visitType
  );
  const presCnt = pickFirstText(row.presCnt ?? row.medCnt ?? row.count);
  const dosageDay = pickFirstText(
    row.dosageDay ?? row.dayCount ?? row.takeDay ?? row.admDay
  );
  const hasCountSignal = hasPositiveSignal(presCnt) || hasPositiveSignal(dosageDay);
  const hasTypeSignal =
    !!diagType &&
    (diagType.includes("처방") ||
      diagType.includes("약국") ||
      diagType.includes("조제"));
  if (!hasCountSignal && !hasTypeSignal) return null;
  return `약품명 미제공 (${diagType || "처방 조제"})`;
}

export function buildMedication(input: B2bAnalyzerInput) {
  const list = resolveMedicationList(input.healthSnapshot?.normalizedJson);

  const recent = list
    .slice()
    .sort((a, b) => {
      const leftScore = parseSortableDateScore(
        a.diagDate ??
          a.medDate ??
          a.date ??
          a.rxDate ??
          a.prescribeDate ??
          a.prscDate ??
          a.takeDate ??
          a.TRTM_YMD ??
          a.detail_PRSC_YMD ??
          a.detail_TRTM_YMD ??
          a.drug_PRSC_YMD ??
          a.drug_TRTM_YMD ??
          a.PRSC_YMD ??
          a.medicationDate
      );
      const rightScore = parseSortableDateScore(
        b.diagDate ??
          b.medDate ??
          b.date ??
          b.rxDate ??
          b.prescribeDate ??
          b.prscDate ??
          b.takeDate ??
          b.TRTM_YMD ??
          b.detail_PRSC_YMD ??
          b.detail_TRTM_YMD ??
          b.drug_PRSC_YMD ??
          b.drug_TRTM_YMD ??
          b.PRSC_YMD ??
          b.medicationDate
      );
      return rightScore - leftScore;
    })
    .slice(0, 3)
    .map((item) => ({
      medicationName:
        pickFirstText(
          item.medicineNm ??
            item.medicine ??
            item.drugName ??
            item.drugNm ??
            item.medNm ??
            item.medicineName ??
            item.prodName ??
            item.drug_MEDI_PRDC_NM ??
            item.MEDI_PRDC_NM ??
            item.drug_CMPN_NM ??
            item.detail_CMPN_NM ??
            item.CMPN_NM ??
            item.drug_CMPN_NM_2 ??
            item.detail_CMPN_NM_2 ??
            item.CMPN_NM_2 ??
            item.mediPrdcNm ??
            item.drugMediPrdcNm ??
            item.cmpnNm ??
            item.drugCmpnNm ??
            item.detailCmpnNm ??
            item.cmpnNm2 ??
            item.drugCmpnNm2 ??
            item.detailCmpnNm2 ??
            item["복용약"] ??
            item["약품명"] ??
            item["약품"] ??
            item["성분"]
        ) || resolveMedicationFallbackName(item),
      date:
        pickFirstText(
          item.diagDate ??
            item.medDate ??
            item.date ??
            item.rxDate ??
            item.prescribeDate ??
            item.prscDate ??
            item.takeDate ??
            item.TRTM_YMD ??
            item.detail_PRSC_YMD ??
            item.detail_TRTM_YMD ??
            item.drug_PRSC_YMD ??
            item.drug_TRTM_YMD ??
            item.PRSC_YMD ??
            item.diagSdate ??
            item.medicationDate
        ) || null,
      period:
        pickFirstText(
          item.dosageDay ??
            item.period ??
            item.takeDay ??
            item.dayCount ??
            item.admDay ??
            item.medCnt ??
            item.presCnt ??
            item.detail_DOSAGE_DAY ??
            item.drug_DOSAGE_DAY
        ) || null,
      hospitalName:
        pickFirstText(
          item.pharmNm ??
          item.hospitalNm ??
            item.hospitalName ??
            item.hospital ??
            item.clinicName ??
            item.hspNm ??
            item.detail_HSP_NM ??
            item.drug_HSP_NM ??
            item.HSP_NM ??
            item.clinicNm
        ) || null,
    }))
    .filter((item) => item.medicationName);

  let status = resolveMedicationStatus(input);
  if (status === "available" && recent.length === 0) {
    status = "none";
  }
  const cautions: string[] = [];
  for (const row of recent) {
    if (!row.medicationName) continue;
    const lowered = row.medicationName.toLowerCase();
    if (lowered.includes("steroid") || lowered.includes("스테로이드")) {
      cautions.push("스테로이드 계열 여부를 약사와 확인해 주세요.");
    }
    if (lowered.includes("혈압") || lowered.includes("고혈압")) {
      cautions.push("혈압약 복용 중에는 측정 시간을 일정하게 유지해 주세요.");
    }
  }

  const uniqueCautions = [...new Set(cautions)].slice(0, 3);
  const estimatedSymptoms = input.surveyTemplate
    ? (input.surveyResponse?.selectedSections || [])
        .slice(0, 3)
        .map((sectionKey) => resolveSectionTitle(input.surveyTemplate, sectionKey))
    : [];

  const medicationScore =
    status === "available" ? 100 : status === "none" ? 70 : status === "unknown" ? 55 : 35;

  return {
    status,
    recent,
    estimatedSymptoms,
    cautions: uniqueCautions,
    medicationScore,
  };
}
