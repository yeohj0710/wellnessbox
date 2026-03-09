import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_PATH = path.join(
  ROOT,
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const DERIVED_PATH = path.join(
  ROOT,
  "app/(features)/employee-report/_lib/use-employee-report-page-derived-state.ts"
);
const HANDLERS_PATH = path.join(
  ROOT,
  "app/(features)/employee-report/_lib/use-employee-report-page-handlers.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const client = read(CLIENT_PATH);
  const derived = read(DERIVED_PATH);
  const handlers = read(HANDLERS_PATH);
  const checks: string[] = [];

  assert.match(
    client,
    /import \{ useEmployeeReportPageDerivedState \} from "\.\/_lib\/use-employee-report-page-derived-state";/,
    "EmployeeReportClient must import useEmployeeReportPageDerivedState."
  );
  assert.match(
    client,
    /import \{ useEmployeeReportPageHandlers \} from "\.\/_lib\/use-employee-report-page-handlers";/,
    "EmployeeReportClient must import useEmployeeReportPageHandlers."
  );
  checks.push("client_imports_page_hooks");

  assert.match(
    client,
    /const \{\s*medicationStatus,[\s\S]*showIdentityFlow,\s*\} = useEmployeeReportPageDerivedState\(/,
    "EmployeeReportClient must use useEmployeeReportPageDerivedState."
  );
  assert.match(
    client,
    /const \{\s*handleIdentityNameChange,[\s\S]*confirmForceSync,\s*\} = useEmployeeReportPageHandlers\(/,
    "EmployeeReportClient must use useEmployeeReportPageHandlers."
  );
  checks.push("client_uses_page_hooks");

  const forbiddenClientTokens = [
    "function handleIdentityNameChange(value: string)",
    "function handleIdentityBirthDateChange(value: string)",
    "function handleIdentityPhoneChange(value: string)",
    "function handleContinueSync()",
    "function resetForceConfirmDialog()",
    "function closeForceConfirmDialog()",
    "function confirmForceSync()",
    "const medicationStatus = useMemo(",
    "const periodOptions = useMemo(() => {",
    "const canUseForceSync = useMemo(",
    "const canExecuteForceSync = useMemo(",
    "const identityPrimaryActionLabel = useMemo(",
  ];
  for (const token of forbiddenClientTokens) {
    assert.ok(
      !client.includes(token),
      `EmployeeReportClient should not inline token after extraction: ${token}`
    );
  }
  checks.push("client_keeps_page_logic_out");

  const requiredDerivedTokens = [
    "export function useEmployeeReportPageDerivedState(",
    "resolveMedicationStatusMessage(reportData)",
    "resolveIdentityPrimaryActionLabel({",
    "resolveEmployeeReportOverlayDescription(busyHint)",
    "resolveEmployeeReportOverlayDetailLines({ busyHint, busyElapsedSec })",
  ];
  for (const token of requiredDerivedTokens) {
    assert.ok(
      derived.includes(token),
      `Derived-state hook must own token: ${token}`
    );
  }

  const requiredHandlerTokens = [
    "export function useEmployeeReportPageHandlers(",
    "const handleIdentityNameChange = useCallback(",
    "normalizeDigits(value).slice(0, 8)",
    "normalizeDigits(value).slice(0, 11)",
    "const confirmForceSync = useCallback(",
  ];
  for (const token of requiredHandlerTokens) {
    assert.ok(
      handlers.includes(token),
      `Page-handlers hook must own token: ${token}`
    );
  }
  checks.push("hooks_own_page_derivation_and_handlers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
