import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-toast-effects.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\.\/_lib\/use-b2b-admin-report-toast-effects"/,
    "Client should import useB2bAdminReportToastEffects."
  );
  assert.ok(
    clientSource.includes("useB2bAdminReportToastEffects({"),
    "Client should call useB2bAdminReportToastEffects."
  );
  checks.push("client_uses_toast_effect_hook");

  assert.ok(
    !clientSource.includes('showToast(text, { type: "success", duration: 3200 })'),
    "Client should not inline success toast effect after extraction."
  );
  assert.ok(
    !clientSource.includes('showToast(text, { type: "error", duration: 5000 })'),
    "Client should not inline error toast effect after extraction."
  );
  checks.push("client_has_no_inline_toast_effects");

  assert.match(
    hookSource,
    /export function useB2bAdminReportToastEffects\(/,
    "Toast hook module should export useB2bAdminReportToastEffects."
  );
  assert.ok(
    hookSource.includes('showToast(text, { type: "success", duration: 3200 })'),
    "Toast hook should own success toast behavior."
  );
  assert.ok(
    hookSource.includes('showToast(text, { type: "error", duration: 5000 })'),
    "Toast hook should own error toast behavior."
  );
  checks.push("toast_hook_owns_success_and_error_effects");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
