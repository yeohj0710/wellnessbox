import type {
  WellnessReportTexts,
  WellnessScoringRules,
} from "@/lib/wellness/data-loader";

type QuestionScoreMap = Record<string, number | null>;

export type SupplementDesignItem = {
  sectionId: string;
  title: string;
  paragraphs: string[];
};

function toQuestionId(prefix: "C" | "S", number: number) {
  return `${prefix}${String(number).padStart(2, "0")}`;
}

function nearEqual(left: number | null | undefined, right: number) {
  if (typeof left !== "number" || !Number.isFinite(left)) return false;
  return Math.abs(left - right) < 1e-9;
}

export function buildLifestyleRoutineAdvice(
  commonPerQuestionScores: QuestionScoreMap,
  reportTexts: WellnessReportTexts,
  rules: WellnessScoringRules
) {
  const [from, to] = rules.reportGeneration.lifestyleRoutine.questionRange;
  const primaryTarget = rules.reportGeneration.lifestyleRoutine.primaryScoreToInclude;
  const fallbackTarget = rules.reportGeneration.lifestyleRoutine.fallbackScoreToInclude;

  const orderedNumbers = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const primary = orderedNumbers.filter((questionNumber) =>
    nearEqual(commonPerQuestionScores[toQuestionId("C", questionNumber)], primaryTarget)
  );
  const fallback = orderedNumbers.filter((questionNumber) =>
    nearEqual(commonPerQuestionScores[toQuestionId("C", questionNumber)], fallbackTarget)
  );
  const selected = primary.length > 0 ? primary : fallback;

  return selected
    .map((questionNumber) =>
      reportTexts.lifestyleRoutineAdviceByCommonQuestionNumber[String(questionNumber)]
    )
    .filter((text): text is string => Boolean(text && text.trim()));
}

export function buildSectionAdvice(
  sectionId: string,
  perQuestionScores: QuestionScoreMap,
  reportTexts: WellnessReportTexts,
  rules: WellnessScoringRules
) {
  const threshold = rules.reportGeneration.sectionAnalysis.includeAdviceIfQuestionScoreGte;
  const sectionAdvice = reportTexts.sectionAnalysisAdvice[sectionId];
  if (!sectionAdvice) return [];

  const orderedQuestionNumbers = Object.keys(sectionAdvice.adviceByQuestionNumber)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  const result: Array<{ questionNumber: number; text: string }> = [];
  for (const questionNumber of orderedQuestionNumbers) {
    const questionId = `${sectionId}_Q${String(questionNumber).padStart(2, "0")}`;
    const score = perQuestionScores[questionId];
    if (typeof score !== "number" || score < threshold) continue;
    const text = sectionAdvice.adviceByQuestionNumber[String(questionNumber)];
    if (!text) continue;
    result.push({ questionNumber, text });
  }
  return result;
}

export function buildSupplementDesign(
  selectedSectionScores: Array<{ sectionId: string; score: number }>,
  reportTexts: WellnessReportTexts,
  rules: WellnessScoringRules
): SupplementDesignItem[] {
  const topN = rules.reportGeneration.supplementDesign.defaultTopN;
  return [...selectedSectionScores]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.sectionId.localeCompare(right.sectionId);
    })
    .slice(0, topN)
    .map((row) => {
      const text = reportTexts.supplementDesignTextBySectionId[row.sectionId];
      if (!text) return null;
      return {
        sectionId: row.sectionId,
        title: text.title,
        paragraphs: text.paragraphs,
      } satisfies SupplementDesignItem;
    })
    .filter((item): item is SupplementDesignItem => Boolean(item));
}

