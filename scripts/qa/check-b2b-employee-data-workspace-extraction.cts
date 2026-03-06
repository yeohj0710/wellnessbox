import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const WORKSPACE_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataWorkspace.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const workspaceSource = fs.readFileSync(WORKSPACE_PATH, "utf8");

  assert.match(
    clientSource,
    /import B2bEmployeeDataWorkspace from "\.\/_components\/B2bEmployeeDataWorkspace";/,
    "B2bAdminEmployeeDataClient must import B2bEmployeeDataWorkspace."
  );
  assert.match(
    clientSource,
    /<B2bEmployeeDataWorkspace[\s\S]*opsData=\{opsData\}[\s\S]*onDeleteRecord=\{handleDeleteRecord\}[\s\S]*\/>/,
    "B2bAdminEmployeeDataClient should render B2bEmployeeDataWorkspace with opsData and delete handler."
  );
  checks.push("client_uses_workspace_component");

  assert.ok(
    !/운영 작업/.test(clientSource),
    "Inline operations section heading should be removed from B2bAdminEmployeeDataClient."
  );
  assert.ok(
    !/데이터 현황/.test(clientSource),
    "Inline summary section heading should be removed from B2bAdminEmployeeDataClient."
  );
  assert.ok(
    !/하이픈 캐시\/조회이력/.test(clientSource),
    "Inline health-link details heading should be removed from B2bAdminEmployeeDataClient."
  );
  checks.push("client_has_no_inline_workspace_sections");

  assert.match(
    workspaceSource,
    /export default function B2bEmployeeDataWorkspace/,
    "B2bEmployeeDataWorkspace should export a default component."
  );
  assert.match(
    workspaceSource,
    /<B2bEmployeeDataOperationsSection/,
    "B2bEmployeeDataWorkspace should render B2bEmployeeDataOperationsSection."
  );
  assert.match(
    workspaceSource,
    /<B2bEmployeeDataSummarySection/,
    "B2bEmployeeDataWorkspace should render B2bEmployeeDataSummarySection."
  );
  assert.match(
    workspaceSource,
    /<B2bEmployeeDataHealthLinkDetails/,
    "B2bEmployeeDataWorkspace should render B2bEmployeeDataHealthLinkDetails."
  );
  checks.push("workspace_uses_section_components");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
