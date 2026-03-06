import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const WORKSPACE_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataWorkspace.tsx"
);

function run() {
  const checks: string[] = [];
  const source = fs.readFileSync(WORKSPACE_PATH, "utf8");

  assert.match(
    source,
    /import B2bEmployeeDataProfileSection from "\.\/B2bEmployeeDataProfileSection";/,
    "Workspace should import B2bEmployeeDataProfileSection."
  );
  assert.match(
    source,
    /import B2bEmployeeDataOperationsSection from "\.\/B2bEmployeeDataOperationsSection";/,
    "Workspace should import B2bEmployeeDataOperationsSection."
  );
  assert.match(
    source,
    /import B2bEmployeeDataSummarySection from "\.\/B2bEmployeeDataSummarySection";/,
    "Workspace should import B2bEmployeeDataSummarySection."
  );
  assert.match(
    source,
    /import B2bEmployeeDataHealthLinkDetails from "\.\/B2bEmployeeDataHealthLinkDetails";/,
    "Workspace should import B2bEmployeeDataHealthLinkDetails."
  );
  checks.push("workspace_imports_section_components");

  assert.match(
    source,
    /<B2bEmployeeDataProfileSection[\s\S]*onSaveEmployeeProfile=\{onSaveEmployeeProfile\}[\s\S]*\/>/,
    "Workspace should render profile section component."
  );
  assert.match(
    source,
    /<B2bEmployeeDataOperationsSection[\s\S]*onDeleteEmployee=\{onDeleteEmployee\}[\s\S]*\/>/,
    "Workspace should render operations section component."
  );
  assert.match(
    source,
    /<B2bEmployeeDataSummarySection summary=\{opsData\.summary\} \/>/,
    "Workspace should render summary section component."
  );
  assert.match(
    source,
    /<B2bEmployeeDataHealthLinkDetails[\s\S]*onDeleteRecord=\{onDeleteRecord\}[\s\S]*\/>/,
    "Workspace should render health-link details component."
  );
  checks.push("workspace_renders_section_components");

  assert.ok(!/기본 정보 저장/.test(source), "Inline profile button label should not remain in workspace.");
  assert.ok(!/운영 작업/.test(source), "Inline operations heading should not remain in workspace.");
  assert.ok(!/데이터 현황/.test(source), "Inline summary heading should not remain in workspace.");
  checks.push("workspace_has_no_inline_section_markup");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
