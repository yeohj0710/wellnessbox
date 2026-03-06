import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-busy-action.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useB2bAdminReportBusyAction\(/,
    "B2bAdminReportClient must use useB2bAdminReportBusyAction."
  );
  checks.push("client_uses_busy_action_hook");

  assert.ok(
    !/function beginBusy\(/.test(clientSource),
    "B2bAdminReportClient should not keep beginBusy inline."
  );
  assert.ok(
    !/function endBusy\(/.test(clientSource),
    "B2bAdminReportClient should not keep endBusy inline."
  );
  assert.ok(
    !/async function runBusyAction\(/.test(clientSource),
    "B2bAdminReportClient should not keep runBusyAction inline."
  );
  checks.push("client_has_no_inline_busy_impl");

  assert.match(
    hookSource,
    /export function useB2bAdminReportBusyAction/,
    "Busy action hook must export useB2bAdminReportBusyAction."
  );
  assert.match(
    hookSource,
    /const \[busy, setBusy\] = useState\(false\)/,
    "Busy state should be managed only in the hook."
  );
  checks.push("hook_is_exported_with_single_busy_state");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks,
      },
      null,
      2
    )
  );
}

run();
