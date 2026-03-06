import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const ACTIONS_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-actions.ts"
);
const EMPLOYEE_OPS_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-employee-ops-actions.ts"
);
const DESTRUCTIVE_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-destructive-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const actionsHookSource = fs.readFileSync(ACTIONS_HOOK_PATH, "utf8");
  const employeeOpsHookSource = fs.readFileSync(EMPLOYEE_OPS_HOOK_PATH, "utf8");
  const destructiveHookSource = fs.readFileSync(DESTRUCTIVE_HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useB2bEmployeeDataActions\(/,
    "B2bAdminEmployeeDataClient must use useB2bEmployeeDataActions."
  );
  checks.push("client_uses_actions_hook");

  const inlineHandlers = [
    "handleSearch",
    "handleCreateEmployee",
    "handleSaveEmployeeProfile",
    "handleResetAllData",
    "handleResetPeriodData",
    "handleClearHyphenCache",
    "handleDeleteEmployee",
    "handleDeleteRecord",
    "handleRefreshOpsData",
  ];

  for (const handler of inlineHandlers) {
    assert.ok(
      !new RegExp(`async function ${handler}\\(`).test(clientSource),
      `B2bAdminEmployeeDataClient should not keep ${handler} inline.`
    );
  }
  checks.push("client_has_no_inline_action_handlers");

  assert.match(
    actionsHookSource,
    /useB2bEmployeeDataEmployeeOpsActions\(/,
    "Main actions hook should compose employee ops actions via sub-hook."
  );
  assert.match(
    actionsHookSource,
    /useB2bEmployeeDataDestructiveActions\(/,
    "Main actions hook should compose destructive actions via sub-hook."
  );
  assert.ok(
    !/const handleSearch = useCallback\(/.test(actionsHookSource),
    "Main actions hook should not keep search handler inline after extraction."
  );
  assert.ok(
    !/const handleDeleteEmployee = useCallback\(/.test(actionsHookSource),
    "Main actions hook should not keep delete handler inline after extraction."
  );
  checks.push("actions_hook_is_composition_only");

  assert.match(
    employeeOpsHookSource,
    /const handleCreateEmployee = useCallback\(/,
    "Employee ops sub-hook should own create employee handler."
  );
  assert.match(
    destructiveHookSource,
    /const handleDeleteEmployee = useCallback\(/,
    "Destructive sub-hook should own delete employee handler."
  );
  assert.match(
    destructiveHookSource,
    /window\.confirm/,
    "Destructive sub-hook should keep confirmation prompts."
  );
  checks.push("subhooks_own_handlers_and_confirmations");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
