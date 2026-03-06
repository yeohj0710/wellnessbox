import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const ADMIN_GATE_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_components/EmployeeReportAdminOnlyGate.tsx"
);
const CAPTURE_PREVIEW_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_components/EmployeeReportCapturePreview.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const adminGateSource = fs.readFileSync(ADMIN_GATE_PATH, "utf8");
  const capturePreviewSource = fs.readFileSync(CAPTURE_PREVIEW_PATH, "utf8");

  assert.match(
    clientSource,
    /import EmployeeReportAdminOnlyGate from "\.\/_components\/EmployeeReportAdminOnlyGate";/,
    "EmployeeReportClient must import EmployeeReportAdminOnlyGate."
  );
  assert.match(
    clientSource,
    /import EmployeeReportCapturePreview from "\.\/_components\/EmployeeReportCapturePreview";/,
    "EmployeeReportClient must import EmployeeReportCapturePreview."
  );
  checks.push("client_imports_extracted_components");

  assert.match(
    clientSource,
    /<EmployeeReportAdminOnlyGate[\s\S]*contactEmail="wellnessbox\.me@gmail\.com"[\s\S]*\/>/,
    "EmployeeReportClient should render EmployeeReportAdminOnlyGate with contactEmail."
  );
  assert.match(
    clientSource,
    /<EmployeeReportCapturePreview[\s\S]*captureRef=\{webReportCaptureRef\}[\s\S]*\/>/,
    "EmployeeReportClient should render EmployeeReportCapturePreview with captureRef."
  );
  checks.push("client_uses_extracted_components");

  assert.ok(
    !/className=\{styles\.adminOnlyGateCard\}/.test(clientSource),
    "Inline admin-only gate card markup should not remain in EmployeeReportClient."
  );
  assert.ok(
    !/data-testid="report-capture-surface"/.test(clientSource),
    "Inline report-capture-surface markup should not remain in EmployeeReportClient."
  );
  checks.push("client_has_no_inline_panel_markup");

  assert.match(
    adminGateSource,
    /export default function EmployeeReportAdminOnlyGate/,
    "EmployeeReportAdminOnlyGate should export a default component."
  );
  assert.match(
    capturePreviewSource,
    /export default function EmployeeReportCapturePreview/,
    "EmployeeReportCapturePreview should export a default component."
  );
  checks.push("components_export_defaults");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
