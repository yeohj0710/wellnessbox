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

  // case 1) 공통 점수 all 0 -> 모든 축 0, 건강점수 100 근처
  const emptyCommonAnswers: CommonAnswerMap = {};
  const commonZero = scoreCommon(emptyCommonAnswers, rules, common);
  for (const domain of rules.lifestyleRisk.domains) {
    assert.equal(commonZero.domainScoresPercent[domain.id], 0);
  }
  assert.equal(commonZero.overallPercent, 0);
  const healthScoreFromZero = computeHealthScore(commonZero.overallPercent, 0, rules);
  assert.ok(healthScoreFromZero >= 99.9 && healthScoreFromZero <= 100);

  // case 2) 공통 점수 all 1 -> 모든 축 100, 건강점수 낮음
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

  // case 3) 섹션 4개/5개 선택 평균 계산 확인
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
      targetSections
        .slice(0, 4)
        .map((section) => [section.id, sectionAnswersById[section.id]])
    ),
    rules,
    sections
  );
  assertAlmostEqual(sectionScoreFour.averagePercent, 50);

  const sectionScoreFive = scoreSections(sectionAnswersById, rules, sections);
  assertAlmostEqual(sectionScoreFive.averagePercent, 60);

  // case 4) lifestyleRoutine 분기 확인 (1점 우선 / 없으면 0.5점 fallback)
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

  // case 5) S21 variant 사용 시 score 고정(재해석 방지) 확인
  const variantLocked = computeWellnessResult({
    selectedSections: ["S21"],
    answersJson: null,
    answers: [
      {
        questionKey: "C27",
        sectionKey: null,
        answerText: "남성건강",
        answerValue: "S21",
        score: null,
        meta: { selectedValues: ["S21"], variantId: "base" },
      },
      {
        questionKey: "S21_Q03",
        sectionKey: "S21",
        answerText: "3~4 번",
        answerValue: "D",
        score: 0.8,
        meta: {
          selectedValues: ["D"],
          variantId: "paperPdf_웰니스_설문지.pdf",
        },
      },
    ],
  });
  assertAlmostEqual(
    variantLocked.perQuestionScores.sections.S21?.S21_Q03 ?? 0,
    0.8
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "common_all_zero",
          "common_all_one",
          "section_average_4_and_5",
          "lifestyle_routine_branching",
          "s21_variant_score_locked",
        ],
      },
      null,
      2
    )
  );
}

run();
