import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DOCK_PATH = path.resolve(
  process.cwd(),
  "components/chat/DesktopChatDock.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "components/chat/useDesktopChatDockLauncher.ts"
);
const README_PATH = path.resolve(process.cwd(), "components/chat/README.md");

function run() {
  const dockSource = fs.readFileSync(DOCK_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");
  const readmeSource = fs.readFileSync(README_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    dockSource,
    /import \{ useDesktopChatDockLauncher \} from "\.\/useDesktopChatDockLauncher";/,
    "DesktopChatDock must import the launcher hook."
  );
  for (const token of [
    "} = useDesktopChatDockLauncher({",
    "hasNudgePrompts: nudgePrompts.length > 0,",
    "onClose={closeDock}",
    "dismissRouteNudge",
    "openDockWithPrompt(prompt)",
  ]) {
    assert.ok(
      dockSource.includes(token),
      `[qa:chat:dock-launcher] missing dock token: ${token}`
    );
  }
  checks.push("dock_uses_launcher_hook");

  for (const legacyToken of [
    "const [isOpen, setIsOpen] = useState(false);",
    "const [hasBooted, setHasBooted] = useState(false);",
    "const [pendingOpen, setPendingOpen] = useState(false);",
    "const [viewportWidth, setViewportWidth] = useState(0);",
    "window.addEventListener(\"wb:chat-close-dock\"",
    "window.addEventListener(\"resize\", onResize)",
    "readFooterCartBarOffsetPx()",
    "requestIdleCallback",
  ]) {
    assert.ok(
      !dockSource.includes(legacyToken),
      `DesktopChatDock should not keep legacy inline launcher token: ${legacyToken}`
    );
  }
  checks.push("dock_no_longer_keeps_inline_launcher_state_and_effects");

  assert.match(
    hookSource,
    /export function useDesktopChatDockLauncher/,
    "useDesktopChatDockLauncher must export properly."
  );
  for (const token of [
    "const [isOpen, setIsOpen] = useState(false);",
    "const [hasBooted, setHasBooted] = useState(false);",
    "FOOTER_CART_BAR_LAYOUT_EVENT",
    "requestIdleCallback",
    "queueDockPrompt(prompt);",
    "dismissDockNudge(routeKey);",
    "window.addEventListener(\"wb:chat-close-dock\", handleCloseDock);",
    "window.addEventListener(\"openCart\", handleCloseDock);",
    "emitChatDockLayout({",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `[qa:chat:dock-launcher] missing launcher-hook token: ${token}`
    );
  }
  checks.push("launcher_hook_owns_open_boot_nudge_and_global_events");

  assert.ok(
    readmeSource.includes("useDesktopChatDockLauncher.ts"),
    "Chat dock README should document the launcher hook."
  );
  checks.push("chat_readme_mentions_launcher_hook");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
