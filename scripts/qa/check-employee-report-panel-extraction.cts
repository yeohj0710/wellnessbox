import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const client = fs.readFileSync(
  path.join(ROOT, "app/(features)/employee-report/EmployeeReportClient.tsx"),
  "utf8"
);

const activePanels = [
  "EmployeeReportBootSkeleton",
  "EmployeeReportHeroCard",
  "EmbeddedEmployeeSurveyPanel",
];

for (const panel of activePanels) {
  assert.match(client, new RegExp(`import ${panel}`), `${panel} must be imported.`);
  assert.match(client, new RegExp(`<${panel}`), `${panel} must be rendered.`);
}

const retiredPanels = [
  "EmployeeReportInputFlowPanel",
  "EmployeeReportReadyPanel",
  "EmployeeReportAdminOnlySection",
];

for (const panel of retiredPanels) {
  assert.ok(!client.includes(panel), `${panel} is retired and must not re-enter the active client.`);
}

assert.ok(
  client.includes("data-testid=\"employee-report-summary-section\""),
  "Current workspace report summary contract must remain available."
);

console.log(JSON.stringify({
  ok: true,
  checks: ["active_panels_rendered", "retired_panels_absent", "workspace_summary_contract"],
}, null, 2));
