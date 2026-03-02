import assert from "node:assert/strict";
import { computeWellnessResult } from "../../lib/wellness/analysis";
import { loadWellnessDataBundle } from "../../lib/wellness/data-loader";
import { buildLifestyleRoutineAdvice } from "../../lib/wellness/reportGenerator";
import {
  computeHealthScore,
  scoreCommon,
  scoreSections,
  type CommonAnswerMap,
  type SectionAnswerMapBySectionId,
} from "../../lib/wellness/scoring";

function assertAlmostEqual(actual: number, expected: number, epsilon = 0.0001) {
  const delta = Math.abs(actual - expected);
  assert.ok(
    delta <= epsilon,
    `expected ${expected}, received ${actual} (delta ${delta}, epsilon ${epsilon})`
  );
}

function run() {
  const { common, sections, rules, texts } = loadWellnessDataBundle();

  // case 1) all common scores are zero
  const emptyCommonAnswers: CommonAnswerMap = {};
  const commonZero = scoreCommon(emptyCommonAnswers, rules, common);
  for (const domain of rules.lifestyleRisk.domains) {
    assert.equal(commonZero.domainScoresPercent[domain.id], 0);
  }
  assert.equal(commonZero.overallPercent, 0);
  const healthScoreFromZero = computeHealthScore(commonZero.overallPercent, 0, rules);
  assert.ok(healthScoreFromZero >= 99.9 && healthScoreFromZero <= 100);

  // case 2) all common scores are one
  const allOneCommonAnswers: CommonAnswerMap = {};
  for (const question of common.questions) {
    if (question.scoring?.enabled !== true) continue;
    const scoredOptions = (question.options ?? []).filter(
      (option) => typeof option.score === "number"
    );
    if (scoredOptions.length === 0) continue;
    const topOption = [...scoredOptions].sort(
      (left, right) => (right.score ?? 0) - (left.score ?? 0)
    )[0];
    allOneCommonAnswers[question.id] = {
      answerValue: topOption.value,
      answerText: topOption.label,
      selectedValues: [topOption.value],
      score: 1,
    };
  }
  const commonOne = scoreCommon(allOneCommonAnswers, rules, common);
  for (const domain of rules.lifestyleRisk.domains) {
    assertAlmostEqual(commonOne.domainScoresPercent[domain.id] ?? 0, 100);
  }
  assertAlmostEqual(commonOne.overallPercent, 100);
  const healthScoreFromOne = computeHealthScore(commonOne.overallPercent, 100, rules);
  assert.ok(healthScoreFromOne <= 0.1);

  // case 3) section average with 4 and 5 selected sections
  const targetSections = sections.sections.slice(0, 5);
  assert.equal(targetSections.length, 5);
  const perSectionScores = [0.2, 0.4, 0.6, 0.8, 1.0];
  const sectionAnswersById: SectionAnswerMapBySectionId = {};
  for (const [index, section] of targetSections.entries()) {
    const answerMap: Record<string, { score: number }> = {};
    for (const question of section.questions) {
      answerMap[question.id] = { score: perSectionScores[index] };
    }
    sectionAnswersById[section.id] = answerMap;
  }

  const sectionScoreFour = scoreSections(
    Object.fromEntries(
      targetSections.slice(0, 4).map((section) => [section.id, sectionAnswersById[section.id]])
    ),
    rules,
    sections
  );
  assertAlmostEqual(sectionScoreFour.averagePercent, 50);

  const sectionScoreFive = scoreSections(sectionAnswersById, rules, sections);
  assertAlmostEqual(sectionScoreFive.averagePercent, 60);

  // case 4) lifestyle routine branching
  const primaryRoutine = buildLifestyleRoutineAdvice(
    {
      C10: 1,
      C11: 0.5,
    },
    texts,
    rules
  );
  assert.ok(primaryRoutine.includes(texts.lifestyleRoutineAdviceByCommonQuestionNumber["10"]));
  assert.ok(!primaryRoutine.includes(texts.lifestyleRoutineAdviceByCommonQuestionNumber["11"]));

  const fallbackRoutine = buildLifestyleRoutineAdvice(
    {
      C10: 0,
      C11: 0.5,
    },
    texts,
    rules
  );
  assert.ok(!fallbackRoutine.includes(texts.lifestyleRoutineAdviceByCommonQuestionNumber["10"]));
  assert.ok(fallbackRoutine.includes(texts.lifestyleRoutineAdviceByCommonQuestionNumber["11"]));

  // case 5) latest S21 options (5-choice set) score mapping
  const s21ScoreCase = computeWellnessResult({
    selectedSections: ["S21"],
    answersJson: null,
    answers: [
      {
        questionKey: "C27",
        sectionKey: null,
        answerText: "전립선 건강",
        answerValue: "S21",
        score: null,
        meta: { selectedValues: ["S21"] },
      },
      {
        questionKey: "S21_Q03",
        sectionKey: "S21",
        answerText: "3~4번",
        answerValue: "E",
        score: null,
        meta: { selectedValues: ["E"] },
      },
    ],
  });
  assertAlmostEqual(s21ScoreCase.perQuestionScores.sections.S21?.S21_Q03 ?? 0, 0.8);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "common_all_zero",
          "common_all_one",
          "section_average_4_and_5",
          "lifestyle_routine_branching",
          "s21_latest_option_score_mapping",
        ],
      },
      null,
      2
    )
  );
}

run();

