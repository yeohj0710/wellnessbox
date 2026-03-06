import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-selection-lifecycle.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useB2bAdminReportSelectionLifecycle\(/,
    "B2bAdminReportClient must use useB2bAdminReportSelectionLifecycle."
  );
  checks.push("client_uses_selection_lifecycle_hook");

  assert.ok(
    !/const selectEmployeeForLoading = useCallback\(/.test(clientSource),
    "B2bAdminReportClient should not keep selectEmployeeForLoading inline."
  );
  assert.ok(
    !/const \[isDetailLoading, setIsDetailLoading\] = useState\(false\)/.test(clientSource),
    "isDetailLoading state should be owned by the lifecycle hook."
  );
  assert.ok(
    !/const \[isEmployeeListReady, setIsEmployeeListReady\] = useState\(false\)/.test(
      clientSource
    ),
    "isEmployeeListReady state should be owned by the lifecycle hook."
  );
  assert.ok(
    !/const \[isInitialDetailReady, setIsInitialDetailReady\] = useState\(false\)/.test(
      clientSource
    ),
    "isInitialDetailReady state should be owned by the lifecycle hook."
  );
  checks.push("client_has_no_inline_selection_state_impl");

  assert.match(
    hookSource,
    /export function useB2bAdminReportSelectionLifecycle/,
    "Selection lifecycle hook should export useB2bAdminReportSelectionLifecycle."
  );
  assert.match(
    hookSource,
    /const \[isDetailLoading, setIsDetailLoading\] = useState\(false\)/,
    "The lifecycle hook should own detail loading state."
  );
  assert.match(
    hookSource,
    /await loadEmployees\(\)/,
    "The lifecycle hook should own initial employee list loading."
  );
  assert.match(
    hookSource,
    /await loadEmployeeDetail\(selectedEmployeeId, selectedPeriodKey \|\| undefined\)/,
    "The lifecycle hook should own selected employee detail loading."
  );
  checks.push("hook_owns_initial_and_detail_loading");

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
