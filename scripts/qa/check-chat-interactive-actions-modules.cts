import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ACTIONS_PATH = path.resolve(
  process.cwd(),
  "app/chat/hooks/useChat.interactiveActions.ts"
);
const ROUTES_PATH = path.resolve(
  process.cwd(),
  "app/chat/hooks/useChat.interactiveActions.routes.ts"
);
const TYPES_PATH = path.resolve(
  process.cwd(),
  "app/chat/hooks/useChat.interactiveActions.types.ts"
);

function run() {
  const actionsSource = fs.readFileSync(ACTIONS_PATH, "utf8");
  const routesSource = fs.readFileSync(ROUTES_PATH, "utf8");
  const typesSource = fs.readFileSync(TYPES_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    actionsSource,
    /from "\.\/useChat\.interactiveActions\.routes";/,
    "interactiveActions must import the extracted route helpers."
  );
  assert.match(
    actionsSource,
    /from "\.\/useChat\.interactiveActions\.types";/,
    "interactiveActions must source shared types from the dedicated type module."
  );
  checks.push("interactive_actions_imports_route_and_type_modules");

  for (const legacyToken of [
    "const NAVIGATION_ACTIONS:",
    "function runPageActionOrFallback(",
    'if (action === "focus_home_products") {',
    'if (action === "open_support_email") {',
  ]) {
    assert.ok(
      !actionsSource.includes(legacyToken),
      `interactiveActions should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("interactive_actions_no_longer_keeps_inline_route_and_support_logic");

  for (const token of [
    "const NAVIGATION_ACTIONS:",
    "const PAGE_FOCUS_ACTIONS:",
    "const EXTERNAL_LINK_ACTIONS:",
    "export function runPageFocusInteractiveAction(",
    "export function runExternalLinkInteractiveAction(",
    "export function runNavigationInteractiveAction(",
  ]) {
    assert.ok(
      routesSource.includes(token),
      `[qa:chat:interactive-actions-modules] missing routes token: ${token}`
    );
  }
  checks.push("routes_module_owns_navigation_page_focus_and_external_link_logic");

  for (const token of [
    "export type CartExecutionResult = {",
    "export type InteractiveActionResult = {",
    "export type RunSingleInteractiveActionParams = {",
  ]) {
    assert.ok(
      typesSource.includes(token),
      `[qa:chat:interactive-actions-modules] missing types token: ${token}`
    );
  }
  checks.push("types_module_owns_shared_interactive_action_contracts");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
