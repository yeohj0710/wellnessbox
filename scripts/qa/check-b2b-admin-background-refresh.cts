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
    "B2bAdminReportClient는 배경 새로고침 훅을 사용해야 합니다."
  );
  checks.push("client_uses_background_refresh_hook");

  assert.ok(
    !/window\.addEventListener\("focus"/.test(clientSource),
    "B2bAdminReportClient에 focus 이벤트 리스너를 인라인으로 두지 않습니다."
  );
  checks.push("client_has_no_inline_focus_listener");

  assert.ok(
    !/document\.addEventListener\("visibilitychange"/.test(clientSource),
    "B2bAdminReportClient에 visibilitychange 리스너를 인라인으로 두지 않습니다."
  );
  checks.push("client_has_no_inline_visibility_listener");

  assert.match(
    hookSource,
    /DEFAULT_MIN_INTERVAL_MS = 15_000/,
    "배경 새로고침 최소 간격 기준이 유지되어야 합니다."
  );
  checks.push("hook_keeps_min_interval_default");

  assert.match(
    hookSource,
    /DEFAULT_INTERACTION_QUIET_MS = 8_000/,
    "최근 사용자 입력 보호 간격이 유지되어야 합니다."
  );
  checks.push("hook_keeps_interaction_quiet_default");

  assert.match(
    hookSource,
    /const events = \["pointerdown", "keydown", "input", "compositionstart"\]/,
    "입력 상호작용 이벤트 감지가 유지되어야 합니다."
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
