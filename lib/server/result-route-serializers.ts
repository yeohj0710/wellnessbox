import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";

type SerializerOptions = {
  includeNormalized?: boolean;
};

function resolveAssessmentAnswerLabel(question: any, value: unknown) {
  if (question?.type === "choice" && question.options) {
    const option = question.options.find((item: any) => item.value === value);
    return option?.label ?? String(value);
  }
  if (question?.type === "multi" && Array.isArray(value) && question.options) {
    return value
      .map(
        (item) =>
          question.options?.find((option: any) => option.value === item)?.label ??
          String(item)
      )
      .join(", ");
  }
  return String(value);
}

export function serializeAssessmentResultForRoute(
  assessmentResult: any,
  options: SerializerOptions = {}
) {
  if (!assessmentResult) return null;

  const normalized = normalizeAssessmentResult(assessmentResult);
  const payload = {
    ...assessmentResult,
    answersDetailed: Object.entries(assessmentResult.answers || {}).map(
      ([id, value]) => {
        const question = normalized.questions.find((item) => item.id === id);
        return {
          id,
          question: question?.text ?? id,
          value,
          answerLabel: resolveAssessmentAnswerLabel(question, value),
        };
      }
    ),
  };

  if (options.includeNormalized) {
    return {
      ...payload,
      normalized,
    };
  }

  return payload;
}

export function serializeCheckAiResultForRoute(
  checkAiResult: any,
  options: SerializerOptions = {}
) {
  if (!checkAiResult) return null;

  const normalized = normalizeCheckAiResult(checkAiResult);
  const payload = {
    ...checkAiResult,
    answersDetailed: Array.isArray(checkAiResult.answers)
      ? checkAiResult.answers.map((value: unknown, index: number) => {
          const question = normalized.questions[index];
          const option = normalized.options.find((item) => item.value === value);
          return {
            index,
            question: question?.text ?? String(index + 1),
            value,
            answerLabel: option?.label ?? String(value),
          };
        })
      : [],
  };

  if (options.includeNormalized) {
    return {
      ...payload,
      normalized,
    };
  }

  return payload;
}
