import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const SHELL_PATH = path.resolve(process.cwd(), "app/survey/_components/SurveyPageShell.tsx");

function run() {
  const checks: string[] = [];
  const source = fs.readFileSync(CLIENT_PATH, "utf8");
  const shellSource = fs.readFileSync(SHELL_PATH, "utf8");

  assert.match(
    shellSource,
    /import SurveyRenewalModal from "\.\/SurveyRenewalModal";/,
    "SurveyPageShell must import SurveyRenewalModal."
  );
  assert.match(
    shellSource,
    /import SurveyResetConfirmModal from "\.\/SurveyResetConfirmModal";/,
    "SurveyPageShell must import SurveyResetConfirmModal."
  );
  checks.push("survey_imports_modal_components");

  assert.ok(
    !/function renderRenewalModal\(/.test(source),
    "Inline renderRenewalModal implementation should not remain in survey-page-client."
  );
  assert.ok(
    !/function renderResetConfirmModal\(/.test(source),
    "Inline renderResetConfirmModal implementation should not remain in survey-page-client."
  );
  checks.push("survey_has_no_inline_modal_renderers");

  assert.match(
    shellSource,
    /<SurveyRenewalModal \{\.\.\.renewalModalProps\} \/>/,
    "SurveyRenewalModal must be rendered with typed shell props."
  );
  assert.match(
    shellSource,
    /<SurveyResetConfirmModal \{\.\.\.resetConfirmModalProps\} \/>/,
    "SurveyResetConfirmModal must be rendered with typed shell props."
  );
  checks.push("survey_renders_modal_components");

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
