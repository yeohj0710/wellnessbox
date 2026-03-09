import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ENTRY_PATH = path.resolve(ROOT_DIR, "lib/b2b/export/web-route-pdf.ts");
const CONFIG_PATH = path.resolve(ROOT_DIR, "lib/b2b/export/web-route-pdf.config.ts");
const PAGE_PATH = path.resolve(ROOT_DIR, "lib/b2b/export/web-route-pdf-page.ts");

function run() {
  const entrySource = fs.readFileSync(ENTRY_PATH, "utf8");
  const configSource = fs.readFileSync(CONFIG_PATH, "utf8");
  const pageSource = fs.readFileSync(PAGE_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    entrySource,
    /from "@\/lib\/b2b\/export\/web-route-pdf\.config"/,
    "web-route-pdf.ts must import config helpers from web-route-pdf.config.ts."
  );
  assert.match(
    entrySource,
    /from "@\/lib\/b2b\/export\/web-route-pdf-page"/,
    "web-route-pdf.ts must import page helpers from web-route-pdf-page.ts."
  );
  checks.push("entry_imports_config_and_page_helpers");

  for (const token of [
    "const DEFAULT_VIEWPORT =",
    "const NAV_TIMEOUT_MS =",
    "const RENDER_TIMEOUT_MS =",
    "const DEFAULT_PDF_DEVICE_SCALE_FACTOR =",
    "function normalizeViewportWidthPx(",
    "function resolvePdfDeviceScaleFactor(",
    "function resolvePdfMaxBytes(",
    "function resolvePdfPageMarginPx(",
    "function clampReportPageSizePx(",
    "async function resolveReportPageSize(",
    "async function applyPdfRenderOverrides(",
  ]) {
    assert.ok(
      !entrySource.includes(token),
      `[qa:b2b:export-web-route-pdf-modules] web-route-pdf.ts should not keep extracted helper: ${token}`
    );
  }
  checks.push("entry_no_longer_keeps_inline_settings_or_page_helpers");

  for (const token of [
    "export const WEB_ROUTE_PDF_DEFAULT_VIEWPORT =",
    "export const WEB_ROUTE_PDF_NAV_TIMEOUT_MS =",
    "export const WEB_ROUTE_PDF_RENDER_TIMEOUT_MS =",
    "export function normalizeWebRoutePdfViewportWidthPx(",
    "export function resolveWebRoutePdfDeviceScaleFactor(",
    "export function resolveWebRoutePdfMaxBytes(",
    "export function resolveWebRoutePdfPageMarginPx(",
  ]) {
    assert.ok(
      configSource.includes(token),
      `[qa:b2b:export-web-route-pdf-modules] config module missing token: ${token}`
    );
  }
  checks.push("config_module_owns_pdf_render_settings");

  for (const token of [
    "export type WebRouteReportPageSize =",
    "export async function resolveWebRouteReportPageSize(",
    "export async function applyWebRoutePdfRenderOverrides(",
  ]) {
    assert.ok(
      pageSource.includes(token),
      `[qa:b2b:export-web-route-pdf-modules] page module missing token: ${token}`
    );
  }
  checks.push("page_module_owns_report_page_measurement_and_render_overrides");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
