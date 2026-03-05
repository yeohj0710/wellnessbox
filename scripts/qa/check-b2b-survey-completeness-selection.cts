import {
  compareSurveyResponseCompleteness,
  pickMostCompleteSurveyResponse,
  type SurveyResponseCompletenessRow,
} from "../../lib/b2b/survey-response-completeness";

type MockAnswer = { sectionKey?: string | null };

type MockRow = SurveyResponseCompletenessRow<MockAnswer> & {
  id: string;
};

function row(input: {
  id: string;
  answerCount: number;
  sectionAnswerCount: number;
  selectedSections: number;
  updatedAt: string;
}) {
  const answers: MockAnswer[] = [];
  for (let index = 0; index < input.answerCount; index += 1) {
    answers.push({
      sectionKey: index < input.sectionAnswerCount ? `S${index + 1}` : null,
    });
  }

  return {
    id: input.id,
    answers,
    selectedSections: Array.from({ length: input.selectedSections }, (_, index) => `sec-${index}`),
    updatedAt: new Date(input.updatedAt),
  } satisfies MockRow;
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (expected=${String(expected)}, actual=${String(actual)})`);
  }
}

function runComparatorChecks() {
  const dense = row({
    id: "dense",
    answerCount: 60,
    sectionAnswerCount: 32,
    selectedSections: 4,
    updatedAt: "2026-03-05T10:00:00.000Z",
  });
  const recentButSparse = row({
    id: "recent-sparse",
    answerCount: 20,
    sectionAnswerCount: 0,
    selectedSections: 0,
    updatedAt: "2026-03-05T11:00:00.000Z",
  });
  assertEqual(
    compareSurveyResponseCompleteness(dense, recentButSparse) < 0,
    true,
    "answerCount 우선순위가 최신 시간보다 우선해야 합니다"
  );

  const moreSectionAnswers = row({
    id: "sec-high",
    answerCount: 30,
    sectionAnswerCount: 10,
    selectedSections: 1,
    updatedAt: "2026-03-05T09:00:00.000Z",
  });
  const fewerSectionAnswers = row({
    id: "sec-low",
    answerCount: 30,
    sectionAnswerCount: 3,
    selectedSections: 4,
    updatedAt: "2026-03-05T11:00:00.000Z",
  });
  assertEqual(
    compareSurveyResponseCompleteness(moreSectionAnswers, fewerSectionAnswers) < 0,
    true,
    "sectionAnswerCount 우선순위가 selectedSections/updatedAt보다 우선해야 합니다"
  );

  const moreSelectedSections = row({
    id: "selected-high",
    answerCount: 30,
    sectionAnswerCount: 5,
    selectedSections: 4,
    updatedAt: "2026-03-05T09:00:00.000Z",
  });
  const fewerSelectedSections = row({
    id: "selected-low",
    answerCount: 30,
    sectionAnswerCount: 5,
    selectedSections: 1,
    updatedAt: "2026-03-05T11:00:00.000Z",
  });
  assertEqual(
    compareSurveyResponseCompleteness(moreSelectedSections, fewerSelectedSections) < 0,
    true,
    "selectedSections 우선순위가 updatedAt보다 우선해야 합니다"
  );

  const older = row({
    id: "older",
    answerCount: 30,
    sectionAnswerCount: 5,
    selectedSections: 2,
    updatedAt: "2026-03-05T08:00:00.000Z",
  });
  const newer = row({
    id: "newer",
    answerCount: 30,
    sectionAnswerCount: 5,
    selectedSections: 2,
    updatedAt: "2026-03-05T10:00:00.000Z",
  });
  assertEqual(
    compareSurveyResponseCompleteness(newer, older) < 0,
    true,
    "동률일 때는 최신 updatedAt이 우선해야 합니다"
  );
}

function runPickerChecks() {
  const rows: MockRow[] = [
    row({
      id: "latest-short",
      answerCount: 21,
      sectionAnswerCount: 0,
      selectedSections: 0,
      updatedAt: "2026-03-05T10:45:19.000Z",
    }),
    row({
      id: "older-complete",
      answerCount: 65,
      sectionAnswerCount: 42,
      selectedSections: 4,
      updatedAt: "2026-03-04T13:48:44.000Z",
    }),
    row({
      id: "mid",
      answerCount: 42,
      sectionAnswerCount: 21,
      selectedSections: 2,
      updatedAt: "2026-03-05T08:08:44.000Z",
    }),
  ];

  const picked = pickMostCompleteSurveyResponse(rows);
  assertEqual(picked?.id, "older-complete", "완성도 높은 제출본이 우선 선택되어야 합니다");
}

runComparatorChecks();
runPickerChecks();
console.log("[qa:b2b:survey-completeness] passed");
