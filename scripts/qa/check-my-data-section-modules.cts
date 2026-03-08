import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const checks: string[] = [];
  const facadeSource = read("app/my-data/myDataPageSections.tsx");
  const overviewSource = read("app/my-data/myDataPageOverviewSections.tsx");
  const orderSource = read("app/my-data/myDataPageOrderSection.tsx");
  const resultSource = read("app/my-data/myDataPageResultSections.tsx");
  const chatSource = read("app/my-data/myDataPageChatSection.tsx");
  const pageSource = read("app/my-data/page.tsx");

  for (const token of [
    'from "./myDataPageOverviewSections"',
    'from "./myDataPageOrderSection"',
    'from "./myDataPageResultSections"',
    'from "./myDataPageChatSection"',
  ]) {
    assert.ok(
      facadeSource.includes(token),
      `[qa:my-data:section-modules] missing facade re-export: ${token}`
    );
  }
  assert.ok(
    !facadeSource.includes("formatActorSourceBadge"),
    "[qa:my-data:section-modules] facade should stay thin"
  );
  checks.push("sections_facade_reexports_focused_modules");

  for (const token of [
    "export function MyDataLockedNotice(",
    "export function MyDataHeader(",
    "export function MyDataMetrics(",
    "export function MyDataAccountSection(",
    "export function MyDataSessionProfileSection(",
  ]) {
    assert.ok(
      overviewSource.includes(token),
      `[qa:my-data:section-modules] missing overview token: ${token}`
    );
  }
  checks.push("overview_module_owns_header_account_blocks");

  assert.ok(
    orderSource.includes("export function MyDataOrdersSection("),
    "[qa:my-data:section-modules] order module should own orders section"
  );
  checks.push("order_module_owns_orders_section");

  for (const token of [
    "export function MyDataAssessmentSection(",
    "export function MyDataCheckAiSection(",
    "normalizeAssessmentResult",
    "normalizeCheckAiResult",
  ]) {
    assert.ok(
      resultSource.includes(token),
      `[qa:my-data:section-modules] missing result token: ${token}`
    );
  }
  checks.push("result_module_owns_assessment_and_check_ai_sections");

  for (const token of [
    "export function MyDataChatSection(",
    "formatChatRoleLabel",
    "formatChatScopeLabel",
    "formatChatStatusLabel",
  ]) {
    assert.ok(
      chatSource.includes(token),
      `[qa:my-data:section-modules] missing chat token: ${token}`
    );
  }
  checks.push("chat_module_owns_chat_section");

  assert.ok(
    pageSource.includes('} from "./myDataPageSections";'),
    "[qa:my-data:section-modules] page should keep importing the stable sections facade"
  );
  checks.push("page_keeps_stable_sections_import_surface");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
