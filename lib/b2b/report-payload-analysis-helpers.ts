import {
  asRecord,
  toText,
  type JsonRecord,
} from "@/lib/b2b/report-payload-shared";

export function extractAnalysisTopIssues(input: unknown) {
  return Array.isArray(input)
    ? input
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
    : [];
}

export function extractAnalysisSectionScores(input: unknown) {
  return Array.isArray(input)
    ? input
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
}

export function extractAnalysisCoreMetrics(input: unknown) {
  return Array.isArray(input)
    ? input
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
}

export function extractAnalysisHealthRiskFlags(input: unknown) {
  return Array.isArray(input)
    ? input
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
}

export function extractAnalysisTrendMonths(input: unknown) {
  return Array.isArray(input)
    ? input
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          periodKey: toText(item.periodKey) || "-",
          overallScore: typeof item.overallScore === "number" ? item.overallScore : 0,
          surveyScore: typeof item.surveyScore === "number" ? item.surveyScore : 0,
          healthScore: typeof item.healthScore === "number" ? item.healthScore : 0,
        }))
    : [];
}

export function extractAnalysisExternalCards(input: unknown) {
  return Array.isArray(input)
    ? input
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          key: toText(item.key) || "-",
          title: toText(item.title) || toText(item.key) || "-",
          value: toText(item.value) || "",
        }))
    : [];
}

export function extractTextArray(input: unknown) {
  return Array.isArray(input) ? input.map((item) => toText(item)).filter(Boolean) : [];
}
