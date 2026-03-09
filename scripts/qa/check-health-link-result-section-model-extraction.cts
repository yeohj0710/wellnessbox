import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SECTION_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/HealthLinkResultSection.tsx"
);
const MODEL_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/useHealthLinkResultSectionModel.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const sectionSource = read(SECTION_PATH);
  const modelSource = read(MODEL_PATH);
  const checks: string[] = [];

  assert.match(
    sectionSource,
    /import \{ useHealthLinkResultSectionModel \} from "\.\/useHealthLinkResultSectionModel";/,
    "HealthLinkResultSection must import useHealthLinkResultSectionModel."
  );
  assert.match(
    sectionSource,
    /const \{\s*sessionExpiredBlocking,[\s\S]*loadingProgressPercent,\s*\} = useHealthLinkResultSectionModel\(/,
    "HealthLinkResultSection must use useHealthLinkResultSectionModel."
  );
  checks.push("section_uses_result_section_model");

  const forbiddenSectionTokens = [
    "const hasCheckupRows = latestCheckupRows.length > 0;",
    "const hasMedicationRows = medicationDigest.totalRows > 0;",
    "const sessionExpiredFailure = hasNhisSessionExpiredFailure(fetchFailures);",
    "const visibleFailures = fetchFailures.filter(",
    "const [fetchLoadingElapsedSec, setFetchLoadingElapsedSec] = React.useState(0);",
    "const loadingProgressPercent = Math.min(",
  ];
  for (const token of forbiddenSectionTokens) {
    assert.ok(
      !sectionSource.includes(token),
      `HealthLinkResultSection should not inline token after extraction: ${token}`
    );
  }
  checks.push("section_keeps_model_logic_out");

  const requiredModelTokens = [
    "export function useHealthLinkResultSectionModel(",
    "const hasCheckupRows = latestCheckupRows.length > 0;",
    "const hasMedicationRows = medicationDigest.totalRows > 0;",
    "const sessionExpiredFailure = hasNhisSessionExpiredFailure(fetchFailures);",
    "const [fetchLoadingElapsedSec, setFetchLoadingElapsedSec] = React.useState(0);",
    "const loadingProgressPercent = Math.min(",
  ];
  for (const token of requiredModelTokens) {
    assert.ok(
      modelSource.includes(token),
      `Result-section model must own token: ${token}`
    );
  }
  checks.push("model_owns_result_section_derived_state");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
