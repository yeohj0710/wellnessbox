import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const HERO_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataOpsHero.tsx"
);
const SIDEBAR_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataSidebar.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const heroSource = fs.readFileSync(HERO_PATH, "utf8");
  const sidebarSource = fs.readFileSync(SIDEBAR_PATH, "utf8");

  assert.match(
    clientSource,
    /import B2bEmployeeDataOpsHero from "\.\/_components\/B2bEmployeeDataOpsHero";/,
    "B2bAdminEmployeeDataClient must import B2bEmployeeDataOpsHero."
  );
  assert.match(
    clientSource,
    /import B2bEmployeeDataSidebar from "\.\/_components\/B2bEmployeeDataSidebar";/,
    "B2bAdminEmployeeDataClient must import B2bEmployeeDataSidebar."
  );
  checks.push("client_imports_new_layout_components");

  assert.match(
    clientSource,
    /<B2bEmployeeDataOpsHero[\s\S]*onSearchSubmit=\{\(\) => void handleSearch\(\)\}[\s\S]*onRefresh=\{\(\) => void handleRefreshOpsData\(\)\}[\s\S]*\/>/,
    "B2bAdminEmployeeDataClient should render B2bEmployeeDataOpsHero with search/refresh callbacks."
  );
  assert.match(
    clientSource,
    /<B2bEmployeeDataSidebar[\s\S]*employees=\{employees\}[\s\S]*onSelectEmployee=\{setSelectedEmployeeId\}[\s\S]*\/>/,
    "B2bAdminEmployeeDataClient should render B2bEmployeeDataSidebar with employee selection props."
  );
  checks.push("client_uses_new_layout_components");

  assert.ok(
    !/className=\{styles\.heroCard\}/.test(clientSource),
    "Inline hero card markup should be removed from B2bAdminEmployeeDataClient."
  );
  assert.ok(
    !/className=\{`\$\{styles\.sectionCard\} \$\{styles\.sidebarCard\}`\}/.test(clientSource),
    "Inline sidebar card markup should be removed from B2bAdminEmployeeDataClient."
  );
  checks.push("client_has_no_inline_hero_sidebar_markup");

  assert.match(
    heroSource,
    /export default function B2bEmployeeDataOpsHero/,
    "B2bEmployeeDataOpsHero should export a default component."
  );
  assert.match(
    sidebarSource,
    /export default function B2bEmployeeDataSidebar/,
    "B2bEmployeeDataSidebar should export a default component."
  );
  checks.push("new_components_export_default");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
