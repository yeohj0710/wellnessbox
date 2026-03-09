import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-background-refresh.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useB2bAdminBackgroundRefresh\(/,
    "B2bAdminReportClient must use useB2bAdminBackgroundRefresh."
  );
  checks.push("client_uses_background_refresh_hook");

  assert.ok(
    !/window\.addEventListener\("focus"/.test(clientSource),
    "B2bAdminReportClient should not keep a focus listener inline."
  );
  checks.push("client_has_no_inline_focus_listener");

  assert.ok(
    !/document\.addEventListener\("visibilitychange"/.test(clientSource),
    "B2bAdminReportClient should not keep a visibilitychange listener inline."
  );
  checks.push("client_has_no_inline_visibility_listener");

  assert.match(
    hookSource,
    /DEFAULT_MIN_INTERVAL_MS = 15_000/,
    "Background refresh should keep the 15s minimum interval default."
  );
  checks.push("hook_keeps_min_interval_default");

  assert.match(
    hookSource,
    /DEFAULT_INTERACTION_QUIET_MS = 8_000/,
    "Background refresh should keep the 8s interaction quiet window."
  );
  checks.push("hook_keeps_interaction_quiet_default");

  assert.match(
    hookSource,
    /const events = \["pointerdown", "keydown", "input", "compositionstart"\]/,
    "Background refresh should track recent user interaction events."
  );
  checks.push("hook_tracks_recent_interactions");

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
