const VERTICAL_SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);
const SCROLL_EPSILON = 1;
const DOCK_SIZE_STORAGE_KEY = "wb_chat_dock_size_v1";
const DOCK_MIN_WIDTH = 320;
const DOCK_MIN_HEIGHT = 420;
const DOCK_VIEWPORT_GAP_X = 24;
const DOCK_VIEWPORT_GAP_Y = 32;
const DOCK_POSITION_MARGIN = 12;
const CHAT_DOCK_LAYOUT_EVENT = "wb:chat-dock-layout";
const FOOTER_CART_BAR_OFFSET_CSS_VAR = "--wb-footer-cart-bar-offset";
const PENDING_DOCK_PROMPT_KEY = "wb_chat_dock_pending_prompt_v1";
const DOCK_NUDGE_DISMISS_KEY_PREFIX = "wb_chat_dock_nudge_dismissed_v2:";
const DOCK_NUDGE_GLOBAL_HIDE_UNTIL_KEY =
  "wb_chat_dock_nudge_global_hide_until_v1";
const DOCK_POSITION_STORAGE_KEY = "wb_chat_dock_position_v1";

export const DOCK_RESIZE_HINT_DISMISS_KEY = "wb_chat_dock_resize_hint_dismissed_v1";
export const DOCK_RESIZE_HINT_WIDTH = 420;
export const FOOTER_CART_BAR_LAYOUT_EVENT = "wb:footer-cart-bar-layout";
export const MOBILE_TRIGGER_BREAKPOINT = 640;
export const MOBILE_TRIGGER_EXTRA_GAP = 12;
export const DOCK_NUDGE_AUTO_HIDE_COOLDOWN_MS = 1000 * 60 * 30;
export const DOCK_NUDGE_MANUAL_HIDE_COOLDOWN_MS = 1000 * 60 * 60 * 12;

export type DockPanelSize = {
  width: number;
  height: number;
};

export type DockResizeEdge =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type DockResizeState = {
  edge: DockResizeEdge;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startLeft: number;
  startTop: number;
};

export type DockPanelPosition = {
  left: number;
  top: number;
};

export type DockDragState = {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
};

export type DocumentScrollLockSnapshot = {
  bodyOverflow: string;
  bodyTouchAction: string;
  bodyOverscrollBehavior: string;
  bodyUserSelect: string;
  bodyCursor: string;
  rootOverflow: string;
  rootTouchAction: string;
  rootOverscrollBehavior: string;
};

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

export function clampDockSize(size: DockPanelSize): DockPanelSize {
  if (typeof window === "undefined") {
    return size;
  }

  const maxWidth = Math.max(280, window.innerWidth - DOCK_VIEWPORT_GAP_X);
  const maxHeight = Math.max(320, window.innerHeight - DOCK_VIEWPORT_GAP_Y);
  const minWidth = Math.min(DOCK_MIN_WIDTH, maxWidth);
  const minHeight = Math.min(DOCK_MIN_HEIGHT, maxHeight);

  return {
    width: Math.round(Math.min(maxWidth, Math.max(minWidth, size.width))),
    height: Math.round(Math.min(maxHeight, Math.max(minHeight, size.height))),
  };
}

export function getDefaultDockSize(): DockPanelSize {
  if (typeof window === "undefined") {
    return { width: 420, height: 640 };
  }

  const preferredWidth = window.innerWidth >= 1280 ? 460 : 420;
  const preferredHeight = Math.min(Math.round(window.innerHeight * 0.82), 760);
  return clampDockSize({ width: preferredWidth, height: preferredHeight });
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

export function clampDockPosition(
  position: DockPanelPosition,
  size: DockPanelSize
): DockPanelPosition {
  if (typeof window === "undefined") {
    return position;
  }

  const maxLeft = Math.max(
    DOCK_POSITION_MARGIN,
    window.innerWidth - size.width - DOCK_POSITION_MARGIN
  );
  const maxTop = Math.max(
    DOCK_POSITION_MARGIN,
    window.innerHeight - size.height - DOCK_POSITION_MARGIN
  );

  return {
    left: Math.round(
      Math.min(maxLeft, Math.max(DOCK_POSITION_MARGIN, position.left))
    ),
    top: Math.round(
      Math.min(maxTop, Math.max(DOCK_POSITION_MARGIN, position.top))
    ),
  };
}

export function getDefaultDockPosition(size: DockPanelSize): DockPanelPosition {
  if (typeof window === "undefined") {
    return { left: DOCK_POSITION_MARGIN, top: DOCK_POSITION_MARGIN };
  }

  return clampDockPosition(
    {
      left: window.innerWidth - size.width - 20,
      top: window.innerHeight - size.height - 24,
    },
    size
  );
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

function isScrollableY(node: HTMLElement) {
  const { overflowY } = window.getComputedStyle(node);
  if (!VERTICAL_SCROLLABLE_OVERFLOW.has(overflowY)) return false;
  return node.scrollHeight > node.clientHeight + SCROLL_EPSILON;
}

export function findScrollableWithinBoundary(
  start: HTMLElement | null,
  boundary: HTMLElement
) {
  let cursor: HTMLElement | null = start;
  while (cursor && cursor !== boundary) {
    if (isScrollableY(cursor)) return cursor;
    cursor = cursor.parentElement;
  }
  return isScrollableY(boundary) ? boundary : null;
}

export function shouldPreventScrollChain(scrollable: HTMLElement, deltaY: number) {
  if (deltaY < 0) return scrollable.scrollTop <= SCROLL_EPSILON;
  const remaining =
    scrollable.scrollHeight - scrollable.clientHeight - scrollable.scrollTop;
  return remaining <= SCROLL_EPSILON;
}

export function blurFocusedDescendant(container: HTMLElement | null) {
  if (!container) return;
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLElement &&
    container.contains(activeElement)
  ) {
    activeElement.blur();
  }
}

export function edgeIncludesLeft(edge: DockResizeEdge) {
  return edge === "left" || edge === "top-left" || edge === "bottom-left";
}

export function edgeIncludesRight(edge: DockResizeEdge) {
  return edge === "right" || edge === "top-right" || edge === "bottom-right";
}

export function edgeIncludesTop(edge: DockResizeEdge) {
  return edge === "top" || edge === "top-left" || edge === "top-right";
}

export function edgeIncludesBottom(edge: DockResizeEdge) {
  return edge === "bottom" || edge === "bottom-left" || edge === "bottom-right";
}

export function resizeCursorForEdge(edge: DockResizeEdge) {
  if (edge === "left" || edge === "right") return "ew-resize";
  if (edge === "top" || edge === "bottom") return "ns-resize";
  if (edge === "top-right" || edge === "bottom-left") return "nesw-resize";
  return "nwse-resize";
}
