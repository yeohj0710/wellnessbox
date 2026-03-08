const VERTICAL_SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);
const SCROLL_EPSILON = 1;
const DOCK_MIN_WIDTH = 320;
const DOCK_MIN_HEIGHT = 420;
const DOCK_VIEWPORT_GAP_X = 24;
const DOCK_VIEWPORT_GAP_Y = 32;
const DOCK_POSITION_MARGIN = 12;

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
