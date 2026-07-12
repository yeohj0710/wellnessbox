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
const PREVIEW_PANEL_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportPreviewPanel.tsx"
);
const LOADED_WORKSPACE_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.loaded.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const workspaceSource = fs.readFileSync(WORKSPACE_PATH, "utf8");
  const loadedWorkspaceSource = fs.readFileSync(LOADED_WORKSPACE_PATH, "utf8");
  const previewPanelSource = fs.readFileSync(PREVIEW_PANEL_PATH, "utf8");

  assert.match(
    clientSource,
    /import B2bAdminReportWorkspace from "\.\/_components\/B2bAdminReportWorkspace";/,
    "B2bAdminReportClient must use workspace extraction."
  );
  assert.ok(
    !/import B2bAdminReportPreviewPanel from "\.\/_components\/B2bAdminReportPreviewPanel";/.test(
      clientSource
    ),
    "B2bAdminReportClient should not import B2bAdminReportPreviewPanel directly."
  );
  checks.push("client_delegates_preview_panel_to_workspace");

  assert.match(
    loadedWorkspaceSource,
    /import B2bAdminReportPreviewPanel from "\.\/B2bAdminReportPreviewPanel";/,
    "The loaded workspace must import B2bAdminReportPreviewPanel."
  );
  assert.match(
    loadedWorkspaceSource,
    /<B2bAdminReportPreviewPanel[\s\S]*latestPayload=\{content\.latestReport\?\.payload\}[\s\S]*captureRef=\{content\.captureRef\}[\s\S]*\/>/,
    "The loaded workspace should render the preview panel with report and capture props."
  );
  checks.push("workspace_owns_preview_panel_mount");

  assert.match(
    previewPanelSource,
    /export default function B2bAdminReportPreviewPanel/,
    "B2bAdminReportPreviewPanel should export a default component."
  );
  assert.match(
    previewPanelSource,
    /data-testid="report-capture-surface"/,
    "B2bAdminReportPreviewPanel should own report capture surface markup."
  );
  checks.push("preview_panel_owns_capture_markup");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
