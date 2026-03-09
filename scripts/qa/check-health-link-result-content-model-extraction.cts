import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/HealthLinkResultContent.tsx"
);
const MODEL_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/useHealthLinkResultContentModel.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const contentSource = read(CONTENT_PATH);
  const modelSource = read(MODEL_PATH);
  const checks: string[] = [];

  assert.match(
    contentSource,
    /import \{ useHealthLinkResultContentModel \} from "\.\/useHealthLinkResultContentModel";/,
    "HealthLinkResultContent must import useHealthLinkResultContentModel."
  );
  assert.match(
    contentSource,
    /const \{ checkupSectionModel, medicationModel \} =\s*useHealthLinkResultContentModel\(/,
    "HealthLinkResultContent must use useHealthLinkResultContentModel."
  );
  checks.push("content_uses_result_content_model");

  const forbiddenContentTokens = [
    "const sanitizedCheckupRows = React.useMemo(",
    "const groupedRows = React.useMemo(",
    'const [activeGroup, setActiveGroup] = React.useState<MetricGroupId>("all");',
    "const topMedicineLine = topMedicines",
    "const medicationAnalysis = React.useMemo(",
  ];
  for (const token of forbiddenContentTokens) {
    assert.ok(
      !contentSource.includes(token),
      `HealthLinkResultContent should not inline token after extraction: ${token}`
    );
  }
  checks.push("content_keeps_model_logic_out");

  const requiredModelTokens = [
    "export function useHealthLinkResultContentModel(",
    "const sanitizedCheckupRows = React.useMemo(",
    "const groupedRows = React.useMemo(",
    'const [activeGroup, setActiveGroup] = React.useState<MetricGroupId>("all");',
    "const topMedicineLine = React.useMemo(",
    "const medicationAnalysis = React.useMemo(",
    "checkupSectionModel:",
    "medicationModel:",
  ];
  for (const token of requiredModelTokens) {
    assert.ok(
      modelSource.includes(token),
      `Result-content model must own token: ${token}`
    );
  }
  checks.push("model_owns_result_content_state");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
