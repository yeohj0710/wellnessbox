/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const rootSource = read("lib/chat/prompts.ts");
  const helperSource = read("lib/chat/prompt-helpers.ts");
  const systemSource = read("lib/chat/prompt-system.ts");
  const followupSource = read("lib/chat/prompt-followups.ts");
  const docSource = read("docs/maintenance/chat-prompt-modules.md");

  const rootTokens = [
    'from "./prompt-helpers"',
    'from "./prompt-followups"',
    'from "./prompt-system"',
    "buildPromptContextPayload(",
    "normalizePromptChatHistory(",
    "buildSystemPrompt(",
    "buildSuggestionMessages,",
    "buildTitleMessages,",
  ];
  for (const token of rootTokens) {
    assert.ok(
      rootSource.includes(token),
      `prompts.ts should compose prompt modules with token: ${token}`
    );
  }

  const forbiddenRootTokens = [
    "function cleanPromptLine(",
    "function clipPromptText(",
    "function formatPromptHistory(",
    "function buildModeRules(",
    "function buildToneRules(",
    "function buildDataRules(",
    "function buildRagRules(",
    "export function buildSuggestionMessages(",
    "export function buildTitleMessages(",
  ];
  for (const token of forbiddenRootTokens) {
    assert.ok(
      !rootSource.includes(token),
      `prompts.ts should not inline extracted prompt token: ${token}`
    );
  }

  const helperTokens = [
    "export function cleanPromptLine(",
    "export function clipPromptText(",
    "export function formatPromptHistory(",
    "export function buildPromptContextPayload(",
    "export function normalizePromptChatHistory(",
    'const who = message.role === "user" ? "사용자" : "AI";',
  ];
  for (const token of helperTokens) {
    assert.ok(
      helperSource.includes(token),
      `prompt-helpers.ts should own helper token: ${token}`
    );
  }

  const systemTokens = [
    "function buildModeRules(",
    "function buildToneRules(",
    "function buildDataRules(",
    "function buildRagRules(",
    "export function buildSystemPrompt(",
    "추천 제품(7일 기준 가격)",
    "반드시 존댓말 '~요'로 답변합니다.",
  ];
  for (const token of systemTokens) {
    assert.ok(
      systemSource.includes(token),
      `prompt-system.ts should own system prompt token: ${token}`
    );
  }

  const followupTokens = [
    "export function buildSuggestionTopicClassifierMessages(",
    "export function buildSuggestionMessages(",
    "export function buildTitleMessages(",
    "[품질 가드]",
    "즉시 실행 가능한 요청",
    "한국어 제목 1개를 생성하세요.",
  ];
  for (const token of followupTokens) {
    assert.ok(
      followupSource.includes(token),
      `prompt-followups.ts should own follow-up token: ${token}`
    );
  }

  const docTokens = [
    "`lib/chat/prompts.ts`",
    "`lib/chat/prompt-helpers.ts`",
    "`lib/chat/prompt-system.ts`",
    "`lib/chat/prompt-followups.ts`",
    "`npm run qa:chat:prompt-modules`",
  ];
  for (const token of docTokens) {
    assert.ok(
      docSource.includes(token),
      `chat-prompt-modules.md should mention token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "chat_prompt_root_is_composition_shell",
          "chat_prompt_helpers_own_history_context_normalization",
          "chat_prompt_system_module_owns_system_rules",
          "chat_prompt_followup_module_owns_suggestion_and_title_prompts",
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
  console.error("[qa:chat:prompt-modules] FAIL", error);
  process.exit(1);
}
