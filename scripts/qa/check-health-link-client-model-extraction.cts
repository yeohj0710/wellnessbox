import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_PATH = path.join(
  ROOT,
  "app/(features)/health-link/HealthLinkClient.tsx"
);
const MODEL_PATH = path.join(
  ROOT,
  "app/(features)/health-link/useHealthLinkClientModel.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const clientSource = read(CLIENT_PATH);
  const modelSource = read(MODEL_PATH);
  const checks: string[] = [];

  assert.match(
    clientSource,
    /import \{ useHealthLinkClientModel \} from "\.\/useHealthLinkClientModel";/,
    "HealthLinkClient must import useHealthLinkClientModel."
  );
  assert.match(
    clientSource,
    /const \{\s*showAuthStage,[\s\S]*handleSwitchIdentity,\s*\} = useHealthLinkClientModel\(/,
    "HealthLinkClient must use useHealthLinkClientModel."
  );
  checks.push("client_uses_health_link_client_model");

  const forbiddenClientTokens = [
    "const hasAuthRequested = isNhisSignReady(status);",
    "const hasSessionExpiredSignal =",
    "const primaryFlow = shouldForceReauth",
    "const checkupOverviewRows = fetched?.normalized?.checkup?.overview ?? [];",
    "const medicationDigest = summarizeMedicationRows(medicationRows);",
    "const handlePrimaryAction = () => {",
    "const handleSwitchIdentity = () => {",
  ];
  for (const token of forbiddenClientTokens) {
    assert.ok(
      !clientSource.includes(token),
      `HealthLinkClient should not inline token after extraction: ${token}`
    );
  }
  checks.push("client_keeps_page_model_logic_out");

  const requiredModelTokens = [
    "export function useHealthLinkClientModel(",
    'const hasAuthRequested = isNhisSignReady(status);',
    "const hasSessionExpiredSignal =",
    "const latestCheckupRows = useMemo(",
    "const handlePrimaryAction = useCallback(() => {",
    "const handleSwitchIdentity = useCallback(() => {",
  ];
  for (const token of requiredModelTokens) {
    assert.ok(
      modelSource.includes(token),
      `useHealthLinkClientModel must own token: ${token}`
    );
  }
  checks.push("model_hook_owns_derived_state_and_handlers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
