import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOOK_PATH = path.join(
  ROOT,
  "app/(features)/health-link/useNhisHealthLink.ts"
);
const ACTIONS_PATH = path.join(
  ROOT,
  "app/(features)/health-link/useNhisHealthLink.actions.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const hookSource = read(HOOK_PATH);
  const actionSource = read(ACTIONS_PATH);
  const checks: string[] = [];

  assert.match(
    hookSource,
    /import \{ useNhisHealthLinkActions \} from "\.\/useNhisHealthLink.actions";/,
    "useNhisHealthLink must import useNhisHealthLinkActions."
  );
  assert.match(
    hookSource,
    /const \{\s*handleInit,[\s\S]*showHealthInPrereqGuide,\s*\} = useNhisHealthLinkActions\(/,
    "useNhisHealthLink must use the action hook."
  );
  checks.push("root_hook_uses_action_hook");

  const forbiddenRootTokens = [
    "const handleInit = useCallback(async () => {",
    "const handleSign = useCallback(async () => {",
    "const handleFetch = useCallback(async () => {",
    "const handleUnlink = useCallback(async () => {",
    "validateInitIdentityInput({",
    'emitAuthSyncEvent({ scope: "nhis-link", reason: "unlink" })',
  ];
  for (const token of forbiddenRootTokens) {
    assert.ok(
      !hookSource.includes(token),
      `useNhisHealthLink should not inline token after extraction: ${token}`
    );
  }
  checks.push("root_hook_has_no_inline_action_flow");

  const requiredRootTokens = [
    'const canSign = canRequest && isNhisSignReady(status);',
    'emitAuthSyncEvent({ scope: "nhis-link", reason });',
  ];
  for (const token of requiredRootTokens) {
    assert.ok(
      hookSource.includes(token),
      `useNhisHealthLink should keep token: ${token}`
    );
  }
  checks.push("root_hook_keeps_capability_and_auth_sync_bridge");

  const requiredActionTokens = [
    "export function useNhisHealthLinkActions(",
    "const handleInit = useCallback(async () => {",
    "const handleSign = useCallback(async () => {",
    "const handleUnlink = useCallback(async () => {",
    "validateInitIdentityInput({",
    "resolveInitSuccessNotice(payload)",
    'emitNhisLinkSync("sign-linked")',
    "clearLocalNhisFetchData();",
  ];
  for (const token of requiredActionTokens) {
    assert.ok(
      actionSource.includes(token),
      `Action hook must own token: ${token}`
    );
  }
  checks.push("action_hook_owns_nhis_action_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
