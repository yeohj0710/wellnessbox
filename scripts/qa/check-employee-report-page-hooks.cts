import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const client = fs.readFileSync(
  path.join(ROOT, "app/(features)/employee-report/EmployeeReportClient.tsx"),
  "utf8"
);
const handlers = fs.readFileSync(
  path.join(ROOT, "app/(features)/employee-report/_lib/use-employee-report-page-handlers.ts"),
  "utf8"
);

assert.match(
  client,
  /import \{ useEmployeeReportPageHandlers \} from "\.\/_lib\/use-employee-report-page-handlers";/
);
assert.match(
  client,
  /const \{\s*handleIdentityNameChange,\s*handleIdentityBirthDateChange,\s*handleIdentityPhoneChange,\s*\} = useEmployeeReportPageHandlers\(\{ setIdentity \}\);/
);
assert.ok(!client.includes("const handleIdentityChange = useCallback("));

for (const token of [
  "export function useEmployeeReportPageHandlers(",
  "const handleIdentityNameChange = useCallback(",
  "normalizeDigits(value).slice(0, 8)",
  "normalizeDigits(value).slice(0, 11)",
]) {
  assert.ok(handlers.includes(token), `Page-handlers hook must own token: ${token}`);
}

console.log(JSON.stringify({
  ok: true,
  checks: ["client_uses_identity_handlers", "identity_normalization_is_extracted"],
}, null, 2));
