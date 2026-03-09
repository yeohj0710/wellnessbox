/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const facadeSource = read("lib/chat/action-intent-rules.ts");
  const patternSource = read("lib/chat/action-intent-patterns.ts");
  const runtimeSource = read("lib/chat/action-intent-runtime.ts");
  const docSource = read("docs/maintenance/chat-action-intent-modules.md");

  const facadeTokens = [
    'from "./action-intent-patterns"',
    'from "./action-intent-runtime"',
    "buildRuntimeContextFlags",
    "FALLBACK_ACTION_FEEDBACK",
    "RECOMMENDATION_SECTION_REGEX",
  ];
  for (const token of facadeTokens) {
    assert.ok(
      facadeSource.includes(token),
      `action-intent-rules.ts should compose extracted modules with token: ${token}`
    );
  }

  const forbiddenFacadeTokens = [
    "export const ADD_REGEX =",
    "export const NAVIGATION_ACTIONS = new Set<ChatActionType>([",
    "export const FALLBACK_ACTION_FEEDBACK:",
    "export function buildRuntimeContextFlags(",
  ];
  for (const token of forbiddenFacadeTokens) {
    assert.ok(
      !facadeSource.includes(token),
      `action-intent-rules.ts should not inline extracted token: ${token}`
    );
  }

  const patternTokens = [
    "export const ADD_REGEX =",
    "export const QUICK_CHECK_REGEX =",
    "export const RECOMMENDATION_SECTION_REGEX =",
    "추천\\s*상품\\s*\\(7일\\s*기준\\s*가격\\)",
  ];
  for (const token of patternTokens) {
    assert.ok(
      patternSource.includes(token),
      `action-intent-patterns.ts should own regex token: ${token}`
    );
  }

  const runtimeTokens = [
    "export const NAVIGATION_ACTIONS = new Set<ChatActionType>([",
    "export const CART_ACTIONS = new Set<ChatActionType>([",
    "export const FALLBACK_ACTION_FEEDBACK: Partial<Record<ChatActionType, string>> = {",
    'open_check_ai: "빠른검진 페이지로 이동해둘게요."',
    "export function buildRuntimeContextFlags(",
  ];
  for (const token of runtimeTokens) {
    assert.ok(
      runtimeSource.includes(token),
      `action-intent-runtime.ts should own runtime token: ${token}`
    );
  }

  const docTokens = [
    "`lib/chat/action-intent-rules.ts`",
    "`lib/chat/action-intent-patterns.ts`",
    "`lib/chat/action-intent-runtime.ts`",
    "`npm run qa:chat:action-intent-modules`",
  ];
  for (const token of docTokens) {
    assert.ok(
      docSource.includes(token),
      `chat-action-intent-modules.md should mention token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "chat_action_intent_facade_is_thin",
          "chat_action_intent_patterns_own_regex_rules",
          "chat_action_intent_runtime_owns_sets_feedback_and_context_flags",
        ],
      },
      null,
      2
    )
  );
}

try {
  run();
} catch (error) {
  console.error("[qa:chat:action-intent-modules] FAIL", error);
  process.exit(1);
}
