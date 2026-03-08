import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_PATH = path.resolve(
  process.cwd(),
  "components/chat/DesktopChatDock.layout.ts"
);
const GEOMETRY_PATH = path.resolve(
  process.cwd(),
  "components/chat/DesktopChatDock.layout.geometry.ts"
);
const STORAGE_PATH = path.resolve(
  process.cwd(),
  "components/chat/DesktopChatDock.layout.storage.ts"
);
const README_PATH = path.resolve(process.cwd(), "components/chat/README.md");

function run() {
  const rootSource = fs.readFileSync(ROOT_PATH, "utf8");
  const geometrySource = fs.readFileSync(GEOMETRY_PATH, "utf8");
  const storageSource = fs.readFileSync(STORAGE_PATH, "utf8");
  const readmeSource = fs.readFileSync(README_PATH, "utf8");
  const checks: string[] = [];

  for (const token of [
    'from "./DesktopChatDock.layout.geometry";',
    "clampDockSize,",
    "resizeCursorForEdge,",
    'export type { FooterCartBarLayoutDetail } from "./DesktopChatDock.layout.storage";',
    "queueDockPrompt,",
    "saveDockPosition,",
  ]) {
    assert.ok(
      rootSource.includes(token),
      `[qa:chat:dock-layout-modules] missing root export token: ${token}`
    );
  }
  checks.push("root_reexports_geometry_and_storage_surfaces");

  for (const legacyToken of [
    "const VERTICAL_SCROLLABLE_OVERFLOW =",
    "const DOCK_SIZE_STORAGE_KEY =",
    "export function clampDockSize(",
    "export function queueDockPrompt(",
    "function readDockNudgeGlobalHideUntil()",
  ]) {
    assert.ok(
      !rootSource.includes(legacyToken),
      `DesktopChatDock.layout.ts should not keep inline helper token: ${legacyToken}`
    );
  }
  checks.push("root_is_now_a_stable_export_surface_only");

  for (const token of [
    "export type DockPanelSize = {",
    "export type DockResizeEdge =",
    "const VERTICAL_SCROLLABLE_OVERFLOW = new Set([",
    "export function clampDockPosition(",
    "export function findScrollableWithinBoundary(",
    "export function resizeCursorForEdge(",
  ]) {
    assert.ok(
      geometrySource.includes(token),
      `[qa:chat:dock-layout-modules] missing geometry token: ${token}`
    );
  }
  checks.push("geometry_module_owns_resize_scroll_and_clamp_helpers");

  for (const token of [
    'from "./DesktopChatDock.layout.geometry";',
    'const DOCK_SIZE_STORAGE_KEY = "wb_chat_dock_size_v1";',
    'const PENDING_DOCK_PROMPT_KEY = "wb_chat_dock_pending_prompt_v1";',
    "export function emitChatDockLayout(detail: ChatDockLayoutDetail) {",
    "export function queueDockPrompt(prompt: string) {",
    "export function consumeDockPrompt() {",
    "export function loadDockSize(): DockPanelSize | null {",
    "export function saveDockPosition(position: DockPanelPosition) {",
  ]) {
    assert.ok(
      storageSource.includes(token),
      `[qa:chat:dock-layout-modules] missing storage token: ${token}`
    );
  }
  checks.push("storage_module_owns_prompt_nudge_storage_and_layout_events");

  for (const token of [
    "DesktopChatDock.layout.ts",
    "DesktopChatDock.layout.geometry.ts",
    "DesktopChatDock.layout.storage.ts",
  ]) {
    assert.ok(
      readmeSource.includes(token),
      `[qa:chat:dock-layout-modules] README missing token: ${token}`
    );
  }
  checks.push("chat_readme_mentions_layout_export_surface_and_submodules");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
