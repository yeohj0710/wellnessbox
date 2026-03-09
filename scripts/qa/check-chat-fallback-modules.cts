/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const rootSource = read("lib/chat/actions/fallback.ts");
  const helperSource = read("lib/chat/actions/fallback-support.ts");
  const docSource = read("docs/maintenance/chat-fallback-modules.md");

  const rootTokens = [
    'from "@/lib/chat/actions/fallback-support"',
    "resolveFallbackActionDraft(",
    "hasFallbackActionOrCartIntent(",
    "buildFallbackAssistantReply(",
    "buildFallbackReason(",
    "resolveFallbackSuggestedActions(",
  ];
  for (const token of rootTokens) {
    assert.ok(
      rootSource.includes(token),
      `fallback.ts should compose helper token: ${token}`
    );
  }

  const forbiddenRootTokens = [
    "const prefersChatMode =",
    "let navigationAction: ChatActionType | null = null;",
    'pushUnique(actions, "focus_manual_order_lookup")',
    "const assistantParts: string[] = [];",
    "const hasSupportContext =",
  ];
  for (const token of forbiddenRootTokens) {
    assert.ok(
      !rootSource.includes(token),
      `fallback.ts should not inline extracted token: ${token}`
    );
  }

  const helperTokens = [
    "export type FallbackActionDraft = {",
    "export function resolveFallbackActionDraft(",
    "export function buildFallbackAssistantReply(",
    "추천 상품 전체를 장바구니에 담아둘게요.",
    "export function buildFallbackReason(",
    "export function resolveFallbackSuggestedActions(",
  ];
  for (const token of helperTokens) {
    assert.ok(
      helperSource.includes(token),
      `fallback-support.ts should own helper token: ${token}`
    );
  }

  const docTokens = [
    "`lib/chat/actions/fallback.ts`",
    "`lib/chat/actions/fallback-support.ts`",
    "`npm run qa:chat:fallback-modules`",
  ];
  for (const token of docTokens) {
    assert.ok(
      docSource.includes(token),
      `chat-fallback-modules.md should mention token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "chat_fallback_shell_is_thin",
          "chat_fallback_support_owns_rules_and_copy",
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
  console.error("[qa:chat:fallback-modules] FAIL", error);
  process.exit(1);
}
