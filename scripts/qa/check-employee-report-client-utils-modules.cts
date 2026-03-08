import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const checks: string[] = [];
  const facadeSource = read("app/(features)/employee-report/_lib/client-utils.ts");
  const identitySource = read(
    "app/(features)/employee-report/_lib/client-utils.identity.ts"
  );
  const requestSource = read(
    "app/(features)/employee-report/_lib/client-utils.request.ts"
  );
  const guidanceSource = read(
    "app/(features)/employee-report/_lib/client-utils.guidance.ts"
  );
  const pdfSource = read("app/(features)/employee-report/_lib/client-utils.pdf.ts");
  const formatSource = read(
    "app/(features)/employee-report/_lib/client-utils.format.ts"
  );

  for (const token of [
    'export * from "./client-utils.identity";',
    'export * from "./client-utils.request";',
    'export * from "./client-utils.guidance";',
    'export * from "./client-utils.pdf";',
    'export * from "./client-utils.format";',
  ]) {
    assert.ok(
      facadeSource.includes(token),
      `[qa:employee-report-client-utils-modules] missing facade export: ${token}`
    );
  }
  for (const legacyToken of [
    "const LS_KEY =",
    "export async function requestJson<",
    "export function buildSyncGuidance(",
  ]) {
    assert.ok(
      !facadeSource.includes(legacyToken),
      `[qa:employee-report-client-utils-modules] facade should stay thin: ${legacyToken}`
    );
  }
  checks.push("client_utils_facade_stays_thin");

  for (const token of [
    "const LS_KEY =",
    "export function readStoredIdentityWithSource(",
    "export function resolveIdentityPrimaryActionLabel(",
  ]) {
    assert.ok(
      identitySource.includes(token),
      `[qa:employee-report-client-utils-modules] missing identity token: ${token}`
    );
  }
  checks.push("identity_module_owns_storage_and_identity_normalization");

  for (const token of [
    "export class ApiRequestError extends Error",
    "export async function requestJson<",
    'code: "CLIENT_TIMEOUT"',
    'code: "NETWORK_ERROR"',
  ]) {
    assert.ok(
      requestSource.includes(token),
      `[qa:employee-report-client-utils-modules] missing request token: ${token}`
    );
  }
  checks.push("request_module_owns_network_resilience");

  for (const token of [
    "export function buildSyncGuidance(",
    "export function resolveMedicationStatusMessage(",
    "export function parseLayoutDsl(",
    "DB_SCHEMA_MISMATCH",
    "DB_POOL_TIMEOUT",
  ]) {
    assert.ok(
      guidanceSource.includes(token),
      `[qa:employee-report-client-utils-modules] missing guidance token: ${token}`
    );
  }
  checks.push("guidance_module_owns_sync_and_report_helpers");

  assert.ok(
    pdfSource.includes("export async function downloadPdf("),
    "[qa:employee-report-client-utils-modules] pdf module should own downloadPdf"
  );
  assert.ok(
    formatSource.includes("export function formatDateTime(") &&
      formatSource.includes("export function formatRelativeTime("),
    "[qa:employee-report-client-utils-modules] format module should own date helpers"
  );
  checks.push("pdf_and_format_modules_remain_focused");

  const clientSource = read("app/(features)/employee-report/EmployeeReportClient.tsx");
  const apiSource = read("app/(features)/employee-report/_lib/api.ts");
  const syncFlowSource = read("app/(features)/employee-report/_lib/sync-flow.ts");
  const reportLoadingSource = read(
    "app/(features)/employee-report/_lib/use-employee-report-report-loading.ts"
  );
  const sessionBootstrapSource = read(
    "app/(features)/employee-report/_lib/use-employee-report-session-bootstrap.ts"
  );
  const signSyncSource = read(
    "app/(features)/employee-report/_lib/use-employee-report-sign-sync-action.ts"
  );
  const pdfDownloadSource = read(
    "app/(features)/employee-report/_lib/pdf-download.ts"
  );

  for (const [source, token] of [
    [clientSource, 'from "./_lib/client-utils.identity"'],
    [clientSource, 'from "./_lib/client-utils.guidance"'],
    [apiSource, 'from "./client-utils.identity"'],
    [apiSource, 'from "./client-utils.request"'],
    [syncFlowSource, 'from "./client-utils.identity"'],
    [syncFlowSource, 'from "./client-utils.guidance"'],
    [syncFlowSource, 'from "./client-utils.request"'],
    [reportLoadingSource, 'from "./client-utils.identity"'],
    [reportLoadingSource, 'from "./client-utils.request"'],
    [sessionBootstrapSource, 'from "./client-utils.identity"'],
    [signSyncSource, 'from "./client-utils.guidance"'],
    [signSyncSource, 'from "./client-utils.request"'],
    [signSyncSource, 'from "./client-utils.format"'],
    [pdfDownloadSource, 'from "./client-utils.pdf"'],
  ] as const) {
    assert.ok(
      source.includes(token),
      `[qa:employee-report-client-utils-modules] missing focused import: ${token}`
    );
  }
  checks.push("feature_code_imports_focused_modules_directly");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
