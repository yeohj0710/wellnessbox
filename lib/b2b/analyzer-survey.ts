import "server-only";

import type { B2bSurveyTemplateSchema } from "@/lib/b2b/survey-template";
import type { B2bAnalyzerInput } from "@/lib/b2b/analyzer";
import { clampScore, toText } from "@/lib/b2b/analyzer-helpers";

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

type SectionScore = {
  sectionKey: string;
  sectionTitle: string;
  score: number;
  answeredCount: number;
  questionCount: number;
};

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

export function resolveSectionTitle(template: B2bSurveyTemplateSchema | null, sectionKey: string) {
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

export function computeSurvey(input: B2bAnalyzerInput) {
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
