import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-selection-lifecycle.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useB2bEmployeeDataSelectionLifecycle\(/,
    "B2bAdminEmployeeDataClient must use useB2bEmployeeDataSelectionLifecycle."
  );
  checks.push("client_uses_selection_lifecycle_hook");

  const removedInlineFns = ["loadEmployeeList", "loadEmployeeOps", "refreshCurrentEmployee"];
  for (const fnName of removedInlineFns) {
    assert.ok(
      !new RegExp(`async function ${fnName}\\(`).test(clientSource),
      `B2bAdminEmployeeDataClient should not keep ${fnName} inline.`
    );
  }
  checks.push("client_has_no_inline_selection_lifecycle_fns");

  assert.match(
    hookSource,
    /export function useB2bEmployeeDataSelectionLifecycle/,
    "Selection lifecycle hook should export useB2bEmployeeDataSelectionLifecycle."
  );
  assert.match(
    hookSource,
    /fetchEmployees\(/,
    "Selection lifecycle hook should own employee list fetching."
  );
  assert.match(
    hookSource,
    /fetchEmployeeOps\(/,
    "Selection lifecycle hook should own employee detail fetching."
  );
  checks.push("hook_owns_list_and_detail_fetching");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
