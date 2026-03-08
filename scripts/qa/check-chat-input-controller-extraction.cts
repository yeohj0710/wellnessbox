import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CHAT_INPUT_PATH = path.resolve(process.cwd(), "app/chat/components/ChatInput.tsx");
const CHAT_INPUT_TYPES_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/chatInput.types.ts"
);
const CHAT_INPUT_CONTROLLER_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/useChatInputController.ts"
);
const CHAT_INPUT_ASSIST_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/ChatInputActionAssist.tsx"
);

function run() {
  const chatInputSource = fs.readFileSync(CHAT_INPUT_PATH, "utf8");
  const chatInputTypesSource = fs.readFileSync(CHAT_INPUT_TYPES_PATH, "utf8");
  const controllerSource = fs.readFileSync(CHAT_INPUT_CONTROLLER_PATH, "utf8");
  const assistSource = fs.readFileSync(CHAT_INPUT_ASSIST_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    chatInputSource,
    /import \{ ChatInputActionAssist \} from "\.\/ChatInputActionAssist";/,
    "ChatInput must import the extracted action assist presenter."
  );
  assert.match(
    chatInputSource,
    /import type \{ ChatInputProps \} from "\.\/chatInput\.types";/,
    "ChatInput must import the shared prop contract."
  );
  assert.match(
    chatInputSource,
    /import \{ useChatInputController \} from "\.\/useChatInputController";/,
    "ChatInput must import the extracted controller hook."
  );
  assert.match(
    chatInputSource,
    /<ChatInputActionAssist[\s\S]*showCoachmark=\{showCoachmark\}[\s\S]*onRunUnifiedAction=\{runUnifiedAction\}[\s\S]*\/>/,
    "ChatInput should delegate coachmark/tray rendering to ChatInputActionAssist."
  );
  checks.push("chat_input_shell_uses_controller_and_assist_presenter");

  for (const legacyToken of [
    "const AGENT_COACHMARK_DISMISS_KEY =",
    "const [actionTrayOpen, setActionTrayOpen] = useState(",
    "const [showCoachmark, setShowCoachmark] = useState(",
    "const dismissCoachmark = () => {",
    "const resizeToContent = useCallback(",
    "buildUnifiedActions({",
  ]) {
    assert.ok(
      !chatInputSource.includes(legacyToken),
      `ChatInput.tsx should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("chat_input_shell_no_longer_owns_local_controller_logic");

  assert.match(
    chatInputTypesSource,
    /export interface ChatInputProps \{/,
    "ChatInput props should live in chatInput.types.ts."
  );
  checks.push("shared_props_contract_added");

  for (const token of [
    "export function useChatInputController(",
    "const AGENT_COACHMARK_DISMISS_KEY =",
    "buildUnifiedActions({",
    "window.localStorage.getItem(AGENT_COACHMARK_DISMISS_KEY)",
    "const resizeToContent = useCallback(() => {",
    'window.addEventListener("resize", onResize);',
  ]) {
    assert.ok(
      controllerSource.includes(token),
      `[qa:chat:input-controller] missing controller token: ${token}`
    );
  }
  checks.push("controller_hook_owns_local_state_effects_and_unified_actions");

  for (const token of [
    "export function ChatInputActionAssist(",
    "말로 지시하면 실행까지 바로 도와드려요.",
    "장바구니/주문/화면 이동까지 대화로 실행할 수 있어요",
    "빠른 실행",
  ]) {
    assert.ok(
      assistSource.includes(token),
      `[qa:chat:input-controller] missing assist-presenter token: ${token}`
    );
  }
  checks.push("assist_presenter_owns_coachmark_hint_and_tray_markup");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
