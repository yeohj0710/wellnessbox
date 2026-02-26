import "server-only";

import type { B2bSurveyTemplateSchema } from "@/lib/b2b/survey-template";
import { comparePeriodKeyDesc, normalizePeriodKey } from "@/lib/b2b/period";

type SurveyAnswerRow = {
  questionKey: string;
  sectionKey: string | null;
  answerText: string | null;
  answerValue: string | null;
  score?: number | null;
};

type SurveyResponseInput = {
  selectedSections: string[];
  answersJson: Record<string, unknown> | null;
  answers: SurveyAnswerRow[];
  updatedAt?: Date | string | null;
};

type HealthSnapshotInput = {
  normalizedJson: unknown;
  rawJson: unknown;
  sourceMode: string | null;
  fetchedAt?: Date | string | null;
};

type PharmacistNoteInput = {
  note: string | null;
  recommendations: string | null;
  cautions: string | null;
  updatedAt?: Date | string | null;
};

type HistoricalAnalysisInput = {
  periodKey: string;
  payload: unknown;
  computedAt?: Date | string | null;
};

export type B2bAiEvaluation = {
  generatedAt: string;
  model: string;
  summary: string;
  monthlyGuide: string;
  actionItems: string[];
  caution: string;
};

export type B2bAnalyzerInput = {
  periodKey: string;
  surveyTemplate: B2bSurveyTemplateSchema | null;
  surveyResponse: SurveyResponseInput | null;
  healthSnapshot: HealthSnapshotInput | null;
  pharmacistNote: PharmacistNoteInput | null;
  externalAnalysisPayload?: unknown;
  aiEvaluation?: B2bAiEvaluation | null;
  historicalAnalyses?: HistoricalAnalysisInput[];
};

type SectionScore = {
  sectionKey: string;
  sectionTitle: string;
  score: number;
  answeredCount: number;
  questionCount: number;
};

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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
  if (digits.length >= 4) {
    const score = Number(`${digits.slice(0, 4)}0101`);
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

function resolveMedicationList(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medicationRaw = normalized?.medication;
  if (Array.isArray(medicationRaw)) {
    return medicationRaw
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }
  const medication = asRecord(medicationRaw);
  const list = asArray(
    medication?.list ?? medication?.rows ?? medication?.items ?? medication?.history
  );
  return list
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function splitTextList(value: string | null | undefined, max = 5) {
  if (!value) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of value.split(/[\n,;|]/g).map((item) => item.trim())) {
    if (!token) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= max) break;
  }
  return out;
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildAnswerMap(input: SurveyResponseInput | null) {
  const map = new Map<
    string,
    { answerText: string | null; answerValue: string | null; score?: number | null }
  >();
  if (!input) return map;

  const answersJson = input.answersJson || {};
  for (const [questionKey, value] of Object.entries(answersJson)) {
    if (!questionKey) continue;
    if (typeof value === "object" && value !== null) {
      const record = value as Record<string, unknown>;
      const answerText = toText(record.answerText ?? record.text) || null;
      const answerValue = toText(record.answerValue ?? record.value) || null;
      const score =
        typeof record.score === "number" && Number.isFinite(record.score)
          ? record.score
          : null;
      map.set(questionKey, { answerText, answerValue, score });
      continue;
    }
    const text = toText(value);
    map.set(questionKey, { answerText: text || null, answerValue: text || null });
  }

  for (const answer of input.answers) {
    map.set(answer.questionKey, {
      answerText: answer.answerText,
      answerValue: answer.answerValue,
      score: typeof answer.score === "number" ? answer.score : null,
    });
  }

  return map;
}

function resolveSectionTitle(template: B2bSurveyTemplateSchema | null, sectionKey: string) {
  if (!template) return sectionKey;
  const catalog = template.sectionCatalog.find((section) => section.key === sectionKey);
  if (catalog?.displayName) return catalog.displayName;
  if (catalog?.title) return catalog.title;
  const section = template.sections.find((item) => item.key === sectionKey);
  if (section?.displayName) return section.displayName;
  if (section?.title) return section.title;
  return sectionKey;
}

function resolveOptionScore(
  question: {
    options?: Array<string | { label?: string; value?: string; score?: number }>;
  },
  answerText: string | null,
  answerValue: string | null,
  fallbackScore?: number | null
) {
  if (typeof fallbackScore === "number" && Number.isFinite(fallbackScore)) {
    return fallbackScore;
  }

  const normalizedValue = toText(answerValue).toLowerCase();
  const normalizedText = toText(answerText).toLowerCase();
  for (const option of question.options || []) {
    if (typeof option === "string") continue;
    const value = toText(option.value).toLowerCase();
    const label = toText(option.label).toLowerCase();
    const matched =
      (normalizedValue && (normalizedValue === value || normalizedValue === label)) ||
      (normalizedText && (normalizedText === value || normalizedText === label));
    if (!matched) continue;
    if (typeof option.score === "number" && Number.isFinite(option.score)) {
      return option.score;
    }
  }
  return null;
}

function toScore100(rawScore: number | null) {
  if (rawScore == null) return null;
  return clampScore(rawScore * 100);
}

function computeSurvey(input: B2bAnalyzerInput) {
  const template = input.surveyTemplate;
  const answerMap = buildAnswerMap(input.surveyResponse);
  const selectedSections = input.surveyResponse?.selectedSections.filter(Boolean) ?? [];
  const selectedSet = new Set(selectedSections);

  const sectionScores: SectionScore[] = [];
  let scoredQuestionCount = 0;
  let totalScoredValue = 0;

  if (template) {
    for (const section of template.sections) {
      if (!selectedSet.has(section.key)) continue;
      let sectionScoreSum = 0;
      let sectionScoreCount = 0;
      let answeredCount = 0;

      for (const question of section.questions) {
        const answer = answerMap.get(question.key);
        if (!answer) continue;
        if (answer.answerText || answer.answerValue) answeredCount += 1;

        const rawScore = resolveOptionScore(
          question as {
            options?: Array<string | { label?: string; value?: string; score?: number }>;
          },
          answer.answerText,
          answer.answerValue,
          answer.score
        );
        const score100 = toScore100(rawScore);
        if (score100 == null) continue;

        sectionScoreSum += score100;
        sectionScoreCount += 1;
        scoredQuestionCount += 1;
        totalScoredValue += score100;
      }

      const average =
        sectionScoreCount > 0 ? clampScore(sectionScoreSum / sectionScoreCount) : 0;
      sectionScores.push({
        sectionKey: section.key,
        sectionTitle: resolveSectionTitle(template, section.key),
        score: average,
        answeredCount,
        questionCount: section.questions.length,
      });
    }
  }

  const overallScore =
    scoredQuestionCount > 0 ? clampScore(totalScoredValue / scoredQuestionCount) : 0;
  const sortedSectionScores = [...sectionScores].sort((left, right) => left.score - right.score);
  const topIssues = sortedSectionScores.slice(0, 3).map((item) => ({
    sectionKey: item.sectionKey,
    title: item.sectionTitle,
    score: item.score,
  }));

  const answeredQuestionCount = [...answerMap.values()].filter(
    (answer) => Boolean(answer.answerText || answer.answerValue)
  ).length;
  const commonQuestionCount = template?.common.length ?? 0;
  const selectedSectionQuestionCount = template
    ? template.sections
        .filter((section) => selectedSet.has(section.key))
        .reduce((sum, section) => sum + section.questions.length, 0)
    : 0;

  return {
    selectedSections,
    commonQuestionCount,
    selectedSectionQuestionCount,
    answeredQuestionCount,
    scoredQuestionCount,
    sectionScores: sortedSectionScores,
    overallScore,
    topIssues,
  };
}

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

function buildHealth(input: B2bAnalyzerInput) {
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

function buildMedication(input: B2bAnalyzerInput) {
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
      medicationName: toText(
        item.medicineNm ??
          item.medicine ??
          item.drugName ??
          item.drugNm ??
          item.medNm ??
          item.medicineName ??
          item.prodName ??
          item.drug_MEDI_PRDC_NM ??
          item.MEDI_PRDC_NM ??
          item.detail_CMPN_NM ??
          item.CMPN_NM
      ),
      date:
        toText(
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
            item.medicationDate
        ) || null,
      period:
        toText(
          item.dosageDay ??
            item.period ??
            item.takeDay ??
            item.dayCount ??
            item.detail_DOSAGE_DAY ??
            item.drug_DOSAGE_DAY
        ) || null,
      hospitalName:
        toText(
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

  const status = resolveMedicationStatus(input);
  const cautions: string[] = [];
  for (const row of recent) {
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

function buildPharmacist(input: B2bAnalyzerInput) {
  const note = input.pharmacistNote;
  const summarySource = toText(note?.note) || "약사 코멘트가 아직 입력되지 않았습니다.";
  const summary = summarySource.length > 140 ? `${summarySource.slice(0, 139)}…` : summarySource;
  const recommendations = splitTextList(note?.recommendations, 4);
  const cautions = splitTextList(note?.cautions, 4);
  const dosingGuide =
    splitTextList(note?.note, 2).find((line) => /복용|식전|식후|취침|아침|저녁/i.test(line)) ||
    "복용 시간과 방법은 제품 라벨 및 약사 안내를 기준으로 지켜 주세요.";

  return {
    summary,
    recommendations,
    cautions,
    dosingGuide,
    updatedAt: formatDateTime(note?.updatedAt) ?? null,
  };
}

function summarizeExternalAnalysis(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { cards: [], raw: payload ?? null };
  }
  const record = payload as Record<string, unknown>;
  const cards = Object.entries(record)
    .slice(0, 8)
    .map(([key, value]) => {
      const text =
        typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
      return {
        key,
        title: key,
        value: text.length > 180 ? `${text.slice(0, 179)}…` : text,
      };
    });
  return { cards, raw: payload };
}

function extractHistoricalScores(payload: unknown) {
  const record = asRecord(payload);
  if (!record) return null;
  const summary = asRecord(record.summary);
  const survey = asRecord(record.survey);
  const health = asRecord(record.health);

  const overallScore = toNumber(summary?.overallScore);
  const surveyScore = toNumber(survey?.overallScore);
  const healthScore = toNumber(health?.healthScore);
  if (overallScore == null && surveyScore == null && healthScore == null) return null;

  return {
    overallScore: overallScore ?? 0,
    surveyScore: surveyScore ?? 0,
    healthScore: healthScore ?? 0,
  };
}

function buildTrend(input: {
  periodKey: string;
  overallScore: number;
  surveyScore: number;
  healthScore: number;
  historicalAnalyses: HistoricalAnalysisInput[];
}) {
  const rows = input.historicalAnalyses
    .map((item) => {
      const periodKey = normalizePeriodKey(item.periodKey);
      if (!periodKey) return null;
      const scores = extractHistoricalScores(item.payload);
      if (!scores) return null;
      return { periodKey, ...scores };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  rows.push({
    periodKey: input.periodKey,
    overallScore: input.overallScore,
    surveyScore: input.surveyScore,
    healthScore: input.healthScore,
  });

  const byPeriod = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byPeriod.has(row.periodKey)) byPeriod.set(row.periodKey, row);
  }

  const months = [...byPeriod.values()]
    .sort((left, right) => comparePeriodKeyDesc(left.periodKey, right.periodKey))
    .slice(0, 6)
    .reverse();

  return { months };
}

function riskLevelFromOverallScore(score: number) {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

export type B2bComputedAnalysis = ReturnType<typeof analyzeB2bReport>;

export function analyzeB2bReport(input: B2bAnalyzerInput) {
  const nowIso = new Date().toISOString();
  const survey = computeSurvey(input);
  const health = buildHealth(input);
  const medication = buildMedication(input);
  const pharmacist = buildPharmacist(input);
  const externalAnalysis = summarizeExternalAnalysis(input.externalAnalysisPayload);

  const overallScore = clampScore(
    survey.overallScore * 0.5 + health.healthScore * 0.35 + medication.medicationScore * 0.15
  );
  const riskLevel = riskLevelFromOverallScore(overallScore);

  const riskFlags = [
    ...health.riskFlags.map((item) => item.reason),
    ...survey.topIssues.map((item) => `${item.title} 영역 점수가 낮습니다.`),
  ].slice(0, 5);

  const recommendations = [
    ...pharmacist.recommendations,
    ...survey.topIssues.map(
      (item) => `${item.title} 관련 생활습관 실천 목표를 이번 달 우선순위로 설정해 주세요.`
    ),
    ...health.riskFlags.map((item) => `${item.label} 지표를 다음 검진까지 추적해 주세요.`),
  ]
    .filter(Boolean)
    .slice(0, 6);

  const trend = buildTrend({
    periodKey: input.periodKey,
    overallScore,
    surveyScore: survey.overallScore,
    healthScore: health.healthScore,
    historicalAnalyses: input.historicalAnalyses || [],
  });

  return {
    schemaVersion: "b2b-analysis-v1",
    periodKey: input.periodKey,
    computedAt: nowIso,
    summary: {
      overallScore,
      surveyScore: survey.overallScore,
      healthScore: health.healthScore,
      medicationScore: medication.medicationScore,
      riskLevel,
      topIssues: survey.topIssues,
    },
    survey,
    health,
    medication,
    pharmacist,
    externalAnalysis,
    aiEvaluation: input.aiEvaluation || null,
    trend,
    riskFlags,
    recommendations,
  };
}
