import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HERO_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_components/EmployeeReportHeroCard.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const heroSource = fs.readFileSync(HERO_PATH, "utf8");

  assert.match(
    clientSource,
    /import EmployeeReportHeroCard from "\.\/_components\/EmployeeReportHeroCard";/,
    "EmployeeReportClient must import EmployeeReportHeroCard."
  );
  assert.match(
    clientSource,
    /<EmployeeReportHeroCard[\s\S]*reportReady=\{Boolean\(reportData\?\.report\)\}[\s\S]*selectedPeriodKey=\{selectedPeriodKey\}[\s\S]*\/>/,
    "EmployeeReportClient should render EmployeeReportHeroCard with reportReady and selectedPeriodKey props."
  );
  checks.push("client_uses_hero_component");

  assert.ok(
    !/<header className=\{styles\.heroCard\}>/.test(clientSource),
    "Inline hero header markup should not remain in EmployeeReportClient."
  );
  checks.push("client_has_no_inline_hero_markup");

  assert.match(
    heroSource,
    /export default function EmployeeReportHeroCard/,
    "EmployeeReportHeroCard should export a default component."
  );
  assert.match(
    heroSource,
    /className=\{styles\.heroCard\}/,
    "EmployeeReportHeroCard should own hero card markup."
  );
  checks.push("hero_component_owns_hero_markup");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
