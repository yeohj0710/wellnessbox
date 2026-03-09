import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_PATH = path.join(ROOT, "lib/b2b/analyzer-health.ts");
const SUPPORT_PATH = path.join(ROOT, "lib/b2b/analyzer-health-metrics.ts");

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const entrySource = read(ENTRY_PATH);
  const supportSource = read(SUPPORT_PATH);
  const checks: string[] = [];

  assert.match(
    entrySource,
    /from "@\/lib\/b2b\/analyzer-health-metrics"/,
    "analyzer-health.ts must import health metric helpers."
  );
  checks.push("entry_imports_health_metric_support");

  for (const token of [
    "function parseBloodPressure(",
    "function inferMetricStatus(",
    "function severityPenalty(",
  ]) {
    assert.ok(
      !entrySource.includes(token),
      `analyzer-health.ts should not keep extracted helper token: ${token}`
    );
  }
  checks.push("entry_no_longer_keeps_metric_helpers");

  for (const token of [
    "export type CoreMetricStatus =",
    "function parseBloodPressure(",
    "export function inferHealthMetricStatus(",
    "export function resolveHealthSeverityPenalty(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `analyzer-health-metrics.ts must own token: ${token}`
    );
  }
  checks.push("support_module_owns_metric_status_rules");

  assert.ok(
    entrySource.includes("inferHealthMetricStatus(metric.key, value)"),
    "analyzer-health.ts must resolve metric status via support helper."
  );
  assert.ok(
    entrySource.includes("resolveHealthSeverityPenalty(metric.status)"),
    "analyzer-health.ts must resolve severity penalty via support helper."
  );
  checks.push("entry_uses_extracted_metric_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
