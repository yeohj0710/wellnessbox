import assert from "node:assert/strict";
import { loadWellnessDataBundle, loadWellnessTemplateForB2b } from "../../lib/wellness/data-loader";
import { validateSurveyQuestionAnswer } from "../../lib/b2b/public-survey";
import type { WellnessSurveyQuestionForTemplate } from "../../lib/wellness/data-template-types";

function normalizeCompactText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, "");
}

function hasOptionalSkipGuideText(value: string | undefined) {
  const normalized = normalizeCompactText(value);
  if (!normalized) return false;
  return (
    normalized.includes("\uC120\uD0DD\uD558\uC9C0\uC54A\uACE0\uB2E4\uC74C") ||
    normalized.includes("\uB2E4\uC74C\uBB38\uD56D")
  );
}

function hasOptionalSelectionPrompt(value: string | undefined) {
  const normalized = normalizeCompactText(value);
  if (!normalized) return false;
  return (
    normalized.includes("\uC5EC\uC131\uC758\uACBD\uC6B0") ||
    normalized.includes("\uB0A8\uC131\uC758\uACBD\uC6B0") ||
    (normalized.includes("\uD574\uB2F9\uB418\uB294") &&
      normalized.includes("\uC788\uC73C\uC2DC\uBA74") &&
      normalized.includes("\uC120\uD0DD")) ||
    normalized.includes("\uD574\uB2F9\uB418\uB294\uAC74\uAC15\uD56D\uBAA9")
  );
}

function findQuestion(
  questions: WellnessSurveyQuestionForTemplate[],
  key: string
) {
  return questions.find((question) => question.key === key);
}

function run() {
  const bundle = loadWellnessDataBundle();
  const template = loadWellnessTemplateForB2b();
  const commonQuestions = template.common;
  const sectionQuestions = template.sections.flatMap((section) => section.questions);
  const allQuestions = [...commonQuestions, ...sectionQuestions];

  const conditionalQuestions = allQuestions.filter((question) => Boolean(question.displayIf?.field));
  assert.ok(conditionalQuestions.length > 0, "conditional(displayIf) question must exist");
  for (const question of conditionalQuestions) {
    assert.equal(
      question.required,
      false,
      `${question.key} should be optional when displayIf is set`
    );
  }

  const c04 = findQuestion(commonQuestions, "C04");
  assert.ok(c04, "C04 question is missing");
  assert.equal(c04.required, false, "C04 should be optional");
  assert.equal(
    validateSurveyQuestionAnswer(c04, "", { treatSelectionAsOptional: false }),
    null,
    "C04 empty answer should be allowed"
  );

  for (const key of ["C09", "C27"]) {
    const question = findQuestion(commonQuestions, key);
    assert.ok(question, `${key} question is missing`);
    assert.equal(question.type, "multi", `${key} should be multi choice`);
    assert.equal(question.required, false, `${key} should be optional`);
    assert.equal(
      validateSurveyQuestionAnswer(question, [], { treatSelectionAsOptional: false }),
      null,
      `${key} empty multi answer should be allowed`
    );
  }

  for (const key of ["C01", "C02", "C03"]) {
    const question = findQuestion(commonQuestions, key);
    assert.ok(question, `${key} question is missing`);
    assert.equal(question.required, true, `${key} should remain required`);
  }

  const rawCommonById = new Map(bundle.common.questions.map((question) => [question.id, question]));
  const optionalGuideQuestionIds = bundle.common.questions
    .filter((question) => hasOptionalSkipGuideText(question.notes))
    .map((question) => question.id);
  assert.ok(optionalGuideQuestionIds.length > 0, "optional guide question should exist");

  for (const questionId of optionalGuideQuestionIds) {
    const templateQuestion = findQuestion(commonQuestions, questionId);
    assert.ok(templateQuestion, `${questionId} missing from template`);
    assert.equal(
      templateQuestion.required,
      false,
      `${questionId} should be optional because notes include skip guide`
    );

    const rawQuestion = rawCommonById.get(questionId);
    if (
      templateQuestion.type === "single" &&
      rawQuestion &&
      !templateQuestion.displayIf?.field
    ) {
      assert.equal(
        validateSurveyQuestionAnswer(templateQuestion, "", {
          treatSelectionAsOptional: false,
        }),
        null,
        `${questionId} single-choice optional question should allow empty answer`
      );
    }
  }

  const sectionOptionalPromptQuestions = sectionQuestions.filter((question) =>
    hasOptionalSelectionPrompt(question.text)
  );
  assert.ok(
    sectionOptionalPromptQuestions.length > 0,
    "section optional prompt question should exist"
  );
  for (const question of sectionOptionalPromptQuestions) {
    assert.equal(
      question.required,
      false,
      `${question.key} should be optional because prompt is conditional/optional`
    );
    assert.equal(
      validateSurveyQuestionAnswer(question, "", {
        treatSelectionAsOptional: false,
      }),
      null,
      `${question.key} optional question should allow empty answer`
    );
  }

  const s10q06 = findQuestion(sectionQuestions, "S10_Q06");
  assert.ok(s10q06, "S10_Q06 question is missing");
  assert.equal(s10q06.required, true, "S10_Q06 should remain required");

  for (const key of ["S07_Q05", "S15_Q03"]) {
    const question = findQuestion(sectionQuestions, key);
    assert.ok(question, `${key} question is missing`);
    assert.equal(question.required, true, `${key} should remain required`);
    assert.equal(
      validateSurveyQuestionAnswer(question, "", { treatSelectionAsOptional: false }),
      "필수 문항입니다. 응답을 입력해 주세요.",
      `${key} should reject empty answer because it is required`
    );
    const labels = (question.options ?? []).map((option) => option.label);
    assert.ok(labels.includes("있음"), `${key} options should include '있음'`);
    assert.ok(labels.includes("없음"), `${key} options should include '없음'`);
  }

  const requiredMultiQuestions = allQuestions.filter(
    (question) => question.type === "multi" && question.required
  );
  assert.equal(
    requiredMultiQuestions.length,
    0,
    `multi-choice required questions should not remain: ${requiredMultiQuestions
      .map((question) => question.key)
      .join(", ")}`
  );

  const requiredStats = allQuestions.reduce(
    (acc, question) => {
      acc.total += 1;
      if (question.required) acc.required += 1;
      return acc;
    },
    { total: 0, required: 0 }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "conditional_questions_are_optional",
          "c04_optional_and_validation_guard",
          "c09_c27_are_optional",
          "core_identity_questions_remain_required",
          "optional_skip_guide_questions_are_optional",
          "section_optional_prompt_questions_are_optional",
          "s10_q06_remains_required",
          "medication_single_choice_questions_are_required",
          "all_multi_questions_are_optional",
        ],
        stats: requiredStats,
      },
      null,
      2
    )
  );
}

run();
