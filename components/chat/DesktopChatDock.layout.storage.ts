import type {
  DockPanelPosition,
  DockPanelSize,
} from "./DesktopChatDock.layout.geometry";

const DOCK_SIZE_STORAGE_KEY = "wb_chat_dock_size_v1";
const CHAT_DOCK_LAYOUT_EVENT = "wb:chat-dock-layout";
const FOOTER_CART_BAR_OFFSET_CSS_VAR = "--wb-footer-cart-bar-offset";
const PENDING_DOCK_PROMPT_KEY = "wb_chat_dock_pending_prompt_v1";
const DOCK_NUDGE_DISMISS_KEY_PREFIX = "wb_chat_dock_nudge_dismissed_v2:";
const DOCK_NUDGE_GLOBAL_HIDE_UNTIL_KEY =
  "wb_chat_dock_nudge_global_hide_until_v1";
const DOCK_POSITION_STORAGE_KEY = "wb_chat_dock_position_v1";
const DOCK_TRIGGER_OFFSET_STORAGE_KEY = "wb_chat_dock_trigger_offset_v1";

export const DOCK_RESIZE_HINT_DISMISS_KEY = "wb_chat_dock_resize_hint_dismissed_v1";
export const DOCK_RESIZE_HINT_WIDTH = 420;
export const FOOTER_CART_BAR_LAYOUT_EVENT = "wb:footer-cart-bar-layout";
export const MOBILE_TRIGGER_BREAKPOINT = 640;
export const MOBILE_TRIGGER_EXTRA_GAP = 12;
export const DOCK_NUDGE_AUTO_HIDE_COOLDOWN_MS = 1000 * 60 * 30;
export const DOCK_NUDGE_MANUAL_HIDE_COOLDOWN_MS = 1000 * 60 * 60 * 12;

type ChatDockLayoutDetail = {
  open: boolean;
  left: number;
  right: number;
  width: number;
  height: number;
};

export type FooterCartBarLayoutDetail = {
  visible: boolean;
  height: number;
};

export function emitChatDockLayout(detail: ChatDockLayoutDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_DOCK_LAYOUT_EVENT, { detail }));
}

export function isFooterCartBarLayoutDetail(
  value: unknown
): value is FooterCartBarLayoutDetail {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.visible === "boolean" && typeof row.height === "number";
}

export function readFooterCartBarOffsetPx() {
  if (typeof window === "undefined") return 0;
  const raw =
    window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(FOOTER_CART_BAR_OFFSET_CSS_VAR) || "0";
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function queueDockPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  const text = prompt.trim();
  if (!text) return;
  try {
    window.sessionStorage.setItem(PENDING_DOCK_PROMPT_KEY, text);
  } catch {
    // ignore storage failures
  }
}

export function consumeDockPrompt() {
  if (typeof window === "undefined") return "";
  try {
    const text = (
      window.sessionStorage.getItem(PENDING_DOCK_PROMPT_KEY) || ""
    ).trim();
    if (!text) return "";
    window.sessionStorage.removeItem(PENDING_DOCK_PROMPT_KEY);
    return text;
  } catch {
    return "";
  }
}

export function isDockNudgeDismissed(routeKey: string) {
  if (typeof window === "undefined") return false;
  const key = `${DOCK_NUDGE_DISMISS_KEY_PREFIX}${routeKey || "generic"}`;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function dismissDockNudge(routeKey: string) {
  if (typeof window === "undefined") return;
  const key = `${DOCK_NUDGE_DISMISS_KEY_PREFIX}${routeKey || "generic"}`;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // ignore storage failures
  }
}

function readDockNudgeGlobalHideUntil() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(DOCK_NUDGE_GLOBAL_HIDE_UNTIL_KEY) || "0";
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function isDockNudgeGloballySuppressed(nowMs = Date.now()) {
  const until = readDockNudgeGlobalHideUntil();
  return until > nowMs;
}

export function suppressDockNudgeGlobally(cooldownMs: number) {
  if (typeof window === "undefined") return;
  const cooldown = Number.isFinite(cooldownMs) ? Math.max(0, Math.round(cooldownMs)) : 0;
  const until = Date.now() + cooldown;
  try {
    window.localStorage.setItem(DOCK_NUDGE_GLOBAL_HIDE_UNTIL_KEY, String(until));
  } catch {
    // ignore storage failures
  }
}

export function loadDockSize(): DockPanelSize | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOCK_SIZE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DockPanelSize> | null;
    if (!parsed) return null;
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width, height };
  } catch {
    return null;
  }
}

export function saveDockSize(size: DockPanelSize) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOCK_SIZE_STORAGE_KEY, JSON.stringify(size));
  } catch {
    // ignore storage failures
  }
}

export function loadDockPosition(): DockPanelPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOCK_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DockPanelPosition> | null;
    if (!parsed) return null;
    const left = Number(parsed.left);
    const top = Number(parsed.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    return { left, top };
  } catch {
    return null;
  }
}

export function saveDockPosition(position: DockPanelPosition) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DOCK_POSITION_STORAGE_KEY,
      JSON.stringify(position)
    );
  } catch {
    // ignore storage failures
  }
}

export type DockTriggerOffset = {
  x: number;
  y: number;
};

type DockTriggerViewport = "desktop" | "mobile";

type DockTriggerOffsetStorage =
  | Partial<DockTriggerOffset>
  | {
      desktop?: Partial<DockTriggerOffset>;
      mobile?: Partial<DockTriggerOffset>;
    };

function parseDockTriggerOffset(value: unknown): DockTriggerOffset | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const x = Number(row.x);
  const y = Number(row.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function readDockTriggerOffsetStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOCK_TRIGGER_OFFSET_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DockTriggerOffsetStorage | null;
  } catch {
    return null;
  }
}

export function loadDockTriggerOffset(
  viewport: DockTriggerViewport = "desktop"
): DockTriggerOffset | null {
  if (typeof window === "undefined") return null;
  const parsed = readDockTriggerOffsetStorage();
  if (!parsed) return null;
  const directOffset = parseDockTriggerOffset(parsed);
  if (directOffset) return directOffset;
  const scopedOffset = parseDockTriggerOffset(
    (parsed as Record<string, unknown>)[viewport]
  );
  if (scopedOffset) return scopedOffset;
  const fallbackViewport = viewport === "mobile" ? "desktop" : "mobile";
  return parseDockTriggerOffset(
    (parsed as Record<string, unknown>)[fallbackViewport]
  );
}

export function saveDockTriggerOffset(
  offset: DockTriggerOffset,
  viewport: DockTriggerViewport = "desktop"
) {
  if (typeof window === "undefined") return;
  try {
    const parsed = readDockTriggerOffsetStorage();
    const legacyOffset = parseDockTriggerOffset(parsed);
    const nextStorage = {
      desktop:
        parseDockTriggerOffset(
          parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>).desktop
            : null
        ) ?? legacyOffset,
      mobile:
        parseDockTriggerOffset(
          parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>).mobile
            : null
        ) ?? legacyOffset,
    };

    nextStorage[viewport] = offset;

    window.localStorage.setItem(
      DOCK_TRIGGER_OFFSET_STORAGE_KEY,
      JSON.stringify(nextStorage)
    );
  } catch {
    // ignore storage failures
  }
}

export function clearDockTriggerOffset() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DOCK_TRIGGER_OFFSET_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
