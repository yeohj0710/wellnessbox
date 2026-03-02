import assert from "node:assert/strict";
import {
  buildPublicSurveyQuestionList,
  buildWellnessAnalysisInputFromSurvey,
  computeSurveyProgress,
  isSurveyQuestionAnswered,
  normalizeSurveyAnswersByTemplate,
  pruneSurveyAnswersByVisibility,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  toMultiValues,
  toggleSurveyMultiValue,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "../../lib/b2b/public-survey";
import { computeWellnessResult } from "../../lib/wellness/analysis";
import { loadWellnessTemplateForB2b } from "../../lib/wellness/data-loader";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "../../lib/wellness/data-template-types";

function findQuestion(template: WellnessSurveyTemplate, key: string) {
  const all = [...template.common, ...template.sections.flatMap((section) => section.questions)];
  const found = all.find((question) => question.key === key);
  assert.ok(found, `question missing: ${key}`);
  return found!;
}

function buildDefaultNumberValue(question: WellnessSurveyQuestionForTemplate) {
  const min = question.constraints?.min ?? 1;
  const max = question.constraints?.max ?? Math.max(min + 10, 100);
  let value = min + Math.max(1, Math.floor((max - min) / 2));
  if (value > max) value = max;
  if (question.constraints?.integer) value = Math.round(value);
  return String(value);
}

function buildDefaultRawAnswer(question: WellnessSurveyQuestionForTemplate): unknown {
  if (question.type === "single") {
    return question.options[0]?.value ?? "";
  }

  if (question.type === "multi") {
    if (question.key === "C27" && question.options.length >= 2) {
      return [question.options[0].value, question.options[1].value];
    }
    const noneOptionValue =
      question.noneOptionValue ??
      question.options.find((option) => option.isNoneOption)?.value ??
      null;
    const firstRegular =
      question.options.find((option) => option.value !== noneOptionValue)?.value ??
      question.options[0]?.value ??
      "";
    return [firstRegular];
  }

  if (question.type === "number") {
    return buildDefaultNumberValue(question);
  }

  if (question.type === "group") {
    const fieldValues = Object.fromEntries(
      (question.fields ?? []).map((field) => {
        if (field.type === "number") {
          const min = field.constraints?.min ?? 1;
          const max = field.constraints?.max ?? Math.max(min + 10, 100);
          let value = min + Math.max(1, Math.floor((max - min) / 2));
          if (value > max) value = max;
          if (field.constraints?.integer) value = Math.round(value);
          return [field.id, String(value)];
        }
        return [field.id, "테스트"];
      })
    );
    return { fieldValues };
  }

  return "테스트";
}

function buildAutoAnsweredSurvey(
  template: WellnessSurveyTemplate,
  seedAnswers: PublicSurveyAnswers = {}
) {
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const answers: PublicSurveyAnswers = { ...seedAnswers };
  let guard = 0;

  while (guard < 2000) {
    guard += 1;
    const selectedSections = resolveSelectedSectionsFromC27(template, answers);
    const questionList = buildPublicSurveyQuestionList(template, answers, selectedSections);
    const pending = questionList.find(
      (node) => !isSurveyQuestionAnswered(node.question, answers[node.question.key])
    );
    if (!pending) break;

    answers[pending.question.key] = sanitizeSurveyAnswerValue(
      pending.question,
      buildDefaultRawAnswer(pending.question),
      maxSelectedSections
    );
  }

  assert.ok(guard < 2000, "auto answer guard overflow");
  const selectedSections = resolveSelectedSectionsFromC27(template, answers);
  const pruned = pruneSurveyAnswersByVisibility(template, answers, selectedSections);
  return {
    answers: pruned,
    selectedSections,
    questionList: buildPublicSurveyQuestionList(template, pruned, selectedSections),
  };
}

function run() {
  const template = loadWellnessTemplateForB2b();
  const checks: string[] = [];
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);

  const c01 = findQuestion(template, "C01");
  const c02 = findQuestion(template, "C02");
  const c03 = findQuestion(template, "C03");
  const c04 = findQuestion(template, "C04");
  const c05 = findQuestion(template, "C05");
  const c27 = findQuestion(template, "C27");

  // case 1) base visibility and displayIf branch
  const initialQuestionList = buildPublicSurveyQuestionList(template, {}, []);
  assert.ok(initialQuestionList.some((item) => item.question.key === "C01"));
  assert.ok(!initialQuestionList.some((item) => item.question.key === "C04"));

  const includeC04Answers = {
    C01: sanitizeSurveyAnswerValue(c01, "B", maxSelectedSections),
  };
  const includeC04List = buildPublicSurveyQuestionList(template, includeC04Answers, []);
  assert.ok(includeC04List.some((item) => item.question.key === "C04"));

  const nonB = c01.options.find((option) => option.value !== "B")?.value ?? c01.options[0]?.value;
  const hideC04Answers = {
    C01: sanitizeSurveyAnswerValue(c01, nonB ?? "", maxSelectedSections),
  };
  const hideC04List = buildPublicSurveyQuestionList(template, hideC04Answers, []);
  assert.ok(!hideC04List.some((item) => item.question.key === "C04"));
  checks.push("display_if_visibility_branch");

  // case 2) C27 token resolution + max selection enforcement
  assert.equal(c27.type, "multi");
  assert.ok(c27.options.length >= 6, "C27 options should include at least 6 items");
  const c27RawTokens = [
    c27.options[0].label,
    c27.options[1].value,
    c27.options[2].label,
    c27.options[3].value,
    c27.options[4].label,
    c27.options[5].value,
    c27.options[0].value,
  ];
  const resolvedSections = resolveSelectedSectionsFromC27(template, { C27: c27RawTokens });
  assert.equal(resolvedSections.length, maxSelectedSections);
  assert.deepEqual(
    resolvedSections,
    c27.options.slice(0, maxSelectedSections).map((option) => option.value)
  );
  checks.push("c27_resolution_and_max_selection");

  // case 3) multi-select none-option exclusivity + maxSelect cap
  assert.equal(c05.type, "multi");
  assert.ok(c05.noneOptionValue, "C05 should define noneOptionValue");
  const firstRegularOption =
    c05.options.find((option) => option.value !== c05.noneOptionValue)?.value ??
    c05.options[0]?.value ??
    null;
  assert.ok(firstRegularOption, "C05 regular option missing");

  let c05Answer = toggleSurveyMultiValue(c05, [], firstRegularOption!, maxSelectedSections);
  assert.deepEqual(toMultiValues(c05Answer), [firstRegularOption]);

  c05Answer = toggleSurveyMultiValue(c05, c05Answer, c05.noneOptionValue!, maxSelectedSections);
  assert.deepEqual(toMultiValues(c05Answer), [c05.noneOptionValue]);

  c05Answer = toggleSurveyMultiValue(c05, c05Answer, firstRegularOption!, maxSelectedSections);
  assert.deepEqual(toMultiValues(c05Answer), [firstRegularOption]);

  const c05RegularCandidates = c05.options
    .map((option) => option.value)
    .filter((value) => value !== c05.noneOptionValue);
  const c05Sanitized = sanitizeSurveyAnswerValue(
    c05,
    c05RegularCandidates.slice(0, 10),
    maxSelectedSections
  );
  assert.equal(
    toMultiValues(c05Sanitized).length,
    c05.maxSelect || c05.constraints?.maxSelections || maxSelectedSections
  );
  checks.push("multi_none_exclusive_and_max_cap");

  // case 4) number/group validation guard
  assert.equal(c02.type, "number");
  assert.ok(validateSurveyQuestionAnswer(c02, "") !== null);
  assert.ok(validateSurveyQuestionAnswer(c02, "-1") !== null);
  assert.ok(validateSurveyQuestionAnswer(c02, "121") !== null);
  assert.ok(validateSurveyQuestionAnswer(c02, "10.5") !== null);
  assert.equal(validateSurveyQuestionAnswer(c02, "35"), null);

  assert.equal(c03.type, "group");
  assert.ok(validateSurveyQuestionAnswer(c03, { fieldValues: { heightCm: "", weightKg: "" } }) !== null);
  assert.ok(
    validateSurveyQuestionAnswer(c03, { fieldValues: { heightCm: "30", weightKg: "70" } }) !==
      null
  );
  assert.equal(
    validateSurveyQuestionAnswer(c03, {
      fieldValues: { heightCm: "170", weightKg: "65" },
    }),
    null
  );
  checks.push("number_and_group_validation_guard");

  // case 5) normalize/prune should remove hidden + unknown keys
  const normalized = normalizeSurveyAnswersByTemplate(template, {
    C01: nonB ?? "",
    C04: "A",
    C27: [c27.options[0].value],
    UNKNOWN_KEY: "bad",
  });
  assert.ok(!Object.prototype.hasOwnProperty.call(normalized, "C04"));
  assert.ok(!Object.prototype.hasOwnProperty.call(normalized, "UNKNOWN_KEY"));
  checks.push("normalize_and_prune_hidden_keys");

  // case 6) selected section question visibility list consistency
  const selectedTwo = [c27.options[0].value, c27.options[1].value];
  const sectionAnswers: PublicSurveyAnswers = {
    C27: sanitizeSurveyAnswerValue(c27, selectedTwo, maxSelectedSections),
  };
  const sectionQuestionList = buildPublicSurveyQuestionList(
    template,
    sectionAnswers,
    resolveSelectedSectionsFromC27(template, sectionAnswers)
  );
  const visibleSectionKeys = new Set(
    sectionQuestionList
      .map((item) => item.sectionKey)
      .filter((value): value is string => typeof value === "string")
  );
  assert.ok(visibleSectionKeys.has(selectedTwo[0]));
  assert.ok(visibleSectionKeys.has(selectedTwo[1]));
  for (const key of visibleSectionKeys) {
    assert.ok(selectedTwo.includes(key), `unexpected section in list: ${key}`);
  }
  checks.push("selected_section_visibility_consistency");

  // case 7) progress computation sanity
  const progressSeed: PublicSurveyAnswers = {};
  for (const item of sectionQuestionList.slice(0, 2)) {
    progressSeed[item.question.key] = sanitizeSurveyAnswerValue(
      item.question,
      buildDefaultRawAnswer(item.question),
      maxSelectedSections
    );
  }
  const progress = computeSurveyProgress(sectionQuestionList, progressSeed);
  assert.equal(progress.total, sectionQuestionList.length);
  assert.ok(progress.answered >= 2);
  assert.ok(progress.requiredTotal >= progress.requiredAnswered);
  checks.push("progress_computation_sanity");

  // case 8) full auto-answer => validation clean + analysis input + compute result
  const auto = buildAutoAnsweredSurvey(template, {
    C01: sanitizeSurveyAnswerValue(c01, "B", maxSelectedSections),
    C27: sanitizeSurveyAnswerValue(c27, selectedTwo, maxSelectedSections),
  });
  assert.deepEqual(auto.selectedSections, selectedTwo);
  assert.ok(auto.questionList.some((item) => item.question.key === c04.key));
  for (const node of auto.questionList) {
    const error = validateSurveyQuestionAnswer(node.question, auto.answers[node.question.key]);
    assert.equal(error, null, `auto answer invalid for ${node.question.key}: ${error}`);
  }

  const analysisInput = buildWellnessAnalysisInputFromSurvey({
    template,
    answers: auto.answers,
    selectedSections: auto.selectedSections,
  });
  assert.deepEqual(analysisInput.selectedSections, selectedTwo);
  assert.ok(analysisInput.answers.length >= auto.questionList.length);
  assert.ok(analysisInput.answers.every((row) => typeof row.questionKey === "string"));

  const result = computeWellnessResult(analysisInput);
  assert.ok(Number.isFinite(result.overallHealthScore));
  assert.ok(Number.isFinite(result.lifestyleRisk.overallPercent));
  assert.ok(Number.isFinite(result.healthManagementNeed.averagePercent));
  assert.equal(result.selectedSections.length, selectedTwo.length);
  assert.ok(result.highRiskHighlights.length > 0);
  checks.push("auto_answer_to_analysis_integration");

  // case 9) section deselection should prune orphan section answers
  const reducedAnswers = {
    ...auto.answers,
    C27: sanitizeSurveyAnswerValue(c27, [selectedTwo[0]], maxSelectedSections),
  };
  const reducedSelectedSections = resolveSelectedSectionsFromC27(template, reducedAnswers);
  const prunedReducedAnswers = pruneSurveyAnswersByVisibility(
    template,
    reducedAnswers,
    reducedSelectedSections
  );
  const reducedVisibleKeys = new Set(
    buildPublicSurveyQuestionList(template, prunedReducedAnswers, reducedSelectedSections).map(
      (item) => item.question.key
    )
  );
  for (const key of Object.keys(prunedReducedAnswers)) {
    assert.ok(reducedVisibleKeys.has(key), `orphan answer key remained after prune: ${key}`);
  }
  const removedSectionQuestionKeys = auto.questionList
    .filter((item) => item.sectionKey === selectedTwo[1])
    .map((item) => item.question.key);
  assert.ok(removedSectionQuestionKeys.length > 0);
  for (const questionKey of removedSectionQuestionKeys) {
    assert.ok(
      !Object.prototype.hasOwnProperty.call(prunedReducedAnswers, questionKey),
      `removed section answer should be pruned: ${questionKey}`
    );
  }
  checks.push("deselection_prunes_orphan_answers");

  // case 10) malformed payload normalization should not throw and should remain bounded
  const malformed = normalizeSurveyAnswersByTemplate(template, {
    C02: { answerValue: "abc" },
    C03: { fieldValues: { heightCm: "170", weightKg: "x" } },
    C05: { selectedValues: [null, "bad", firstRegularOption] },
    C27: { answerText: `${c27.options[0].label}|${c27.options[1].label}|${c27.options[2].label}` },
  });
  const malformedSelected = resolveSelectedSectionsFromC27(template, malformed);
  assert.ok(malformedSelected.length <= maxSelectedSections);
  assert.ok(toMultiValues(malformed.C05).length <= (c05.maxSelect || maxSelectedSections));
  checks.push("malformed_payload_normalization_guard");

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
