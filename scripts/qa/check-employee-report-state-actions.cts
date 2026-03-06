import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-state-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useEmployeeReportStateActions\(/,
    "EmployeeReportClient는 상태 전이 공통 훅을 사용해야 합니다."
  );
  checks.push("client_uses_state_actions_hook");

  assert.ok(
    !/setSyncNextAction\(/.test(clientSource),
    "EmployeeReportClient에서 setSyncNextAction 직접 호출을 금지합니다."
  );
  checks.push("client_has_no_direct_setSyncNextAction");

  assert.ok(
    !/setSyncGuidance\(/.test(clientSource),
    "EmployeeReportClient에서 setSyncGuidance 직접 호출을 금지합니다."
  );
  checks.push("client_has_no_direct_setSyncGuidance");

  assert.ok(
    !/setPendingSignForceRefresh\(/.test(clientSource),
    "EmployeeReportClient에서 setPendingSignForceRefresh 직접 호출을 금지합니다."
  );
  checks.push("client_has_no_direct_setPendingSignForceRefresh");

  assert.match(
    hookSource,
    /applyAdminOnlyBlockedState/,
    "상태 전이 훅은 관리자 차단 상태 전이 함수를 제공해야 합니다."
  );
  checks.push("hook_exposes_admin_only_transition");

  assert.match(
    hookSource,
    /applyMissingReportState/,
    "상태 전이 훅은 리포트 미존재 상태 전이 함수를 제공해야 합니다."
  );
  checks.push("hook_exposes_missing_report_transition");

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
