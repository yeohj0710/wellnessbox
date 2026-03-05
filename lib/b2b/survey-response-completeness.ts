export type SurveyResponseCompletenessAnswer = {
  sectionKey?: string | null;
};

export type SurveyResponseCompletenessRow<
  TAnswer extends SurveyResponseCompletenessAnswer = SurveyResponseCompletenessAnswer,
> = {
  answers: TAnswer[];
  selectedSections?: string[] | null;
  updatedAt: Date;
};

export function countSectionAnswers<
  TAnswer extends SurveyResponseCompletenessAnswer,
>(response: SurveyResponseCompletenessRow<TAnswer>) {
  return response.answers.filter((answer) => Boolean(answer.sectionKey)).length;
}

export function compareSurveyResponseCompleteness<
  TAnswer extends SurveyResponseCompletenessAnswer,
>(
  left: SurveyResponseCompletenessRow<TAnswer>,
  right: SurveyResponseCompletenessRow<TAnswer>
) {
  if (right.answers.length !== left.answers.length) {
    return right.answers.length - left.answers.length;
  }

  const leftSectionAnswerCount = countSectionAnswers(left);
  const rightSectionAnswerCount = countSectionAnswers(right);
  if (rightSectionAnswerCount !== leftSectionAnswerCount) {
    return rightSectionAnswerCount - leftSectionAnswerCount;
  }

  const leftSelectedSectionCount = left.selectedSections?.length ?? 0;
  const rightSelectedSectionCount = right.selectedSections?.length ?? 0;
  if (rightSelectedSectionCount !== leftSelectedSectionCount) {
    return rightSelectedSectionCount - leftSelectedSectionCount;
  }

  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

export function pickMostCompleteSurveyResponse<
  TAnswer extends SurveyResponseCompletenessAnswer,
  TRow extends SurveyResponseCompletenessRow<TAnswer>,
>(rows: TRow[]) {
  if (rows.length === 0) return null;
  return [...rows].sort(compareSurveyResponseCompleteness)[0] ?? null;
}
