import type {
  WellnessCommonSurvey,
  WellnessScoringRules,
  WellnessSectionSurvey,
} from "@/lib/wellness/data-loader";

export type WellnessAnswerValue = {
  answerText?: string | null;
  answerValue?: string | null;
  selectedValues?: string[];
  score?: number | null;
  variantId?: string | null;
};

export type CommonAnswerMap = Record<string, WellnessAnswerValue | null | undefined>;
export type SectionAnswerMapBySectionId = Record<
  string,
  Record<string, WellnessAnswerValue | null | undefined>
>;

export type ScoreCommonResult = {
  domainScoresNormalized: Record<string, number>;
  domainScoresPercent: Record<string, number>;
  overallNormalized: number;
  overallPercent: number;
  perQuestionScores: Record<string, number | null>;
};

export type ScoreSectionsResult = {
  sectionNeedNormalizedById: Record<string, number>;
  sectionNeedPercentById: Record<string, number>;
  averageNormalized: number;
  averagePercent: number;
  perQuestionScores: Record<string, Record<string, number | null>>;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clamp100(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function rounded(value: number, digits = 4) {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function normalizeOptionToken(token: string) {
  return token.trim().toLowerCase();
}

function collectAnswerTokens(answer: WellnessAnswerValue | null | undefined) {
  const tokens = new Set<string>();
  if (!answer) return tokens;
  for (const value of answer.selectedValues ?? []) {
    const normalized = normalizeOptionToken(String(value));
    if (normalized) tokens.add(normalized);
  }
  if (answer.answerValue) {
    const normalized = normalizeOptionToken(String(answer.answerValue));
    if (normalized) tokens.add(normalized);
  }
  if (answer.answerText) {
    const normalized = normalizeOptionToken(String(answer.answerText));
    if (normalized) tokens.add(normalized);
  }
  return tokens;
}

function scoreFromQuestionOptions(
  answer: WellnessAnswerValue | null | undefined,
  options: Array<{ value: string; label: string; score?: number }>,
  variants?: Record<
    string,
    {
      options: Array<{ value: string; label: string; score?: number }>;
    }
  >
) {
  if (!answer) return null;
  if (typeof answer.score === "number" && Number.isFinite(answer.score)) {
    return clamp01(answer.score);
  }
  if (!Array.isArray(options) || options.length === 0) return null;
  const variantOptions =
    answer.variantId &&
    variants &&
    variants[answer.variantId] &&
    Array.isArray(variants[answer.variantId].options)
      ? variants[answer.variantId].options
      : null;
  const sourceOptions = variantOptions && variantOptions.length > 0 ? variantOptions : options;
  const tokens = collectAnswerTokens(answer);
  if (tokens.size === 0) return null;

  const matchedScores: number[] = [];
  for (const option of sourceOptions) {
    if (typeof option.score !== "number" || !Number.isFinite(option.score)) continue;
    const valueToken = normalizeOptionToken(option.value);
    const labelToken = normalizeOptionToken(option.label);
    if (tokens.has(valueToken) || tokens.has(labelToken)) {
      matchedScores.push(clamp01(option.score));
    }
  }

  if (matchedScores.length === 0 && sourceOptions !== options) {
    for (const option of options) {
      if (typeof option.score !== "number" || !Number.isFinite(option.score)) continue;
      const valueToken = normalizeOptionToken(option.value);
      const labelToken = normalizeOptionToken(option.label);
      if (tokens.has(valueToken) || tokens.has(labelToken)) {
        matchedScores.push(clamp01(option.score));
      }
    }
  }

  if (matchedScores.length === 0) return null;
  const avg = matchedScores.reduce((sum, score) => sum + score, 0) / matchedScores.length;
  return rounded(avg);
}

export function scoreCommon(
  commonAnswers: CommonAnswerMap,
  rules: WellnessScoringRules,
  commonDef: WellnessCommonSurvey
): ScoreCommonResult {
  const perQuestionScores: Record<string, number | null> = {};

  for (const question of commonDef.questions) {
    const answer = commonAnswers[question.id];
    const score = scoreFromQuestionOptions(answer, question.options ?? []);
    perQuestionScores[question.id] = score;
  }

  const domainScoresNormalized: Record<string, number> = {};
  const domainScoresPercent: Record<string, number> = {};
  const transformFactor = rules.lifestyleRisk.overall.percentTransform?.factor ?? 100;

  for (const domain of rules.lifestyleRisk.domains) {
    const denominator = domain.calc.divideBy ?? (domain.questionIds.length || 1);
    const sum = domain.questionIds.reduce((acc, questionId) => {
      const score = perQuestionScores[questionId];
      return acc + (typeof score === "number" ? score : 0);
    }, 0);
    const normalized = rounded(clamp01(sum / denominator));
    domainScoresNormalized[domain.id] = normalized;
    domainScoresPercent[domain.id] = rounded(clamp100(normalized * transformFactor), 2);
  }

  const domainValues = Object.values(domainScoresNormalized);
  const overallNormalized =
    domainValues.length > 0
      ? rounded(
          clamp01(domainValues.reduce((sum, value) => sum + value, 0) / domainValues.length)
        )
      : 0;
  const overallPercent = rounded(clamp100(overallNormalized * transformFactor), 2);

  return {
    domainScoresNormalized,
    domainScoresPercent,
    overallNormalized,
    overallPercent,
    perQuestionScores,
  };
}

export function scoreSections(
  sectionAnswersBySectionId: SectionAnswerMapBySectionId,
  rules: WellnessScoringRules,
  sectionsDef: WellnessSectionSurvey
): ScoreSectionsResult {
  const sectionNeedNormalizedById: Record<string, number> = {};
  const sectionNeedPercentById: Record<string, number> = {};
  const perQuestionScores: Record<string, Record<string, number | null>> = {};
  const transformFactor =
    rules.healthManagementNeed.sectionScore.percentTransform?.factor ??
    rules.healthManagementNeed.overallAverage.percentTransform?.factor ??
    100;

  const selectedSectionIds = Object.keys(sectionAnswersBySectionId);

  for (const sectionId of selectedSectionIds) {
    const section = sectionsDef.sections.find((item) => item.id === sectionId);
    if (!section) continue;
    const answerMap = sectionAnswersBySectionId[sectionId] ?? {};
    const sectionQuestionScores: Record<string, number | null> = {};
    let scoreSum = 0;

    for (const question of section.questions) {
      const answer = answerMap[question.id];
      const score = scoreFromQuestionOptions(answer, question.options, question.variants);
      sectionQuestionScores[question.id] = score;
      scoreSum += typeof score === "number" ? score : 0;
    }

    const divisor = section.questions.length || 1;
    const normalized = rounded(clamp01(scoreSum / divisor));
    const percent = rounded(clamp100(normalized * transformFactor), 2);
    sectionNeedNormalizedById[sectionId] = normalized;
    sectionNeedPercentById[sectionId] = percent;
    perQuestionScores[sectionId] = sectionQuestionScores;
  }

  const sectionNormalizedValues = Object.values(sectionNeedNormalizedById);
  const averageNormalized =
    sectionNormalizedValues.length > 0
      ? rounded(
          clamp01(
            sectionNormalizedValues.reduce((sum, value) => sum + value, 0) /
              sectionNormalizedValues.length
          )
        )
      : 0;
  const averagePercent = rounded(clamp100(averageNormalized * transformFactor), 2);

  return {
    sectionNeedNormalizedById,
    sectionNeedPercentById,
    averageNormalized,
    averagePercent,
    perQuestionScores,
  };
}

export function computeHealthScore(
  lifestyleRiskPercent: number,
  healthManagementNeedAveragePercent: number,
  rules: WellnessScoringRules
) {
  const formula = rules.overallHealthScore.calc.formula;
  const evaluator = new Function(
    "lifestyleRiskPercent",
    "healthManagementNeedAveragePercent",
    `return ${formula};`
  ) as (lifestyle: number, healthNeed: number) => number;
  const raw = evaluator(lifestyleRiskPercent, healthManagementNeedAveragePercent);

  const [minValue, maxValue] = rules.overallHealthScore.calc.clampToRange ?? [0, 100];
  return rounded(Math.min(maxValue, Math.max(minValue, raw)), 2);
}
