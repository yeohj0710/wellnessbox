import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const USE_CHAT_PATH = path.resolve(process.cwd(), "app/chat/hooks/useChat.ts");
const COMMAND_LAYER_PATH = path.resolve(
  process.cwd(),
  "app/chat/hooks/useChat.commandLayer.ts"
);

function run() {
  const useChatSource = fs.readFileSync(USE_CHAT_PATH, "utf8");
  const commandLayerSource = fs.readFileSync(COMMAND_LAYER_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    useChatSource,
    /import \{ createChatCommandLayer \} from "\.\/useChat\.commandLayer";/,
    "useChat must import the dedicated command-layer module."
  );
  assert.match(
    useChatSource,
    /const \{\s*sendMessage,\s*startInitialAssistantMessage,\s*handleInteractiveAction,\s*newChat,\s*deleteChat,\s*renameChat,\s*stopStreaming,\s*handleProfileChange,\s*cancelInChatAssessment,\s*openAssessmentPageFromChat,\s*generateTitle,\s*\} = createChatCommandLayer\(/m,
    "useChat must source UI-facing handlers from createChatCommandLayer."
  );
  checks.push("usechat_delegates_ui_handlers_to_command_layer");

  for (const legacyToken of [
    'import { createInteractiveCommands } from "./useChat.interactiveCommands";',
    'import { createSessionCommands } from "./useChat.sessionCommands";',
    'import { createInChatAssessmentHandlers } from "./useChat.assessmentHandlers";',
    'import { createAssistantTurnHandlers } from "./useChat.assistantTurnHandlers";',
    'import { createMessageFlowHandlers } from "./useChat.messageFlowHandlers";',
    "function rememberExecutedActions(actions: ChatActionType[]) {",
    "function clearFollowups() {",
    "function updateAssistantMessage(sessionId: string, messageId: string, content: string) {",
  ]) {
    assert.ok(
      !useChatSource.includes(legacyToken),
      `useChat should not keep legacy inline command-layer token: ${legacyToken}`
    );
  }
  checks.push("usechat_no_longer_keeps_inline_command_layer_helpers");

  for (const token of [
    "export function createChatCommandLayer(",
    "function rememberExecutedActions(actions: ChatActionType[]) {",
    "function clearFollowups() {",
    "function updateAssistantMessage(",
    "const { finalizeAssistantTurn, generateTitle } = createAssistantTurnHandlers({",
    "const interactiveCommands = createInteractiveCommands({",
    "const { sendMessage, startInitialAssistantMessage } = createMessageFlowHandlers({",
    "const {",
    "newChat,",
    "deleteChat,",
    "renameChat,",
    "} = createSessionCommands({",
  ]) {
    assert.ok(
      commandLayerSource.includes(token),
      `[qa:chat:command-layer] missing command-layer token: ${token}`
    );
  }
  checks.push("command_layer_owns_handler_assembly_and_helper_closures");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
