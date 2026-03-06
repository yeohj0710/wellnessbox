import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-busy-action.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useB2bEmployeeDataBusyAction\(/,
    "B2bAdminEmployeeDataClient must use useB2bEmployeeDataBusyAction."
  );
  checks.push("client_uses_busy_action_hook");

  assert.ok(
    !/function beginBusy\(/.test(clientSource),
    "B2bAdminEmployeeDataClient should not keep beginBusy inline."
  );
  assert.ok(
    !/function endBusy\(/.test(clientSource),
    "B2bAdminEmployeeDataClient should not keep endBusy inline."
  );
  checks.push("client_has_no_inline_busy_helpers");

  assert.match(
    hookSource,
    /export function useB2bEmployeeDataBusyAction/,
    "Busy hook should export useB2bEmployeeDataBusyAction."
  );
  assert.match(
    hookSource,
    /const runBusyAction = useCallback/,
    "Busy hook should expose runBusyAction."
  );
  assert.match(
    hookSource,
    /successNotice\?/,
    "Busy hook should support successNotice option."
  );
  checks.push("hook_exposes_busy_action_contract");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
