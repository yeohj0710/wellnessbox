import {
  pruneSurveyAnswersByVisibility,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  type PublicSurveyAnswers,
} from "../../lib/b2b/public-survey";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "../../lib/wellness/data-template-types";
import {
  pruneSurveyAnswersForSelectedSections,
  resolveSurveySelectedSections,
} from "../../lib/b2b/survey-route-helpers";
import { deriveSelectedSections } from "../../lib/wellness/analysis-answer-maps";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function pickSampleAnswer(
  question: WellnessSurveyQuestionForTemplate,
  maxSelectedSections: number
) {
  if (question.type === "multi") {
    const first = question.options?.[0]?.value ?? "";
    return sanitizeSurveyAnswerValue(question, [first], maxSelectedSections);
  }
  if (question.type === "single") {
    const first = question.options?.[0]?.value ?? "";
    return sanitizeSurveyAnswerValue(question, first, maxSelectedSections);
  }
  if (question.type === "number") {
    return sanitizeSurveyAnswerValue(question, "1", maxSelectedSections);
  }
  if (question.type === "group") {
    const firstField = question.fields?.[0];
    if (!firstField) return sanitizeSurveyAnswerValue(question, "", maxSelectedSections);
    return sanitizeSurveyAnswerValue(
      question,
      { fieldValues: { [firstField.id]: "1" } },
      maxSelectedSections
    );
  }
  return sanitizeSurveyAnswerValue(question, "sample", maxSelectedSections);
}

function buildQuestionMaps(template: WellnessSurveyTemplate) {
  const commonMap = new Map(template.common.map((question) => [question.key, question]));
  const sectionMap = new Map(
    template.sections.flatMap((section) =>
      section.questions.map((question) => [
        question.key,
        {
          ...question,
          sectionKey: section.key,
        },
      ])
    )
  );
  return { commonMap, sectionMap };
}

function runPublicStateChecks(template: WellnessSurveyTemplate) {
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
  const c27Question = template.common.find((question) => question.key === c27Key);
  assert(c27Question, "C27 question is missing");

  const sectionA = template.sectionCatalog[0]?.key;
  const sectionB = template.sectionCatalog.find((section) => section.key !== sectionA)?.key;
  assert(sectionA, "section A key is missing");
  assert(sectionB, "section B key is missing");

  const sectionAQuestion = template.sections
    .find((section) => section.key === sectionA)
    ?.questions.find((question) => !question.displayIf);
  assert(sectionAQuestion, "section A visible question is missing");

  const answersWithA: PublicSurveyAnswers = {
    [c27Key]: sanitizeSurveyAnswerValue(c27Question, [sectionA], maxSelectedSections),
    [sectionAQuestion.key]: pickSampleAnswer(sectionAQuestion, maxSelectedSections),
  };
  const selectedA = resolveSelectedSectionsFromC27(template, answersWithA, []);
  assert(selectedA.includes(sectionA), "section A should be selected from C27");

  const answersWithB: PublicSurveyAnswers = {
    ...answersWithA,
    [c27Key]: sanitizeSurveyAnswerValue(c27Question, [sectionB], maxSelectedSections),
  };
  const selectedB = resolveSelectedSectionsFromC27(template, answersWithB, [sectionA]);
  assert(selectedB.includes(sectionB), "section B should be selected from C27");
  assert(!selectedB.includes(sectionA), "section A should be removed when C27 is deselected");

  const prunedB = pruneSurveyAnswersByVisibility(template, answersWithB, selectedB);
  assert(
    !Object.prototype.hasOwnProperty.call(prunedB, sectionAQuestion.key),
    "section A answers should be pruned after deselection"
  );

  const answersCleared: PublicSurveyAnswers = {
    ...answersWithA,
    [c27Key]: sanitizeSurveyAnswerValue(c27Question, [], maxSelectedSections),
  };
  const selectedCleared = resolveSelectedSectionsFromC27(template, answersCleared, [sectionA]);
  assert(
    selectedCleared.length === 0,
    "selected sections should be empty when explicit C27 answer is empty"
  );
}

function runServerSelectionChecks(template: WellnessSurveyTemplate) {
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
  const c27Question = template.common.find((question) => question.key === c27Key);
  assert(c27Question, "C27 question is missing");

  const sectionA = template.sectionCatalog[0]?.key;
  const sectionB = template.sectionCatalog.find((section) => section.key !== sectionA)?.key;
  assert(sectionA, "section A key is missing");
  assert(sectionB, "section B key is missing");

  const sectionAQuestion = template.sections
    .find((section) => section.key === sectionA)
    ?.questions[0];
  assert(sectionAQuestion, "section A question is missing");

  const answersWithB: PublicSurveyAnswers = {
    [c27Key]: sanitizeSurveyAnswerValue(c27Question, [sectionB], maxSelectedSections),
    [sectionAQuestion.key]: pickSampleAnswer(sectionAQuestion, maxSelectedSections),
  };
  const selectedSections = resolveSurveySelectedSections({
    schema: template as any,
    answers: answersWithB,
    selectedSections: [sectionA],
  });
  assert(
    selectedSections.includes(sectionB) && !selectedSections.includes(sectionA),
    "server selected sections should follow explicit C27 answer only"
  );

  const maps = buildQuestionMaps(template);
  const pruned = pruneSurveyAnswersForSelectedSections({
    answers: answersWithB,
    maps,
    selectedSections,
  });
  assert(
    !Object.prototype.hasOwnProperty.call(pruned, sectionAQuestion.key),
    "server prune should remove deselected section answers"
  );
}

function runWellnessAnalysisSelectionChecks() {
  const commonDef = {
    questions: [
      {
        id: "C27",
        options: [
          { value: "sleep", label: "수면/피로 개선", aliases: ["수면"] },
          { value: "liver", label: "간 건강", aliases: ["간"] },
        ],
        constraints: { maxSelections: 5 },
      },
    ],
  } as any;

  const explicitEmpty = deriveSelectedSections(
    ["sleep"],
    commonDef,
    new Map([["C27", { selectedValues: [] }]])
  );
  assert(
    explicitEmpty.length === 0,
    "wellness deriveSelectedSections should clear previous selection when explicit C27 is empty"
  );

  const explicitNew = deriveSelectedSections(
    ["sleep"],
    commonDef,
    new Map([["C27", { selectedValues: ["간"] }]])
  );
  assert(
    explicitNew.length === 1 && explicitNew[0] === "liver",
    "wellness deriveSelectedSections should follow explicit C27 selection"
  );

  const fallbackLegacy = deriveSelectedSections(["sleep"], commonDef, new Map());
  assert(
    fallbackLegacy.length === 1 && fallbackLegacy[0] === "sleep",
    "wellness deriveSelectedSections should fallback to stored selection when C27 is not explicit"
  );

  const commonDefWithoutC27 = {
    questions: [
      {
        id: "C01",
        options: [],
      },
    ],
  } as any;
  const fallbackWithoutC27 = deriveSelectedSections(
    ["sleep", "liver"],
    commonDefWithoutC27,
    new Map()
  );
  assert(
    fallbackWithoutC27.length === 2 &&
      fallbackWithoutC27[0] === "sleep" &&
      fallbackWithoutC27[1] === "liver",
    "wellness deriveSelectedSections should keep fallback selections when C27 definition is missing"
  );
}

function run() {
  const template = {
    version: 1,
    title: "qa-template",
    common: [
      {
        key: "C27",
        index: 27,
        text: "세부 영역 선택",
        type: "multi",
        sourceType: "multi_select_limited",
        required: false,
        maxSelect: 5,
        constraints: { maxSelections: 5, recommendedSelectionsRange: [4, 5] as [number, number] },
        options: [
          { value: "sleep", label: "수면/피로 개선" },
          { value: "liver", label: "간 건강" },
        ],
      },
    ],
    sectionCatalog: [
      {
        key: "sleep",
        title: "수면, 피로",
        displayName: "수면, 피로",
        triggerLabel: "수면/피로 개선",
        questionCount: 1,
      },
      {
        key: "liver",
        title: "간",
        displayName: "간",
        triggerLabel: "간 건강",
        questionCount: 1,
      },
    ],
    sections: [
      {
        key: "sleep",
        title: "수면, 피로",
        displayName: "수면, 피로",
        questions: [
          {
            key: "sleep_Q01",
            index: 1,
            text: "잠이 부족한가요?",
            type: "single",
            sourceType: "single_choice",
            required: true,
            options: [
              { value: "A", label: "예" },
              { value: "B", label: "아니오" },
            ],
          },
        ],
      },
      {
        key: "liver",
        title: "간",
        displayName: "간",
        questions: [
          {
            key: "liver_Q01",
            index: 1,
            text: "음주가 잦은가요?",
            type: "single",
            sourceType: "single_choice",
            required: true,
            options: [
              { value: "A", label: "예" },
              { value: "B", label: "아니오" },
            ],
          },
        ],
      },
    ],
    rules: {
      selectSectionByCommonQuestionKey: "C27",
      maxSelectedSections: 5,
      minSelectedSections: 0,
      recommendedSelectionsRange: [4, 5] as [number, number],
    },
  } satisfies WellnessSurveyTemplate;
  runPublicStateChecks(template);
  runServerSelectionChecks(template);
  runWellnessAnalysisSelectionChecks();
  console.log("[qa:b2b:c27-deselection-sync] passed");
}

run();
