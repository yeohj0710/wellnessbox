import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const FIELD_FILE = path.join(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx"
);
const HELPER_FILE = path.join(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.helpers.ts"
);

function run() {
  const fieldSource = fs.readFileSync(FIELD_FILE, "utf8");
  const helperSource = fs.readFileSync(HELPER_FILE, "utf8");
  const checks: string[] = [];

  for (const token of [
    "function MultiChoiceQuestionField(",
    "function SingleChoiceQuestionField(",
    "function NumberQuestionField(",
    "function GroupQuestionField(",
    "function TextQuestionField(",
  ]) {
    assert.ok(
      fieldSource.includes(token),
      `[qa:b2b:admin-survey-question-field-refactor] missing renderer component: ${token}`
    );
  }
  checks.push("question_field_extracts_type_specific_renderers");

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

  assert.ok(
    !/\?[가-힣]/.test(fieldSource),
    "[qa:b2b:admin-survey-question-field-refactor] possible mojibake marker found in SurveyQuestionField.tsx"
  );
  assert.ok(
    !/\?[가-힣]/.test(helperSource),
    "[qa:b2b:admin-survey-question-field-refactor] possible mojibake marker found in SurveyQuestionField.helpers.ts"
  );
  checks.push("question_field_and_helper_have_no_mojibake_markers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
