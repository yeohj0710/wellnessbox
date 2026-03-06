import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const COPY_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_lib/employee-data-copy.ts"
);
const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const WORKSPACE_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataWorkspace.tsx"
);
const PROFILE_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataProfileSection.tsx"
);
const OPERATIONS_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataOperationsSection.tsx"
);

function run() {
  const checks: string[] = [];
  const copySource = fs.readFileSync(COPY_PATH, "utf8");
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const workspaceSource = fs.readFileSync(WORKSPACE_PATH, "utf8");
  const profileSource = fs.readFileSync(PROFILE_PATH, "utf8");
  const operationsSource = fs.readFileSync(OPERATIONS_PATH, "utf8");

  assert.match(
    copySource,
    /export const EMPLOYEE_DATA_COPY =/,
    "Copy constants file must export EMPLOYEE_DATA_COPY."
  );
  assert.match(
    copySource,
    /export function withTemplate/,
    "Copy constants file must export withTemplate helper."
  );
  checks.push("copy_module_exports_constants");

  assert.match(
    clientSource,
    /import \{ EMPLOYEE_DATA_COPY \} from "\.\/_lib\/employee-data-copy";/,
    "Client should import shared employee-data copy constants."
  );
  assert.match(
    workspaceSource,
    /import \{ EMPLOYEE_DATA_COPY \} from "\.\.\/_lib\/employee-data-copy";/,
    "Workspace should import shared copy constants."
  );
  assert.match(
    profileSource,
    /import \{ EMPLOYEE_DATA_COPY \} from "\.\.\/_lib\/employee-data-copy";/,
    "Profile section should import shared copy constants."
  );
  assert.match(
    operationsSource,
    /import \{ EMPLOYEE_DATA_COPY \} from "\.\.\/_lib\/employee-data-copy";/,
    "Operations section should import shared copy constants."
  );
  checks.push("ui_uses_shared_copy");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
