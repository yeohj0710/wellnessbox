import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LEGACY_PAGE_PATH = path.join(ROOT, "app/column/editor/page.tsx");
const LEGACY_CLIENT_PATH = path.join(ROOT, "app/column/editor/EditorClient.tsx");
const ADMIN_CLIENT_PATH = path.join(
  ROOT,
  "app/(admin)/admin/column/editor/EditorAdminClient.tsx"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const checks: string[] = [];
  const legacyPageSource = read(LEGACY_PAGE_PATH);
  const adminClientSource = read(ADMIN_CLIENT_PATH);

  assert.ok(
    legacyPageSource.includes('redirect("/admin/column/editor")'),
    "legacy /column/editor page should redirect to the admin editor"
  );
  checks.push("legacy_page_redirects_to_admin_editor");

  assert.equal(
    fs.existsSync(LEGACY_CLIENT_PATH),
    false,
    "legacy standalone column editor client should not exist"
  );
  checks.push("legacy_editor_client_removed");

  assert.ok(
    adminClientSource.includes("useColumnEditorController"),
    "admin editor client should remain the active editor entry point"
  );
  checks.push("admin_editor_client_remains_source_of_truth");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
