import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const ACTIONS_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(ACTIONS_HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /import \{ useB2bAdminReportActions \} from "\.\/_lib\/use-b2b-admin-report-actions";/,
    "B2bAdminReportClient must import useB2bAdminReportActions."
  );
  assert.match(
    clientSource,
    /const \{[\s\S]*handleSaveSurvey,[\s\S]*handleExportPdf,[\s\S]*\} = useB2bAdminReportActions\(/,
    "B2bAdminReportClient should obtain action handlers from the extracted hook."
  );
  checks.push("client_uses_actions_hook");

  assert.ok(
    !/async function handleSaveSurvey\(/.test(clientSource),
    "Survey save action should not stay inline in B2bAdminReportClient."
  );
  assert.ok(
    !/async function handleExportPdf\(/.test(clientSource),
    "Export action should not stay inline in B2bAdminReportClient."
  );
  assert.ok(
    !/function toggleSection\(/.test(clientSource),
    "Section toggle logic should not stay inline in B2bAdminReportClient."
  );
  checks.push("client_has_no_inline_action_handlers");

  assert.match(
    hookSource,
    /export function useB2bAdminReportActions\(/,
    "Action hook module should export useB2bAdminReportActions."
  );
  assert.match(
    hookSource,
    /useB2bAdminReportCrudActions\(/,
    "Action hook should compose CRUD actions via sub-hook."
  );
  assert.match(
    hookSource,
    /useB2bAdminReportExportActions\(/,
    "Action hook should compose export actions via sub-hook."
  );
  assert.match(
    hookSource,
    /useB2bAdminReportSurveyInputActions\(/,
    "Action hook should compose survey input actions via sub-hook."
  );
  assert.match(
    hookSource,
    /useB2bAdminReportEditorStateActions\(/,
    "Action hook should compose editor state actions via sub-hook."
  );
  assert.ok(
    !/const handleSaveSurvey = useCallback\(/.test(hookSource),
    "Main action hook should not keep large save handlers inline after sub-hook extraction."
  );
  assert.ok(
    !/const handleExportPdf = useCallback\(/.test(hookSource),
    "Main action hook should not keep export handlers inline after sub-hook extraction."
  );
  assert.ok(
    !/const toggleSection = useCallback\(/.test(hookSource),
    "Main action hook should not keep survey toggle logic inline after sub-hook extraction."
  );
  checks.push("hook_owns_action_logic");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
