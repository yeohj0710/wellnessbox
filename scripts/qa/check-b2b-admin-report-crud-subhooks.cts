import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CRUD_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-crud-actions.ts"
);

function run() {
  const checks: string[] = [];
  const source = fs.readFileSync(CRUD_HOOK_PATH, "utf8");

  assert.match(
    source,
    /import \{ useB2bAdminReportPersistenceActions \} from "\.\/use-b2b-admin-report-persistence-actions";/,
    "CRUD hook must compose persistence actions from sub-hook."
  );
  assert.match(
    source,
    /import \{ useB2bAdminReportEmployeeOpsActions \} from "\.\/use-b2b-admin-report-employee-ops-actions";/,
    "CRUD hook must compose employee ops actions from sub-hook."
  );
  assert.match(
    source,
    /import \{ useB2bAdminReportValidationActions \} from "\.\/use-b2b-admin-report-validation-actions";/,
    "CRUD hook must compose validation actions from sub-hook."
  );
  checks.push("crud_hook_imports_subhooks");

  assert.ok(
    !/const handleSaveSurvey = useCallback\(/.test(source),
    "CRUD hook should not keep save survey handler inline."
  );
  assert.ok(
    !/const handleSearch = useCallback\(/.test(source),
    "CRUD hook should not keep search handler inline."
  );
  assert.ok(
    !/const handleRunValidation = useCallback\(/.test(source),
    "CRUD hook should not keep layout validation handler inline."
  );
  checks.push("crud_hook_has_no_inline_big_handlers");

  assert.match(
    source,
    /return \{[\s\S]*\.\.\.employeeOpsActions,[\s\S]*\.\.\.persistenceActions,[\s\S]*\.\.\.validationActions,[\s\S]*\};/,
    "CRUD hook should return merged actions from all sub-hooks."
  );
  checks.push("crud_hook_merges_subhook_results");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
