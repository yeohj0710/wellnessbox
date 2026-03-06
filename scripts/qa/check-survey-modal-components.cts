import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");

function run() {
  const checks: string[] = [];
  const source = fs.readFileSync(CLIENT_PATH, "utf8");

  assert.match(
    source,
    /import SurveyRenewalModal from "\.\/_components\/SurveyRenewalModal";/,
    "survey-page-client must import SurveyRenewalModal."
  );
  assert.match(
    source,
    /import SurveyResetConfirmModal from "\.\/_components\/SurveyResetConfirmModal";/,
    "survey-page-client must import SurveyResetConfirmModal."
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
    source,
    /<SurveyRenewalModal[\s\S]*open=\{isRenewalModalOpen\}/,
    "SurveyRenewalModal must be rendered with isRenewalModalOpen binding."
  );
  assert.match(
    source,
    /<SurveyResetConfirmModal[\s\S]*open=\{isResetConfirmModalOpen\}/,
    "SurveyResetConfirmModal must be rendered with isResetConfirmModalOpen binding."
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
