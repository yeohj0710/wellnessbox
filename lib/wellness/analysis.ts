import {
  loadWellnessDataBundle,
  type WellnessCommonSurvey,
  type WellnessSectionSurvey,
} from "@/lib/wellness/data-loader";
import {
  buildLifestyleRoutineAdvice,
  buildSectionAdvice,
  buildSupplementDesign,
} from "@/lib/wellness/reportGenerator";
import {
  computeHealthScore,
  scoreCommon,
  scoreSections,
  type CommonAnswerMap,
  type SectionAnswerMapBySectionId,
  type WellnessAnswerValue,
} from "@/lib/wellness/scoring";

export type WellnessAnalysisAnswerRow = {
  questionKey: string;
  sectionKey: string | null;
  answerText: string | null;
  answerValue: string | null;
  score?: number | null;
  meta?: unknown;
};

export type WellnessAnalysisInput = {
  selectedSections: string[];
  answersJson: Record<string, unknown> | null;
  answers: WellnessAnalysisAnswerRow[];
};

export type WellnessComputedResult = {
  schemaVersion: string;
  selectedSections: string[];
  lifestyleRisk: {
    domainScoresNormalized: Record<string, number>;
    domainScoresPercent: Record<string, number>;
    domains: Array<{
      id: string;
      name: string;
      normalized: number;
      percent: number;
    }>;
    overallPercent: number;
  };
  healthManagementNeed: {
    sectionNeedPercentById: Record<string, number>;
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
  perQuestionScores: {
    common: Record<string, number | null>;
    sections: Record<string, Record<string, number | null>>;
  };
};

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeSelectedValues(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.map((item) => toText(item)).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,\n/|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseAnswerValue(raw: unknown): WellnessAnswerValue {
  if (raw == null) {
    return { answerText: null, answerValue: null, selectedValues: [] };
  }
  if (Array.isArray(raw)) {
    const selectedValues = normalizeSelectedValues(raw);
    return {
      answerText: selectedValues.join(", ") || null,
      answerValue: null,
      selectedValues,
    };
  }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    const text = toText(raw);
    return {
      answerText: text || null,
      answerValue: text || null,
      selectedValues: text ? [text] : [],
    };
  }

  const row = asRecord(raw);
  if (!row) {
    return { answerText: null, answerValue: null, selectedValues: [] };
  }

  const answerText = toText(row.answerText ?? row.text) || null;
  const answerValue = toText(row.answerValue ?? row.value) || null;
  const selectedValues = normalizeSelectedValues(row.selectedValues ?? row.values);
  const score =
    typeof row.score === "number" && Number.isFinite(row.score) ? row.score : null;
  const variantId = toText(row.variantId) || null;

  return {
    answerText,
    answerValue,
    selectedValues:
      selectedValues.length > 0
        ? selectedValues
        : answerValue
        ? [answerValue]
        : answerText
        ? [answerText]
        : [],
    score,
    variantId,
  };
}

function toAnswerValueFromRow(row: WellnessAnalysisAnswerRow): WellnessAnswerValue {
  const meta = asRecord(row.meta);
  const selectedValues = normalizeSelectedValues(meta?.selectedValues);
  const variantId = toText(meta?.variantId) || null;

  return {
    answerText: row.answerText ?? null,
    answerValue: row.answerValue ?? null,
    selectedValues:
      selectedValues.length > 0
        ? selectedValues
        : row.answerValue
        ? [row.answerValue]
        : row.answerText
        ? [row.answerText]
        : [],
    score: typeof row.score === "number" ? row.score : null,
    variantId,
  };
}

function buildQuestionAnswerMap(input: WellnessAnalysisInput) {
  const map = new Map<string, WellnessAnswerValue>();

  for (const [questionKey, rawValue] of Object.entries(input.answersJson ?? {})) {
    map.set(questionKey, parseAnswerValue(rawValue));
  }

  for (const row of input.answers) {
    if (!row.questionKey) continue;
    map.set(row.questionKey, toAnswerValueFromRow(row));
  }

  return map;
}

function deriveSelectedSections(
  selectedSections: string[],
  commonDef: WellnessCommonSurvey,
  questionAnswers: Map<string, WellnessAnswerValue>
) {
  const selected = new Set(selectedSections.filter(Boolean));
  const c27 = commonDef.questions.find((question) => question.id === "C27");
  const c27Answer = questionAnswers.get("C27");
  for (const token of c27Answer?.selectedValues ?? []) {
    const normalized = token.trim().toLowerCase();
    if (!normalized) continue;
    const matched = c27?.options?.find((option) => {
      if (option.value.toLowerCase() === normalized) return true;
      if (option.label.toLowerCase() === normalized) return true;
      return (option.aliases ?? []).some(
        (alias) => alias.trim().toLowerCase() === normalized
      );
    });
    if (matched) selected.add(matched.value);
  }

  const maxSelected = c27?.constraints?.maxSelections ?? 5;
  return [...selected].slice(0, maxSelected);
}

function buildCommonAnswerMap(
  commonDef: WellnessCommonSurvey,
  questionAnswers: Map<string, WellnessAnswerValue>
): CommonAnswerMap {
  const commonAnswers: CommonAnswerMap = {};
  for (const question of commonDef.questions) {
    commonAnswers[question.id] = questionAnswers.get(question.id) ?? null;
  }
  return commonAnswers;
}

function buildSectionAnswerMap(
  sectionsDef: WellnessSectionSurvey,
  selectedSections: string[],
  questionAnswers: Map<string, WellnessAnswerValue>
): SectionAnswerMapBySectionId {
  const selectedSet = new Set(selectedSections);
  const answerMap: SectionAnswerMapBySectionId = {};

  for (const section of sectionsDef.sections) {
    if (!selectedSet.has(section.id)) continue;
    answerMap[section.id] = {};
    for (const question of section.questions) {
      answerMap[section.id][question.id] = questionAnswers.get(question.id) ?? null;
    }
  }
  return answerMap;
}

export function computeWellnessResult(input: WellnessAnalysisInput): WellnessComputedResult {
  const { common, sections, rules, texts } = loadWellnessDataBundle();
  const questionAnswers = buildQuestionAnswerMap(input);
  const selectedSections = deriveSelectedSections(input.selectedSections, common, questionAnswers);

  const commonAnswers = buildCommonAnswerMap(common, questionAnswers);
  const sectionAnswersBySectionId = buildSectionAnswerMap(
    sections,
    selectedSections,
    questionAnswers
  );

  const commonScoring = scoreCommon(commonAnswers, rules, common);
  const sectionScoring = scoreSections(sectionAnswersBySectionId, rules, sections);
  const overallHealthScore = computeHealthScore(
    commonScoring.overallPercent,
    sectionScoring.averagePercent,
    rules
  );

  const domains = rules.lifestyleRisk.domains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    normalized: commonScoring.domainScoresNormalized[domain.id] ?? 0,
    percent: commonScoring.domainScoresPercent[domain.id] ?? 0,
  }));

  const sectionNeedRows = selectedSections
    .map((sectionId) => {
      const section = sections.sections.find((item) => item.id === sectionId);
      return {
        sectionId,
        sectionTitle: section?.title ?? sectionId,
        percent: sectionScoring.sectionNeedPercentById[sectionId] ?? 0,
      };
    })
    .sort((left, right) => {
      if (right.percent !== left.percent) return right.percent - left.percent;
      return left.sectionId.localeCompare(right.sectionId);
    });

  const sectionAdvice = Object.fromEntries(
    selectedSections.map((sectionId) => {
      const section = sections.sections.find((item) => item.id === sectionId);
      const sectionQuestionScores = sectionScoring.perQuestionScores[sectionId] ?? {};
      return [
        sectionId,
        {
          sectionTitle: section?.title ?? sectionId,
          items: buildSectionAdvice(sectionId, sectionQuestionScores, texts, rules),
        },
      ];
    })
  );

  const supplementDesign = buildSupplementDesign(
    sectionNeedRows.map((row) => ({
      sectionId: row.sectionId,
      score: row.percent,
    })),
    texts,
    rules
  );

  return {
    schemaVersion: "wellness-score-v1",
    selectedSections,
    lifestyleRisk: {
      domainScoresNormalized: commonScoring.domainScoresNormalized,
      domainScoresPercent: commonScoring.domainScoresPercent,
      domains,
      overallPercent: commonScoring.overallPercent,
    },
    healthManagementNeed: {
      sectionNeedPercentById: sectionScoring.sectionNeedPercentById,
      sections: sectionNeedRows,
      averagePercent: sectionScoring.averagePercent,
    },
    overallHealthScore,
    sectionAdvice,
    lifestyleRoutineAdvice: buildLifestyleRoutineAdvice(
      commonScoring.perQuestionScores,
      texts,
      rules
    ),
    supplementDesign,
    perQuestionScores: {
      common: commonScoring.perQuestionScores,
      sections: sectionScoring.perQuestionScores,
    },
  };
}

