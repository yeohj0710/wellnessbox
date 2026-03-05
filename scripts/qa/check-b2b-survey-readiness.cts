import assert from "node:assert/strict";
import { resolveReportScores } from "../../lib/b2b/report-score-engine";
import { computeWellnessResult } from "../../lib/wellness/analysis";
import {
  buildQuestionAnswerMap,
  deriveSelectedSections,
  type WellnessAnalysisInput,
} from "../../lib/wellness/analysis-answer-maps";
import {
  loadWellnessDataBundle,
  loadWellnessTemplateForB2b,
} from "../../lib/wellness/data-loader";
import {
  buildSectionAdvice,
  buildSupplementDesign,
} from "../../lib/wellness/reportGenerator";
import { computeHealthScore } from "../../lib/wellness/scoring";

function assertOptionScoresInRange(options: Array<{ score?: number }>, context: string) {
  for (const [index, option] of options.entries()) {
    if (option.score == null) continue;
    assert.ok(
      Number.isFinite(option.score) && option.score >= 0 && option.score <= 1,
      `${context} option#${index + 1} score out of range: ${option.score}`
    );
  }
}

function run() {
  const { common, sections, rules, texts } = loadWellnessDataBundle();
  const template = loadWellnessTemplateForB2b();
  const checks: string[] = [];

  // case 1) common/section id and sequence integrity
  assert.equal(common.questions.length, 27);
  for (const [index, question] of common.questions.entries()) {
    const expectedNumber = index + 1;
    const expectedId = `C${String(expectedNumber).padStart(2, "0")}`;
    assert.equal(question.number, expectedNumber, `common number mismatch: ${question.id}`);
    assert.equal(question.id, expectedId, `common id mismatch at #${expectedNumber}`);
    assert.ok(question.prompt.trim().length > 0, `${question.id} prompt is empty`);
  }

  assert.equal(sections.sections.length, 24);
  for (const [sectionIndex, section] of sections.sections.entries()) {
    const expectedSectionId = `S${String(sectionIndex + 1).padStart(2, "0")}`;
    assert.equal(section.id, expectedSectionId, `section id mismatch at #${sectionIndex + 1}`);
    assert.equal(
      section.questionCount,
      section.questions.length,
      `${section.id} questionCount mismatch`
    );

    for (const [questionIndex, question] of section.questions.entries()) {
      const expectedQuestionNumber = questionIndex + 1;
      const expectedQuestionId = `${section.id}_Q${String(expectedQuestionNumber).padStart(2, "0")}`;
      assert.equal(question.number, expectedQuestionNumber, `${question.id} number mismatch`);
      assert.equal(question.id, expectedQuestionId, `${question.id} id mismatch`);
      assert.ok(question.prompt.trim().length > 0, `${question.id} prompt is empty`);
      assert.ok(question.options.length > 0, `${question.id} has empty options`);
      assertOptionScoresInRange(question.options, question.id);
    }
  }
  checks.push("survey_id_and_sequence_integrity");

  // case 2) scoring option range and scoring-enabled question linkage
  const commonById = new Map(common.questions.map((question) => [question.id, question]));
  for (const question of common.questions) {
    assertOptionScoresInRange(question.options ?? [], question.id);
    if (question.scoring?.enabled === true) {
      assert.ok(
        (question.options ?? []).some((option) => typeof option.score === "number"),
        `${question.id} scoring enabled but no scored option`
      );
    }
  }

  const domainQuestionIds = new Set<string>();
  for (const domain of rules.lifestyleRisk.domains) {
    for (const questionId of domain.questionIds) {
      assert.ok(commonById.has(questionId), `rules references unknown question: ${questionId}`);
      const question = commonById.get(questionId)!;
      assert.equal(
        question.scoring?.enabled,
        true,
        `rules references non-scoring common question: ${questionId}`
      );
      assert.ok(!domainQuestionIds.has(questionId), `duplicate domain question: ${questionId}`);
      domainQuestionIds.add(questionId);
    }
  }
  checks.push("score_option_range_and_domain_mapping");

  // case 3) C27 <-> section/template linkage integrity
  const c27 = commonById.get("C27");
  assert.ok(c27, "C27 missing");
  assert.equal(c27!.type, "multi_select_limited");
  assert.equal(c27!.constraints?.maxSelections, 5);
  assert.deepEqual(c27!.constraints?.recommendedSelectionsRange, [4, 5]);
  assert.equal(c27!.options?.length, sections.sections.length);

  const sectionIdSet = new Set(sections.sections.map((section) => section.id));
  for (const option of c27!.options ?? []) {
    assert.ok(sectionIdSet.has(option.value), `C27 option points unknown section: ${option.value}`);
  }

  assert.equal(template.rules.selectSectionByCommonQuestionKey, "C27");
  assert.equal(template.rules.maxSelectedSections, c27!.constraints?.maxSelections);
  assert.equal(template.sectionCatalog.length, sections.sections.length);
  for (const [index, section] of template.sectionCatalog.entries()) {
    const expectedSectionKey: string | undefined = c27!.options?.[index]?.value;
    assert.equal(
      section.key,
      expectedSectionKey,
      `template sectionCatalog order mismatch: ${section.key}`
    );
  }
  checks.push("c27_and_template_linkage");

  // case 4) report text/rules coverage integrity
  const sectionAnalysisKeys = Object.keys(texts.sectionAnalysisAdvice);
  const supplementKeys = Object.keys(texts.supplementDesignTextBySectionId);

  for (const sectionId of sectionIdSet) {
    assert.ok(texts.sectionAnalysisAdvice[sectionId], `missing sectionAnalysisAdvice for ${sectionId}`);
    assert.ok(
      texts.supplementDesignTextBySectionId[sectionId],
      `missing supplementDesign text for ${sectionId}`
    );
  }
  for (const key of sectionAnalysisKeys) {
    assert.ok(sectionIdSet.has(key), `unknown sectionAnalysisAdvice key: ${key}`);
  }
  for (const key of supplementKeys) {
    assert.ok(sectionIdSet.has(key), `unknown supplementDesign key: ${key}`);
  }

  const [from, to] = rules.reportGeneration.lifestyleRoutine.questionRange;
  assert.ok(from <= to, "invalid lifestyleRoutine question range");
  for (let questionNumber = from; questionNumber <= to; questionNumber += 1) {
    const questionId = `C${String(questionNumber).padStart(2, "0")}`;
    assert.ok(commonById.has(questionId), `lifestyleRoutine range references unknown ${questionId}`);
    assert.ok(
      texts.lifestyleRoutineAdviceByCommonQuestionNumber[String(questionNumber)],
      `missing lifestyleRoutine text for Q${questionNumber}`
    );
  }

  for (const section of sections.sections) {
    const advice = texts.sectionAnalysisAdvice[section.id];
    const questionNumberSet = new Set(section.questions.map((question) => question.number));
    for (const key of Object.keys(advice.adviceByQuestionNumber)) {
      const questionNumber = Number.parseInt(key, 10);
      assert.ok(
        Number.isFinite(questionNumber) && questionNumberSet.has(questionNumber),
        `${section.id} advice references invalid question number: ${key}`
      );
    }
  }
  checks.push("report_texts_and_rules_coverage");

  // case 5) C27 alias resolution + max-selection enforcement
  const deriveInput: WellnessAnalysisInput = {
    selectedSections: [],
    answersJson: null,
    answers: [
      {
        questionKey: "C27",
        sectionKey: null,
        answerText: null,
        answerValue: null,
        meta: {
          selectedValues: [
            "기억력/인지능력 향상",
            "호흡기",
            "전립선 건강",
            "월경전증후군 개선",
            "S02",
            "혈압 조절",
          ],
        },
      },
    ],
  };
  const derived = deriveSelectedSections(
    ["S03"],
    common,
    buildQuestionAnswerMap(deriveInput)
  );
  assert.equal(derived.length, 5);
  assert.deepEqual(derived, ["S01", "S24", "S21", "S14", "S02"]);
  assert.ok(!derived.includes("S03"), "explicit C27 answer should override legacy seed selection");
  checks.push("c27_alias_and_max_selection");

  // case 6) wellness result with full-risk synthetic input
  const selectedSections = sections.sections.slice(0, 5).map((section) => section.id);
  const syntheticAnswers: WellnessAnalysisInput["answers"] = [
    {
      questionKey: "C27",
      sectionKey: null,
      answerText: selectedSections.join(", "),
      answerValue: selectedSections.join(", "),
      score: null,
      meta: { selectedValues: selectedSections },
    },
  ];

  for (const question of common.questions) {
    if (question.scoring?.enabled !== true) continue;
    syntheticAnswers.push({
      questionKey: question.id,
      sectionKey: null,
      answerText: "synthetic",
      answerValue: "synthetic",
      score: 1,
      meta: { selectedValues: ["synthetic"] },
    });
  }

  for (const sectionId of selectedSections) {
    const section = sections.sections.find((item) => item.id === sectionId)!;
    for (const question of section.questions) {
      syntheticAnswers.push({
        questionKey: question.id,
        sectionKey: sectionId,
        answerText: "synthetic",
        answerValue: "synthetic",
        score: 1,
        meta: { selectedValues: ["synthetic"] },
      });
    }
  }

  const syntheticResult = computeWellnessResult({
    selectedSections,
    answersJson: null,
    answers: syntheticAnswers,
  });
  assert.ok(syntheticResult.lifestyleRisk.overallPercent >= 99.9);
  assert.ok(syntheticResult.healthManagementNeed.averagePercent >= 99.9);
  assert.ok(syntheticResult.overallHealthScore <= 0.1);
  assert.equal(syntheticResult.selectedSections.length, 5);
  assert.equal(syntheticResult.perQuestionScores.common.C01, null);
  assert.ok(
    syntheticResult.highRiskHighlights.length > 0 &&
      syntheticResult.highRiskHighlights.length <= 5
  );
  assert.ok(
    syntheticResult.highRiskHighlights.some(
      (item) => item.category === "section" || item.category === "detailed"
    ),
    "highRiskHighlights should include detailed risk coverage for selected sections"
  );
  assert.ok(syntheticResult.lifestyleRoutineAdvice.length > 0);
  assert.equal(
    syntheticResult.supplementDesign.length,
    Math.min(rules.reportGeneration.supplementDesign.defaultTopN, selectedSections.length)
  );
  checks.push("wellness_full_risk_synthetic_case");

  // case 7) no-section input should still produce domain-level fallback highlight
  const domainFallbackResult = computeWellnessResult({
    selectedSections: [],
    answersJson: null,
    answers: [],
  });
  assert.ok(
    domainFallbackResult.highRiskHighlights.some((item) => item.category === "domain"),
    "domain fallback highlight should exist when no section selected"
  );
  checks.push("domain_fallback_highlight");

  // case 8) section advice threshold behavior
  const firstSection = sections.sections[0];
  const firstSectionAdvice = texts.sectionAnalysisAdvice[firstSection.id];
  const adviceQuestionNumbers = Object.keys(firstSectionAdvice.adviceByQuestionNumber)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  assert.ok(adviceQuestionNumbers.length > 0, `${firstSection.id} has no advice items`);

  const perQuestionScoreMap: Record<string, number | null> = {};
  const threshold = rules.reportGeneration.sectionAnalysis.includeAdviceIfQuestionScoreGte;
  const includeQuestionNumber = adviceQuestionNumbers[0];
  const excludeQuestionNumber = adviceQuestionNumbers[1] ?? includeQuestionNumber + 1;

  perQuestionScoreMap[`${firstSection.id}_Q${String(includeQuestionNumber).padStart(2, "0")}`] =
    threshold;
  perQuestionScoreMap[`${firstSection.id}_Q${String(excludeQuestionNumber).padStart(2, "0")}`] =
    Math.max(0, threshold - 0.1);

  const sectionAdviceRows = buildSectionAdvice(
    firstSection.id,
    perQuestionScoreMap,
    texts,
    rules
  );
  assert.ok(
    sectionAdviceRows.some((row) => row.questionNumber === includeQuestionNumber),
    "threshold score should be included"
  );
  assert.ok(
    !sectionAdviceRows.some((row) => row.questionNumber === excludeQuestionNumber),
    "below-threshold score should be excluded"
  );
  checks.push("section_advice_threshold");

  // case 9) supplement design top-N and sort order
  const rankedSections = sections.sections.slice(0, 6).map((section, index) => ({
    sectionId: section.id,
    score: [20, 95, 60, 95, 40, 10][index],
  }));
  const expectedTopSectionIds = [...rankedSections]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.sectionId.localeCompare(right.sectionId);
    })
    .slice(0, rules.reportGeneration.supplementDesign.defaultTopN)
    .map((item) => item.sectionId);
  const supplement = buildSupplementDesign(rankedSections, texts, rules);
  assert.deepEqual(
    supplement.map((item) => item.sectionId),
    expectedTopSectionIds
  );
  checks.push("supplement_top_n_sorting");

  // case 10) health score formula clamp guard
  assert.equal(computeHealthScore(-50, -20, rules), 100);
  assert.equal(computeHealthScore(200, 200, rules), 0);
  checks.push("health_score_formula_clamp");

  // case 11) report score engine fallback behavior
  const fallbackScore = resolveReportScores({
    surveySectionScores: [{ score: 80, answeredCount: 1, questionCount: 10 }],
    healthCoreMetrics: [{ status: "normal" }, { status: "unknown" }],
    medicationStatusType: "available",
    medicationCount: 2,
  });
  assert.equal(fallbackScore.details.survey.source, "survey_sections");
  assert.equal(fallbackScore.details.health.source, "health_metrics");
  assert.equal(fallbackScore.details.medication.source, "medication_status");
  assert.equal(fallbackScore.details.overall.status, "estimated");
  assert.ok(fallbackScore.summary.overallScore != null);
  checks.push("report_score_engine_fallback");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks,
      },
      null,
      2
    )
  );
}

run();
