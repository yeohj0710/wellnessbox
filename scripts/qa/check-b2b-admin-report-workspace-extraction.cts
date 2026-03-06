import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const WORKSPACE_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const workspaceSource = fs.readFileSync(WORKSPACE_PATH, "utf8");

  assert.match(
    clientSource,
    /import B2bAdminReportWorkspace from "\.\/_components\/B2bAdminReportWorkspace";/,
    "B2bAdminReportClient must import B2bAdminReportWorkspace."
  );
  assert.match(
    clientSource,
    /<B2bAdminReportWorkspace[\s\S]*selectedEmployeeId=\{selectedEmployeeId\}[\s\S]*onToggleValidationPreview=\{\(\) => setShowExportPreview\(\(prev\) => !prev\)\}[\s\S]*\/>/,
    "B2bAdminReportClient should render B2bAdminReportWorkspace with selection and validation callbacks."
  );
  checks.push("client_uses_workspace_component");

  assert.ok(
    !/<B2bAdminReportDetailSkeleton/.test(clientSource),
    "Inline detail skeleton markup should be owned by B2bAdminReportWorkspace."
  );
  assert.ok(
    !/<B2bEmployeeOverviewCard/.test(clientSource),
    "Inline employee overview card markup should be owned by B2bAdminReportWorkspace."
  );
  assert.ok(
    !/<B2bAdminReportPreviewPanel/.test(clientSource),
    "Inline report preview panel markup should be owned by B2bAdminReportWorkspace."
  );
  assert.ok(
    !/<B2bSurveyEditorPanel/.test(clientSource),
    "Inline survey editor panel markup should be owned by B2bAdminReportWorkspace."
  );
  assert.ok(
    !/<B2bNoteEditorPanel/.test(clientSource),
    "Inline note editor panel markup should be owned by B2bAdminReportWorkspace."
  );
  assert.ok(
    !/<B2bAnalysisJsonPanel/.test(clientSource),
    "Inline analysis JSON panel markup should be owned by B2bAdminReportWorkspace."
  );
  assert.ok(
    !/<B2bLayoutValidationPanel/.test(clientSource),
    "Inline layout validation panel markup should be owned by B2bAdminReportWorkspace."
  );
  checks.push("client_has_no_inline_workspace_markup");

  assert.match(
    workspaceSource,
    /export default function B2bAdminReportWorkspace/,
    "B2bAdminReportWorkspace should export a default component."
  );
  assert.match(
    workspaceSource,
    /<B2bAdminReportDetailSkeleton/,
    "B2bAdminReportWorkspace should own detail skeleton markup."
  );
  assert.match(
    workspaceSource,
    /<B2bEmployeeOverviewCard/,
    "B2bAdminReportWorkspace should own employee overview card markup."
  );
  assert.match(
    workspaceSource,
    /<B2bAdminReportPreviewPanel/,
    "B2bAdminReportWorkspace should own report preview panel markup."
  );
  assert.match(
    workspaceSource,
    /<B2bSurveyEditorPanel/,
    "B2bAdminReportWorkspace should own survey editor panel markup."
  );
  assert.match(
    workspaceSource,
    /<B2bNoteEditorPanel/,
    "B2bAdminReportWorkspace should own note editor panel markup."
  );
  assert.match(
    workspaceSource,
    /<B2bAnalysisJsonPanel/,
    "B2bAdminReportWorkspace should own analysis JSON panel markup."
  );
  assert.match(
    workspaceSource,
    /<B2bLayoutValidationPanel/,
    "B2bAdminReportWorkspace should own layout validation panel markup."
  );
  checks.push("workspace_owns_detail_markup");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
