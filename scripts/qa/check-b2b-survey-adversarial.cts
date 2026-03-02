import assert from "node:assert/strict";
import {
  buildPublicSurveyQuestionList,
  buildWellnessAnalysisInputFromSurvey,
  computeSurveyProgress,
  isSurveyQuestionAnswered,
  isSurveyQuestionVisible,
  normalizeSurveyAnswersByTemplate,
  resolveGroupFieldValues,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  toInputValue,
  toMultiValues,
  toggleSurveyMultiValue,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "../../lib/b2b/public-survey";
import { computeWellnessResult } from "../../lib/wellness/analysis";
import {
  loadWellnessDataBundle,
  loadWellnessTemplateForB2b,
} from "../../lib/wellness/data-loader";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "../../lib/wellness/data-template-types";

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pickOne<T>(items: T[], random: () => number) {
  const index = Math.floor(random() * items.length);
  return items[Math.max(0, Math.min(index, items.length - 1))];
}

function allTemplateQuestions(template: WellnessSurveyTemplate) {
  return [...template.common, ...template.sections.flatMap((section) => section.questions)];
}

function findQuestion(template: WellnessSurveyTemplate, key: string) {
  const found = allTemplateQuestions(template).find((question) => question.key === key);
  assert.ok(found, `question missing: ${key}`);
  return found!;
}

function maxSelectForQuestion(
  question: WellnessSurveyQuestionForTemplate,
  fallbackMaxSelectedSections: number
) {
  return (
    question.maxSelect ||
    question.constraints?.maxSelections ||
    Math.max(1, fallbackMaxSelectedSections)
  );
}

function buildCanonicalRawAnswer(
  question: WellnessSurveyQuestionForTemplate,
  maxSelectedSections: number
): unknown {
  if (question.type === "single") {
    return question.options[0]?.value ?? "";
  }

  if (question.type === "multi") {
    const noneOptionValue =
      question.noneOptionValue ??
      question.options.find((option) => option.isNoneOption)?.value ??
      null;
    const firstRegular =
      question.options.find((option) => option.value !== noneOptionValue)?.value ??
      question.options[0]?.value ??
      "";
    return firstRegular ? [firstRegular] : [];
  }

  if (question.type === "number") {
    const min = question.constraints?.min ?? 0;
    const max = question.constraints?.max ?? Math.max(min + 1, 120);
    let value = min + Math.max(1, Math.floor((max - min) / 2));
    if (value > max) value = max;
    if (question.constraints?.integer) value = Math.round(value);
    return String(value);
  }

  if (question.type === "group") {
    const fieldValues = Object.fromEntries(
      (question.fields ?? []).map((field) => {
        if (field.type === "number") {
          const min = field.constraints?.min ?? 1;
          const max = field.constraints?.max ?? Math.max(min + 1, 200);
          let value = min + Math.max(1, Math.floor((max - min) / 2));
          if (value > max) value = max;
          if (field.constraints?.integer) value = Math.round(value);
          return [field.id, String(value)];
        }
        return [field.id, "test"];
      })
    );
    return { fieldValues };
  }

  return "test";
}

function fuzzRawValue(
  question: WellnessSurveyQuestionForTemplate,
  random: () => number
): unknown {
  const scalarPool: unknown[] = [
    null,
    undefined,
    "",
    " ",
    "__INVALID__",
    "0",
    "9999",
    "alpha|beta",
    true,
    false,
    0,
    1,
    -1,
    99999,
    {},
    { answerText: "x" },
    { answerValue: "x" },
    { selectedValues: ["x", "y"] },
    [],
    ["x", "y", "z"],
    ["", " ", null],
  ];

  if (question.type === "single") {
    if (random() < 0.65 && question.options.length > 0) {
      return pickOne(question.options, random).value;
    }
    return pickOne(scalarPool, random);
  }

  if (question.type === "multi") {
    if (random() < 0.7 && question.options.length > 0) {
      const targetCount = Math.floor(random() * 7);
      const values: string[] = [];
      for (let index = 0; index < targetCount; index += 1) {
        if (random() < 0.75) {
          values.push(pickOne(question.options, random).value);
        } else {
          values.push(`INVALID_${index}`);
        }
      }
      return values;
    }
    return pickOne(scalarPool, random);
  }

  if (question.type === "number") {
    const numberPool = ["", "0", "1", "-1", "12.34", "abc", "999999", "NaN", "Infinity"];
    return pickOne(numberPool, random);
  }

  if (question.type === "group") {
    const fieldValues = Object.fromEntries(
      (question.fields ?? []).map((field) => {
        if (field.type === "number") {
          return [field.id, pickOne(["", "-1", "0", "120", "abc", "9999"], random)];
        }
        return [field.id, pickOne(["", "a", "test", "   "], random)];
      })
    );
    if (random() < 0.25) return pickOne(scalarPool, random);
    if (random() < 0.2) return { ...fieldValues };
    return { fieldValues };
  }

  return pickOne(scalarPool, random);
}

function run() {
  const { common, sections } = loadWellnessDataBundle();
  const template = loadWellnessTemplateForB2b();
  const checks: string[] = [];
  const random = createRng(260302);
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const allQuestions = allTemplateQuestions(template);

  // case 1) base dataset size and template linkage
  assert.equal(common.questions.length, template.common.length);
  assert.equal(sections.sections.length, template.sections.length);
  assert.equal(template.sectionCatalog.length, template.sections.length);
  assert.equal(template.rules.selectSectionByCommonQuestionKey, "C27");
  checks.push("dataset_and_template_linkage");

  // case 2) key/index uniqueness and section ownership
  const keySet = new Set<string>();
  const commonIndexSet = new Set<number>();
  for (const question of template.common) {
    assert.ok(!keySet.has(question.key), `duplicate question key: ${question.key}`);
    keySet.add(question.key);
    assert.ok(!commonIndexSet.has(question.index), `duplicate common index: ${question.index}`);
    commonIndexSet.add(question.index);
  }
  for (const section of template.sections) {
    const sectionIndexSet = new Set<number>();
    for (const question of section.questions) {
      assert.ok(!keySet.has(question.key), `duplicate question key: ${question.key}`);
      keySet.add(question.key);
      assert.ok(
        !sectionIndexSet.has(question.index),
        `${section.key} duplicate section question index: ${question.index}`
      );
      sectionIndexSet.add(question.index);
    }
  }
  checks.push("question_key_and_index_uniqueness");

  // case 3) question shape invariants
  for (const question of allQuestions) {
    assert.ok(question.text.trim().length > 0, `${question.key} empty text`);
    if (question.type === "single") {
      assert.ok(question.options.length > 0, `${question.key} single without options`);
    }
    if (question.type === "multi") {
      assert.ok(question.options.length > 0, `${question.key} multi without options`);
      const optionValueSet = new Set<string>();
      for (const option of question.options) {
        assert.ok(!optionValueSet.has(option.value), `${question.key} duplicate option value`);
        optionValueSet.add(option.value);
      }
      const maxSelect = maxSelectForQuestion(question, maxSelectedSections);
      assert.ok(maxSelect >= 1, `${question.key} invalid maxSelect`);
      assert.ok(
        maxSelect <= Math.max(question.options.length, maxSelectedSections),
        `${question.key} maxSelect out of range`
      );
      if (question.noneOptionValue) {
        assert.ok(
          question.options.some((option) => option.value === question.noneOptionValue),
          `${question.key} noneOptionValue not in options`
        );
      }
    }
    if (question.type === "number") {
      if (
        typeof question.constraints?.min === "number" &&
        typeof question.constraints?.max === "number"
      ) {
        assert.ok(question.constraints.min <= question.constraints.max, `${question.key} min > max`);
      }
    }
    if (question.type === "group") {
      assert.ok((question.fields ?? []).length > 0, `${question.key} group fields empty`);
      const fieldSet = new Set<string>();
      for (const field of question.fields ?? []) {
        assert.ok(!fieldSet.has(field.id), `${question.key} duplicate group field id`);
        fieldSet.add(field.id);
      }
    }
  }
  checks.push("question_shape_invariants");

  // case 4) displayIf branch validity
  for (const question of allQuestions) {
    if (!question.displayIf) continue;
    const controller = findQuestion(template, question.displayIf.field);
    const equalsValue = String(question.displayIf.equals);

    const matchAnswers: PublicSurveyAnswers = {
      [controller.key]: equalsValue,
    };
    const missAnswers: PublicSurveyAnswers = {
      [controller.key]:
        controller.type === "single" && controller.options.length > 1
          ? controller.options.find((option) => option.value !== equalsValue)?.value ?? "__MISS__"
          : "__MISS__",
    };
    assert.equal(
      isSurveyQuestionVisible(question, matchAnswers),
      true,
      `${question.key} displayIf true-branch failed`
    );
    assert.equal(
      isSurveyQuestionVisible(question, missAnswers),
      false,
      `${question.key} displayIf false-branch failed`
    );
  }
  checks.push("display_if_branch_validity");

  // case 5) canonical sanitize + strict validate per question
  for (const question of allQuestions) {
    const canonicalRaw = buildCanonicalRawAnswer(question, maxSelectedSections);
    const sanitized = sanitizeSurveyAnswerValue(question, canonicalRaw, maxSelectedSections);
    const error = validateSurveyQuestionAnswer(question, sanitized);
    assert.equal(error, null, `canonical answer invalid for ${question.key}: ${error}`);
  }
  checks.push("canonical_sanitize_and_validate");

  // case 6) sanitize idempotence + non-throw against adversarial payloads
  for (const question of allQuestions) {
    for (let index = 0; index < 20; index += 1) {
      const raw = fuzzRawValue(question, random);
      const sanitized1 = sanitizeSurveyAnswerValue(question, raw, maxSelectedSections);
      const sanitized2 = sanitizeSurveyAnswerValue(question, sanitized1, maxSelectedSections);
      assert.deepEqual(
        sanitized2,
        sanitized1,
        `${question.key} sanitize should be idempotent`
      );

      assert.doesNotThrow(() =>
        validateSurveyQuestionAnswer(question, sanitized1, {
          treatSelectionAsOptional: true,
        })
      );
      assert.doesNotThrow(() => validateSurveyQuestionAnswer(question, raw));
    }
  }
  checks.push("sanitize_idempotence_and_adversarial_non_throw");

  // case 7) multi toggle invariants across all multi questions
  for (const question of allQuestions) {
    if (question.type !== "multi") continue;
    let value: unknown = [];
    const maxSelect = maxSelectForQuestion(question, maxSelectedSections);
    for (const option of question.options) {
      value = toggleSurveyMultiValue(question, value, option.value, maxSelectedSections);
      const selected = toMultiValues(value);
      assert.ok(selected.length <= maxSelect, `${question.key} exceeds max select`);
      if (question.noneOptionValue && selected.includes(question.noneOptionValue)) {
        assert.equal(selected.length, 1, `${question.key} none option exclusivity broken`);
      }
    }
    for (const option of question.options) {
      value = toggleSurveyMultiValue(question, value, option.value, maxSelectedSections);
      const selected = toMultiValues(value);
      assert.ok(selected.length <= maxSelect, `${question.key} exceeds max select on deselect`);
    }
  }
  checks.push("multi_toggle_invariants");

  // case 8) group field normalization guards
  for (const question of allQuestions) {
    if (question.type !== "group") continue;
    const fieldValues = resolveGroupFieldValues(question, { fieldValues: { unknown: "x" } });
    assert.equal(
      Object.keys(fieldValues).length,
      (question.fields ?? []).length,
      `${question.key} group field length mismatch`
    );
    for (const field of question.fields ?? []) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(fieldValues, field.id),
        `${question.key} missing group field value: ${field.id}`
      );
    }
  }
  checks.push("group_field_normalization");

  // case 9) C27 token parsing and cap enforcement
  const c27 = findQuestion(template, "C27");
  assert.equal(c27.type, "multi");
  const tokenPool = [
    ...c27.options.map((option) => option.value),
    ...c27.options.map((option) => option.label),
  ];
  const sectionResolved = resolveSelectedSectionsFromC27(
    template,
    {
      C27: tokenPool,
    },
    ["UNKNOWN", c27.options[0]?.value ?? ""]
  );
  assert.ok(sectionResolved.length <= maxSelectedSections, "C27 resolved length exceeds max");
  assert.ok(sectionResolved.every((sectionKey) => template.sectionCatalog.some((section) => section.key === sectionKey)));
  checks.push("c27_token_resolution_and_cap");

  // case 10) normalize/prune should remove unknown and hidden answers
  const normalized = normalizeSurveyAnswersByTemplate(template, {
    UNKNOWN_KEY: "bad",
    C01: "__INVALID__",
    C04: "A",
    C27: ["S01", "S02", "UNKNOWN", "S03"],
  });
  assert.ok(!Object.prototype.hasOwnProperty.call(normalized, "UNKNOWN_KEY"));
  const normalizedSelected = resolveSelectedSectionsFromC27(template, normalized, []);
  const normalizedList = buildPublicSurveyQuestionList(template, normalized, normalizedSelected);
  const normalizedVisibleKeySet = new Set(normalizedList.map((item) => item.question.key));
  for (const key of Object.keys(normalized)) {
    assert.ok(normalizedVisibleKeySet.has(key), `normalized contains hidden key: ${key}`);
  }
  checks.push("normalize_prune_visibility_guards");

  // case 11) question list composition for each section seed
  for (const section of template.sectionCatalog) {
    const list = buildPublicSurveyQuestionList(template, {}, [section.key], {
      deriveSelectedSections: false,
    });
    const sectionNodes = list.filter((item) => item.sectionKey === section.key);
    const expected = template.sections.find((item) => item.key === section.key)?.questions.length ?? 0;
    assert.equal(sectionNodes.length, expected, `section question count mismatch: ${section.key}`);
  }
  checks.push("section_seed_question_list_composition");

  // case 12) progress bounds on random scenarios
  for (let runIndex = 0; runIndex < 240; runIndex += 1) {
    const randomAnswers: PublicSurveyAnswers = {};
    for (const question of allQuestions) {
      if (random() < 0.58) continue;
      randomAnswers[question.key] = sanitizeSurveyAnswerValue(
        question,
        fuzzRawValue(question, random),
        maxSelectedSections
      );
    }
    const selectedSections = resolveSelectedSectionsFromC27(template, randomAnswers, []);
    const cleanedAnswers = normalizeSurveyAnswersByTemplate(template, randomAnswers);
    const questionList = buildPublicSurveyQuestionList(template, cleanedAnswers, selectedSections);
    const progress = computeSurveyProgress(questionList, cleanedAnswers);

    assert.ok(progress.total >= 0);
    assert.ok(progress.answered >= 0);
    assert.ok(progress.answered <= progress.total);
    assert.ok(progress.requiredAnswered >= 0);
    assert.ok(progress.requiredAnswered <= progress.requiredTotal);
    assert.ok(progress.requiredTotal <= progress.total);
    assert.ok(progress.percent >= 0 && progress.percent <= 100);
  }
  checks.push("progress_bounds_randomized");

  // case 13) random full analysis/build should stay finite and stable
  for (let runIndex = 0; runIndex < 260; runIndex += 1) {
    const answers: PublicSurveyAnswers = {};
    for (const question of allQuestions) {
      if (random() < 0.52) continue;
      answers[question.key] = sanitizeSurveyAnswerValue(
        question,
        fuzzRawValue(question, random),
        maxSelectedSections
      );
    }

    const normalizedAnswers = normalizeSurveyAnswersByTemplate(template, answers);
    const selectedSections = resolveSelectedSectionsFromC27(template, normalizedAnswers, []);
    const analysisInput = buildWellnessAnalysisInputFromSurvey({
      template,
      answers: normalizedAnswers,
      selectedSections,
    });
    const result = computeWellnessResult(analysisInput);

    assert.ok(Number.isFinite(result.overallHealthScore), "overallHealthScore not finite");
    assert.ok(
      Number.isFinite(result.lifestyleRisk.overallPercent),
      "lifestyleRisk overallPercent not finite"
    );
    assert.ok(
      Number.isFinite(result.healthManagementNeed.averagePercent),
      "healthManagementNeed averagePercent not finite"
    );
    assert.ok(result.selectedSections.length <= maxSelectedSections);
  }
  checks.push("random_analysis_and_result_stability");

  // case 14) section-by-section deterministic simulation
  for (const section of template.sectionCatalog) {
    const seedAnswers: PublicSurveyAnswers = {
      C27: sanitizeSurveyAnswerValue(c27, [section.key], maxSelectedSections),
    };
    const questionList = buildPublicSurveyQuestionList(template, seedAnswers, [section.key], {
      deriveSelectedSections: false,
    });
    const fullAnswers: PublicSurveyAnswers = { ...seedAnswers };
    for (const node of questionList) {
      if (Object.prototype.hasOwnProperty.call(fullAnswers, node.question.key)) continue;
      fullAnswers[node.question.key] = sanitizeSurveyAnswerValue(
        node.question,
        buildCanonicalRawAnswer(node.question, maxSelectedSections),
        maxSelectedSections
      );
    }

    for (const node of questionList) {
      const error = validateSurveyQuestionAnswer(node.question, fullAnswers[node.question.key], {
        treatSelectionAsOptional: true,
      });
      assert.equal(error, null, `${section.key} canonical answer invalid: ${node.question.key}`);
      assert.equal(
        isSurveyQuestionAnswered(node.question, fullAnswers[node.question.key]),
        true,
        `${section.key} canonical answer should be marked answered: ${node.question.key}`
      );
    }

    const analysisInput = buildWellnessAnalysisInputFromSurvey({
      template,
      answers: fullAnswers,
      selectedSections: [section.key],
    });
    const result = computeWellnessResult(analysisInput);
    assert.ok(Number.isFinite(result.overallHealthScore));
  }
  checks.push("section_by_section_deterministic_simulation");

  // case 15) all-section request must clamp by maxSelectedSections
  const allSectionsRaw = template.sectionCatalog.map((section) => section.key);
  const allSectionsResolved = resolveSelectedSectionsFromC27(
    template,
    { C27: allSectionsRaw },
    []
  );
  assert.equal(allSectionsResolved.length, maxSelectedSections);
  checks.push("all_section_selection_clamp");

  // case 16) zero-selection path should still produce safe result
  const zeroAnswers: PublicSurveyAnswers = {};
  for (const question of template.common) {
    if (question.type === "number" || question.type === "group") {
      zeroAnswers[question.key] = sanitizeSurveyAnswerValue(
        question,
        buildCanonicalRawAnswer(question, maxSelectedSections),
        maxSelectedSections
      );
      continue;
    }
    zeroAnswers[question.key] = sanitizeSurveyAnswerValue(question, "", maxSelectedSections);
  }
  const zeroInput = buildWellnessAnalysisInputFromSurvey({
    template,
    answers: zeroAnswers,
    selectedSections: [],
  });
  const zeroResult = computeWellnessResult(zeroInput);
  assert.ok(Number.isFinite(zeroResult.overallHealthScore));
  checks.push("zero_selection_safe_result");

  // case 17) normalization should not leave impossible selected values
  for (const question of allQuestions) {
    const sanitized = sanitizeSurveyAnswerValue(
      question,
      fuzzRawValue(question, random),
      maxSelectedSections
    );
    if (question.type === "single") {
      const value = toInputValue(sanitized).trim();
      assert.ok(
        value === "" || question.options.some((option) => option.value === value),
        `${question.key} single sanitized contains impossible value`
      );
    }
    if (question.type === "multi") {
      const values = toMultiValues(sanitized);
      for (const value of values) {
        assert.ok(
          question.options.some((option) => option.value === value),
          `${question.key} multi sanitized contains impossible value`
        );
      }
      assert.ok(values.length <= maxSelectForQuestion(question, maxSelectedSections));
    }
  }
  checks.push("sanitized_value_domain_guards");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks,
        stats: {
          commonQuestions: template.common.length,
          sectionCount: template.sections.length,
          totalQuestions: allQuestions.length,
          randomizedRuns: 240 + 260,
        },
      },
      null,
      2
    )
  );
}

run();
