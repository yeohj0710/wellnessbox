import {
  asRecord,
  toText,
  type JsonRecord,
} from "@/lib/b2b/report-payload-shared";

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
            score:
              typeof item.score === "number"
                ? item.score
                : Number.parseFloat(toText(item.score) || "0"),
            text: toText(item.text),
          }))
          .filter(
            (item) =>
              Number.isFinite(item.questionNumber) &&
              Number.isFinite(item.score) &&
              Boolean(item.text)
          )
          .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            return left.questionNumber - right.questionNumber;
          })
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

function extractWellnessHighRiskHighlights(payload: unknown) {
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) => ({
      category:
        toText(item.category) === "detailed" ||
        toText(item.category) === "common" ||
        toText(item.category) === "domain" ||
        toText(item.category) === "section"
          ? (toText(item.category) as "detailed" | "common" | "domain" | "section")
          : "common",
      title: toText(item.title) || "-",
      score:
        typeof item.score === "number"
          ? item.score
          : Number(toText(item.score) || 0),
      action: toText(item.action) || "",
      questionNumber:
        typeof item.questionNumber === "number"
          ? item.questionNumber
          : Number.parseInt(toText(item.questionNumber), 10) || undefined,
      sectionId: toText(item.sectionId) || undefined,
    }))
    .filter((item) => Boolean(item.title) && Number.isFinite(item.score));
}

export function extractWellness(payload: unknown) {
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
    highRiskHighlights: extractWellnessHighRiskHighlights(wellness.highRiskHighlights),
    lifestyleRoutineAdvice: Array.isArray(wellness.lifestyleRoutineAdvice)
      ? wellness.lifestyleRoutineAdvice
          .map((item) => toText(item))
          .filter(Boolean)
      : [],
    supplementDesign,
    perQuestionScores: asRecord(wellness.perQuestionScores) ?? {},
  };
}
