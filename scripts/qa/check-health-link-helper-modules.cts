import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FACADE_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/HealthLinkResultSection.helpers.tsx"
);
const METRIC_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/HealthLinkResultSection.metric-helpers.tsx"
);
const MEDICATION_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/HealthLinkResultSection.medication-helpers.ts"
);
const FAILURE_PATH = path.join(
  ROOT,
  "app/(features)/health-link/components/HealthLinkResultSection.failure-helpers.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const facadeSource = read(FACADE_PATH);
  const metricSource = read(METRIC_PATH);
  const medicationSource = read(MEDICATION_PATH);
  const failureSource = read(FAILURE_PATH);
  const checks: string[] = [];

  assert.match(
    facadeSource,
    /export \* from "\.\/HealthLinkResultSection\.metric-helpers";/,
    "Helpers facade must re-export metric helpers."
  );
  assert.match(
    facadeSource,
    /export \* from "\.\/HealthLinkResultSection\.medication-helpers";/,
    "Helpers facade must re-export medication helpers."
  );
  assert.match(
    facadeSource,
    /export \* from "\.\/HealthLinkResultSection\.failure-helpers";/,
    "Helpers facade must re-export failure helpers."
  );
  checks.push("facade_reexports_split_modules");

  const forbiddenFacadeTokens = [
    "const METRIC_GROUPS",
    "export function buildMedicationAnalysisModel(",
    "export function isSkippableFailure(",
    "export function renderMetricCards(",
  ];
  for (const token of forbiddenFacadeTokens) {
    assert.ok(
      !facadeSource.includes(token),
      `Helpers facade should not inline token after extraction: ${token}`
    );
  }
  checks.push("facade_stays_thin");

  const metricTokens = [
    "const METRIC_GROUPS",
    "export function buildMetricGroups(",
    "export function buildMetricInsightCards(",
    "export function buildMetricTabs(",
    "export function renderMetricCards(",
    "export function resolveAiRiskLabel(",
  ];
  for (const token of metricTokens) {
    assert.ok(
      metricSource.includes(token),
      `Metric helper module must own token: ${token}`
    );
  }
  checks.push("metric_module_owns_metric_logic");

  const medicationTokens = [
    "export function normalizeCompactText(",
    "export function buildMedicationAnalysisModel(",
    'label: "복약 이력"',
  ];
  for (const token of medicationTokens) {
    assert.ok(
      medicationSource.includes(token),
      `Medication helper module must own token: ${token}`
    );
  }
  checks.push("medication_module_owns_medication_logic");

  const failureTokens = [
    "export function isSkippableFailure(",
    "export function toFriendlyFailureMessage(",
    '.replace(/failed/gi, "지연")',
  ];
  for (const token of failureTokens) {
    assert.ok(
      failureSource.includes(token),
      `Failure helper module must own token: ${token}`
    );
  }
  checks.push("failure_module_owns_failure_logic");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
