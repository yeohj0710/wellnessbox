import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PANEL_PATH = path.resolve(
  process.cwd(),
  "components/chat/DesktopChatDockPanel.tsx"
);
const SHELL_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/chat/useDesktopChatDockPanelShell.ts"
);
const README_PATH = path.resolve(process.cwd(), "components/chat/README.md");

function run() {
  const panelSource = fs.readFileSync(PANEL_PATH, "utf8");
  const shellHookSource = fs.readFileSync(SHELL_HOOK_PATH, "utf8");
  const readmeSource = fs.readFileSync(README_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    panelSource,
    /import \{ useDesktopChatDockPanelShell \} from "\.\/useDesktopChatDockPanelShell";/,
    "DesktopChatDockPanel must import the panel shell hook."
  );
  for (const token of [
    "} = useDesktopChatDockPanelShell({",
    "activeMessages: active?.messages || null,",
    "closeSessionsPanel,",
    "handleCreateSession,",
    "handleDeleteSession,",
  ]) {
    assert.ok(
      panelSource.includes(token),
      `[qa:chat:dock-panel-shell] missing panel token: ${token}`
    );
  }
  checks.push("panel_uses_dock_shell_hook");

  for (const legacyToken of [
    "const panelRef = useRef<HTMLElement | null>(null);",
    "const sessionsLayerRef = useRef<HTMLDivElement | null>(null);",
    "const [sessionsOpen, setSessionsOpen] = useState(false);",
    "const assistantLoadingMetaByIndex = useMemo(",
    "consumeDockPrompt()",
    "findScrollableWithinBoundary(",
    "window.prompt(",
    "window.confirm(",
    "const handleCloseDock = () => {",
  ]) {
    assert.ok(
      !panelSource.includes(legacyToken),
      `DesktopChatDockPanel should not keep legacy inline shell token: ${legacyToken}`
    );
  }
  checks.push("panel_no_longer_keeps_inline_shell_effects");

  assert.match(
    shellHookSource,
    /export function useDesktopChatDockPanelShell/,
    "useDesktopChatDockPanelShell must export properly."
  );
  for (const token of [
    "consumeDockPrompt()",
    "buildAssistantLoadingMetaMap(activeMessages)",
    'panel.setAttribute("inert", "")',
    'layer.setAttribute("inert", "")',
    "findScrollableWithinBoundary(",
    "shouldPreventScrollChain(",
    "window.prompt(",
    "window.confirm(",
    "newChat();",
    "setActiveId(sessionId);",
  ]) {
    assert.ok(
      shellHookSource.includes(token),
      `[qa:chat:dock-panel-shell] missing shell-hook token: ${token}`
    );
  }
  checks.push("shell_hook_owns_prompt_focus_scroll_and_session_actions");

  assert.ok(
    readmeSource.includes("useDesktopChatDockPanelShell.ts"),
    "Chat dock README should document the panel shell hook."
  );
  checks.push("chat_readme_mentions_panel_shell_hook");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
