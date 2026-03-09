/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const facadeSource = read("lib/chat/agent-actions.ts");
  const contractSource = read("lib/chat/agent-action-contracts.ts");
  const catalogSource = read("lib/chat/agent-action-catalog.ts");
  const guideSource = read("app/chat/hooks/useChat.agentGuide.ts");
  const docSource = read("docs/maintenance/chat-agent-action-modules.md");

  const facadeTokens = [
    'from "./agent-action-contracts"',
    'from "./agent-action-catalog"',
    "type ChatAgentExecuteDecision",
    "CHAT_CAPABILITY_ACTIONS",
    "CHAT_ACTION_LABELS",
  ];
  for (const token of facadeTokens) {
    assert.ok(
      facadeSource.includes(token),
      `agent-actions.ts should compose extracted modules with token: ${token}`
    );
  }

  const forbiddenFacadeTokens = [
    "export const CHAT_ACTION_TYPES = [",
    "export const CHAT_CAPABILITY_ACTIONS: ChatCapabilityAction[] = [",
    "export type ChatActionCategory =",
    "export type ChatAgentExecuteDecision = {",
  ];
  for (const token of forbiddenFacadeTokens) {
    assert.ok(
      !facadeSource.includes(token),
      `agent-actions.ts should not inline extracted token: ${token}`
    );
  }

  const contractTokens = [
    "export const CHAT_ACTION_TYPES = [",
    '  "open_admin_dashboard",',
    "export type ChatActionCategory =",
    '  | "operations";',
    "export type ChatCapabilityAction = {",
    "export type ChatAgentExecuteDecision = {",
    "export type ChatAgentSuggestedAction = {",
  ];
  for (const token of contractTokens) {
    assert.ok(
      contractSource.includes(token),
      `agent-action-contracts.ts should own contract token: ${token}`
    );
  }

  const catalogTokens = [
    "export const CHAT_CAPABILITY_ACTIONS: ChatCapabilityAction[] = [",
    'label: "추천 전체 담기"',
    'prompt: "추천 상품 전체를 장바구니에 담아줘"',
    'label: "장바구니 비우기"',
    'label: "관리자 로그인"',
    "export const CHAT_ACTION_LABELS: Record<ChatActionType, string> =",
  ];
  for (const token of catalogTokens) {
    assert.ok(
      catalogSource.includes(token),
      `agent-action-catalog.ts should own catalog token: ${token}`
    );
  }

  const guideTokens = [
    'label: "추천 상품 바로 주문"',
    'prompt: "추천 상품 전체를 바로 구매 진행해줘"',
    'label: "빠른검진 시작하기"',
  ];
  for (const token of guideTokens) {
    assert.ok(
      guideSource.includes(token),
      `useChat.agentGuide.ts should include cleaned guide token: ${token}`
    );
  }

  const docTokens = [
    "`lib/chat/agent-actions.ts`",
    "`lib/chat/agent-action-contracts.ts`",
    "`lib/chat/agent-action-catalog.ts`",
    "`app/chat/hooks/useChat.agentGuide.ts`",
    "`npm run qa:chat:agent-action-modules`",
  ];
  for (const token of docTokens) {
    assert.ok(
      docSource.includes(token),
      `chat-agent-action-modules.md should mention token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "chat_agent_actions_facade_is_thin",
          "chat_agent_action_contracts_are_shared",
          "chat_agent_action_catalog_owns_capability_copy",
          "chat_agent_guide_examples_are_cleaned",
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
  console.error("[qa:chat:agent-action-modules] FAIL", error);
  process.exit(1);
}
