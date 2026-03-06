import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const CREATE_FORM_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataCreateFormCard.tsx"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const createFormSource = fs.readFileSync(CREATE_FORM_PATH, "utf8");

  assert.match(
    clientSource,
    /import B2bEmployeeDataCreateFormCard from "\.\/_components\/B2bEmployeeDataCreateFormCard";/,
    "B2bAdminEmployeeDataClient must import B2bEmployeeDataCreateFormCard."
  );
  assert.match(
    clientSource,
    /<B2bEmployeeDataCreateFormCard[\s\S]*onCreateEmployee=\{\(\) => void handleCreateEmployee\(\)\}[\s\S]*\/>/,
    "B2bAdminEmployeeDataClient should render B2bEmployeeDataCreateFormCard with create callback."
  );
  checks.push("client_uses_create_form_component");

  assert.ok(
    !/EMPLOYEE_DATA_COPY\.createForm\.summary/.test(clientSource),
    "Inline create form summary text usage should be removed from B2bAdminEmployeeDataClient."
  );
  assert.ok(
    !/placeholder=\{EMPLOYEE_DATA_COPY\.createForm\.namePlaceholder\}/.test(clientSource),
    "Inline create form field markup should be removed from B2bAdminEmployeeDataClient."
  );
  checks.push("client_has_no_inline_create_form_markup");

  assert.match(
    createFormSource,
    /export default function B2bEmployeeDataCreateFormCard/,
    "B2bEmployeeDataCreateFormCard should export a default component."
  );
  assert.match(
    createFormSource,
    /EMPLOYEE_DATA_COPY\.createForm\.summary/,
    "B2bEmployeeDataCreateFormCard should own create-form copy usage."
  );
  checks.push("create_form_component_owns_create_form_ui");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
