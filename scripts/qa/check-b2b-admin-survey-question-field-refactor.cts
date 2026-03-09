import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const FIELD_FILE = path.join(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx"
);
const RENDERER_FILE = path.join(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.renderers.tsx"
);
const SHARED_FILE = path.join(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.shared.tsx"
);
const HELPER_FILE = path.join(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.helpers.ts"
);

const MOJIBAKE_MARKER_REGEX = /\?[가-힣]|�/;

function run() {
  const fieldSource = fs.readFileSync(FIELD_FILE, "utf8");
  const rendererSource = fs.readFileSync(RENDERER_FILE, "utf8");
  const sharedSource = fs.readFileSync(SHARED_FILE, "utf8");
  const helperSource = fs.readFileSync(HELPER_FILE, "utf8");
  const checks: string[] = [];

  for (const token of [
    "export function MultiChoiceQuestionField(",
    "export function SingleChoiceQuestionField(",
    "export function NumberQuestionField(",
    "export function GroupQuestionField(",
    "export function TextQuestionField(",
  ]) {
    assert.ok(
      rendererSource.includes(token),
      `[qa:b2b:admin-survey-question-field-refactor] missing renderer component: ${token}`
    );
  }
  checks.push("question_field_extracts_type_specific_renderers");

  for (const token of [
    "export type SurveyQuestionFieldProps = {",
    "export type SharedRendererProps = {",
    "export function QuestionCard(",
    "export function VariantSelector(",
  ]) {
    assert.ok(
      sharedSource.includes(token),
      `[qa:b2b:admin-survey-question-field-refactor] missing shared primitive: ${token}`
    );
  }
  checks.push("question_field_extracts_shared_primitives");

  assert.ok(
    fieldSource.includes("switch (question.type)"),
    "[qa:b2b:admin-survey-question-field-refactor] dispatcher switch must exist."
  );
  for (const token of [
    "<MultiChoiceQuestionField {...sharedProps} />",
    "<SingleChoiceQuestionField {...sharedProps} />",
    "<NumberQuestionField {...sharedProps} />",
    "<GroupQuestionField {...sharedProps} />",
    "<TextQuestionField {...sharedProps} />",
  ]) {
    assert.ok(
      fieldSource.includes(token),
      `[qa:b2b:admin-survey-question-field-refactor] missing dispatcher branch: ${token}`
    );
  }
  checks.push("question_field_dispatches_to_extracted_renderers");

  for (const [source, label] of [
    [fieldSource, "SurveyQuestionField.tsx"],
    [rendererSource, "SurveyQuestionField.renderers.tsx"],
    [sharedSource, "SurveyQuestionField.shared.tsx"],
    [helperSource, "SurveyQuestionField.helpers.ts"],
  ] as const) {
    assert.ok(
      !MOJIBAKE_MARKER_REGEX.test(source),
      `[qa:b2b:admin-survey-question-field-refactor] possible mojibake marker found in ${label}`
    );
  }
  checks.push("question_field_modules_have_no_mojibake_markers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
