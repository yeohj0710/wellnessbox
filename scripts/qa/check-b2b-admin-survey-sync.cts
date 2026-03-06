import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildPublicSurveyQuestionList,
  isSurveyQuestionAnswered,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  type PublicSurveyAnswers,
} from "../../lib/b2b/public-survey";
import { loadWellnessTemplateForB2b } from "../../lib/wellness/data-loader";
import type { WellnessSurveyQuestionForTemplate } from "../../lib/wellness/data-template-types";
import {
  buildEditorSections,
  getFocusedQuestionIndex,
} from "../../app/(admin)/admin/b2b-reports/_lib/survey-editor-sections";

const ROOT_DIR = process.cwd();

function readSource(relPath: string) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
}

function assertIncludes(source: string, token: string, label: string) {
  assert.ok(source.includes(token), `[qa:b2b:admin-survey-sync] missing ${label}: ${token}`);
}

function buildDefaultAnswer(
  question: WellnessSurveyQuestionForTemplate,
  maxSelectedSections: number
): unknown {
  if (question.type === "single") return question.options[0]?.value ?? "";
  if (question.type === "multi") {
    if (question.key === "C27") {
      return question.options.slice(0, Math.max(1, maxSelectedSections)).map((option) => option.value);
    }
    return question.options[0] ? [question.options[0].value] : [];
  }
  if (question.type === "number") {
    const min = question.constraints?.min ?? 1;
    const max = question.constraints?.max ?? Math.max(min + 10, 100);
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
          const max = field.constraints?.max ?? Math.max(min + 10, 100);
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

function buildAutoAnsweredSurvey(seedAnswers: PublicSurveyAnswers = {}) {
  const template = loadWellnessTemplateForB2b();
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const answers: PublicSurveyAnswers = { ...seedAnswers };
  let guard = 0;

  while (guard < 2400) {
    guard += 1;
    const selectedSections = resolveSelectedSectionsFromC27(template, answers);
    const questionList = buildPublicSurveyQuestionList(template, answers, selectedSections);
    const pending = questionList.find(
      (node) => !isSurveyQuestionAnswered(node.question, answers[node.question.key])
    );
    if (!pending) break;

    answers[pending.question.key] = sanitizeSurveyAnswerValue(
      pending.question,
      buildDefaultAnswer(pending.question, maxSelectedSections),
      maxSelectedSections
    );
  }

  assert.ok(guard < 2400, "auto answer loop overflow");
  return {
    template,
    answers,
    selectedSections: resolveSelectedSectionsFromC27(template, answers),
  };
}

function runStaticSyncChecks() {
  const adminClient = readSource("app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx");
  assertIncludes(adminClient, "from \"@/lib/b2b/public-survey\"", "public survey import");
  for (const token of [
    "buildPublicSurveyQuestionList",
    "computeSurveyProgress",
    "resolveSelectedSectionsFromC27",
    "sanitizeSurveyAnswerValue",
  ]) {
    assertIncludes(adminClient, token, `admin client token ${token}`);
  }
  assert.ok(
    !adminClient.includes("survey-progress"),
    "[qa:b2b:admin-survey-sync] legacy survey-progress import should not remain"
  );

  const editorPanel = readSource(
    "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx"
  );
  assertIncludes(
    editorPanel,
    "from \"../_lib/survey-editor-sections\"",
    "editor sections helper import"
  );
  for (const token of ["buildEditorSections"]) {
    assertIncludes(editorPanel, token, `editor panel token ${token}`);
  }
  assertIncludes(
    editorPanel,
    "from \"../_lib/use-survey-editor-navigation\"",
    "editor navigation hook import"
  );
  assertIncludes(
    editorPanel,
    "useSurveyEditorNavigation(",
    "editor navigation hook usage"
  );
}

function runRuntimeSyncChecks() {
  const checks: string[] = [];
  const samples = [
    buildAutoAnsweredSurvey(),
    buildAutoAnsweredSurvey({ C01: "B" }),
    buildAutoAnsweredSurvey({ C01: "A" }),
  ];

  for (const [index, sample] of samples.entries()) {
    const groups = buildEditorSections(sample.template, sample.answers, sample.selectedSections);
    const flatKeys = groups.flatMap((group) => group.questions.map((question) => question.key));
    const questionList = buildPublicSurveyQuestionList(
      sample.template,
      sample.answers,
      resolveSelectedSectionsFromC27(sample.template, sample.answers, sample.selectedSections),
      { deriveSelectedSections: false }
    );
    const expectedKeys = questionList.map((node) => node.question.key);
    assert.deepEqual(
      flatKeys,
      expectedKeys,
      `editor section flatten mismatch for sample#${index + 1}`
    );
    checks.push(`group_flatten_matches_public_list_${index + 1}`);

    for (const group of groups) {
      const focused = getFocusedQuestionIndex(group, undefined, sample.answers);
      assert.ok(
        focused >= 0 && focused < group.questions.length,
        `focused index out of bounds for group ${group.key}`
      );
    }
    checks.push(`focused_index_in_bounds_${index + 1}`);
  }

  return checks;
}

function run() {
  runStaticSyncChecks();
  const runtimeChecks = runRuntimeSyncChecks();
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "admin_client_uses_public_survey_helpers",
          "editor_panel_uses_extracted_section_helpers",
          "editor_panel_uses_navigation_hook",
          ...runtimeChecks,
        ],
      },
      null,
      2
    )
  );
}

run();
