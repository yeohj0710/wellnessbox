import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const INPUT_FLOW_PANEL_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_components/EmployeeReportInputFlowPanel.tsx"
);
const READY_PANEL_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_components/EmployeeReportReadyPanel.tsx"
);
const ADMIN_ONLY_PANEL_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_components/EmployeeReportAdminOnlySection.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const inputFlowPanelSource = fs.readFileSync(INPUT_FLOW_PANEL_PATH, "utf8");
  const readyPanelSource = fs.readFileSync(READY_PANEL_PATH, "utf8");
  const adminOnlyPanelSource = fs.readFileSync(ADMIN_ONLY_PANEL_PATH, "utf8");

  assert.match(
    clientSource,
    /import EmployeeReportInputFlowPanel from "\.\/_components\/EmployeeReportInputFlowPanel";/,
    "EmployeeReportClient must import EmployeeReportInputFlowPanel."
  );
  assert.match(
    clientSource,
    /import EmployeeReportReadyPanel from "\.\/_components\/EmployeeReportReadyPanel";/,
    "EmployeeReportClient must import EmployeeReportReadyPanel."
  );
  assert.match(
    clientSource,
    /import EmployeeReportAdminOnlySection from "\.\/_components\/EmployeeReportAdminOnlySection";/,
    "EmployeeReportClient must import EmployeeReportAdminOnlySection."
  );
  checks.push("client_imports_flow_panels");

  assert.match(
    clientSource,
    /<EmployeeReportInputFlowPanel[\s\S]*primaryActionLabel=\{identityPrimaryActionLabel\}[\s\S]*\/>/,
    "EmployeeReportClient should render EmployeeReportInputFlowPanel with identityPrimaryActionLabel."
  );
  assert.match(
    clientSource,
    /<EmployeeReportReadyPanel[\s\S]*captureRef=\{webReportCaptureRef\}[\s\S]*\/>/,
    "EmployeeReportClient should render EmployeeReportReadyPanel with captureRef."
  );
  assert.match(
    clientSource,
    /<EmployeeReportAdminOnlySection \/>/,
    "EmployeeReportClient should render EmployeeReportAdminOnlySection."
  );
  checks.push("client_uses_flow_panels");

  assert.ok(
    !/import EmployeeReportIdentitySection/.test(clientSource),
    "EmployeeReportClient should not directly import EmployeeReportIdentitySection."
  );
  assert.ok(
    !/import EmployeeReportSummaryHeaderCard/.test(clientSource),
    "EmployeeReportClient should not directly import EmployeeReportSummaryHeaderCard."
  );
  assert.ok(
    !/import EmployeeReportSyncGuidanceNotice/.test(clientSource),
    "EmployeeReportClient should not directly import EmployeeReportSyncGuidanceNotice."
  );
  assert.ok(
    !/import EmployeeReportCapturePreview/.test(clientSource),
    "EmployeeReportClient should not directly import EmployeeReportCapturePreview."
  );
  assert.ok(
    !/import EmployeeReportAdminOnlyGate/.test(clientSource),
    "EmployeeReportClient should not directly import EmployeeReportAdminOnlyGate."
  );
  checks.push("client_keeps_leaf_panels_out");

  assert.match(
    inputFlowPanelSource,
    /import EmployeeReportIdentitySection from "\.\/EmployeeReportIdentitySection";/,
    "EmployeeReportInputFlowPanel should compose EmployeeReportIdentitySection."
  );
  assert.match(
    inputFlowPanelSource,
    /import EmployeeReportSyncGuidanceNotice from "\.\/EmployeeReportSyncGuidanceNotice";/,
    "EmployeeReportInputFlowPanel should compose EmployeeReportSyncGuidanceNotice."
  );
  assert.match(
    readyPanelSource,
    /import EmployeeReportSummaryHeaderCard from "\.\/EmployeeReportSummaryHeaderCard";/,
    "EmployeeReportReadyPanel should compose EmployeeReportSummaryHeaderCard."
  );
  assert.match(
    readyPanelSource,
    /import EmployeeReportSyncGuidanceNotice from "\.\/EmployeeReportSyncGuidanceNotice";/,
    "EmployeeReportReadyPanel should compose EmployeeReportSyncGuidanceNotice."
  );
  assert.match(
    readyPanelSource,
    /import EmployeeReportCapturePreview from "\.\/EmployeeReportCapturePreview";/,
    "EmployeeReportReadyPanel should compose EmployeeReportCapturePreview."
  );
  assert.match(
    adminOnlyPanelSource,
    /import EmployeeReportAdminOnlyGate from "\.\/EmployeeReportAdminOnlyGate";/,
    "EmployeeReportAdminOnlySection should compose EmployeeReportAdminOnlyGate."
  );
  checks.push("panels_compose_leaf_components");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
