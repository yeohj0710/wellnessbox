import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const COPY_PATH = path.resolve(process.cwd(), "app/survey/_lib/survey-page-copy.ts");
const PANEL_PROPS_PATH = path.resolve(process.cwd(), "app/survey/_lib/use-survey-page-panel-props.ts");
const PROGRESSION_PATH = path.resolve(process.cwd(), "app/survey/_lib/use-survey-progression-actions.ts");

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const copySource = fs.readFileSync(COPY_PATH, "utf8");
  const panelPropsSource = fs.readFileSync(PANEL_PROPS_PATH, "utf8");
  const progressionSource = fs.readFileSync(PROGRESSION_PATH, "utf8");

  assert.match(
    clientSource,
    /import \{ TEXT \} from "@\/app\/survey\/_lib\/survey-page-copy";/,
    "survey-page-client must import TEXT from survey-page-copy."
  );
  assert.match(panelPropsSource, /import \{ CALCULATING_MESSAGES, TEXT \} from "\.\/survey-page-copy";/);
  assert.match(progressionSource, /import \{ CALCULATING_MESSAGES \} from "\.\/survey-page-copy";/);
  checks.push("survey_modules_import_owned_copy_constants");

  assert.ok(
    !/const TEXT = \{/.test(clientSource),
    "Inline TEXT constant should not remain in survey-page-client."
  );
  assert.ok(
    !/const CALCULATING_MESSAGES = \[/.test(clientSource),
    "Inline CALCULATING_MESSAGES constant should not remain in survey-page-client."
  );
  checks.push("survey_client_has_no_inline_copy_constants");

  assert.match(copySource, /const TEXT = \{/, "survey-page-copy must define TEXT.");
  assert.match(
    copySource,
    /const CALCULATING_MESSAGES = \[/,
    "survey-page-copy must define CALCULATING_MESSAGES."
  );
  assert.match(
    copySource,
    /export \{ TEXT, CALCULATING_MESSAGES \};/,
    "survey-page-copy must export TEXT and CALCULATING_MESSAGES."
  );
  checks.push("copy_file_exports_constants");

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
