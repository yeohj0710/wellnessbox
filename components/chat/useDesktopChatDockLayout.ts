"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  DOCK_RESIZE_HINT_DISMISS_KEY,
  DOCK_RESIZE_HINT_WIDTH,
  clampDockPosition,
  clampDockSize,
  emitChatDockLayout,
  getDefaultDockPosition,
  getDefaultDockSize,
  loadDockPosition,
  loadDockSize,
  type DockPanelPosition,
  type DockPanelSize,
  type DockResizeEdge,
  type DocumentScrollLockSnapshot,
} from "./DesktopChatDock.layout";
import { useDesktopChatDockPointer } from "./useDesktopChatDockPointer";

type UseDesktopChatDockLayoutOptions = {
  isOpen: boolean;
  panelRef: RefObject<HTMLElement | null>;
};

type UseDesktopChatDockLayoutResult = {
  isResizing: boolean;
  isDragging: boolean;
  showResizeHint: boolean;
  dismissResizeHint: () => void;
  startResize: (
    event: ReactPointerEvent<HTMLElement>,
    edge: DockResizeEdge
  ) => void;
  startDrag: (event: ReactPointerEvent<HTMLElement>) => void;
  panelInlineStyle: {
    width: string;
    height: string;
    left: string;
    top: string;
  };
};

function getInitialDockSize(): DockPanelSize {
  return clampDockSize(loadDockSize() ?? getDefaultDockSize());
}

function getInitialDockPosition(size: DockPanelSize): DockPanelPosition {
  return clampDockPosition(
    loadDockPosition() ?? getDefaultDockPosition(size),
    size
  );
}

export function useDesktopChatDockLayout({
  isOpen,
  panelRef,
}: UseDesktopChatDockLayoutOptions): UseDesktopChatDockLayoutResult {
  const [panelSize, setPanelSize] = useState<DockPanelSize>(() =>
    getInitialDockSize()
  );
  const [panelPosition, setPanelPosition] = useState<DockPanelPosition>(() =>
    getInitialDockPosition(getInitialDockSize())
  );
  const panelSizeRef = useRef(panelSize);
  const panelPositionRef = useRef(panelPosition);
  const interactionDocumentLockRef =
    useRef<DocumentScrollLockSnapshot | null>(null);
  const [showResizeHint, setShowResizeHint] = useState(false);
  const [resizeHintDismissed, setResizeHintDismissed] = useState(false);

  const applyPanelSizeToDom = useCallback(
    (size: DockPanelSize) => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.width = `${size.width}px`;
      panel.style.height = `${size.height}px`;
    },
    [panelRef]
  );

  const applyPanelPositionToDom = useCallback(
    (position: DockPanelPosition) => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.left = `${position.left}px`;
      panel.style.top = `${position.top}px`;
    },
    [panelRef]
  );

  const lockInteractionScroll = useCallback((cursor: string) => {
    if (typeof document === "undefined") return;
    const bodyStyle = document.body.style;
    const rootStyle = document.documentElement.style;
    if (!interactionDocumentLockRef.current) {
      interactionDocumentLockRef.current = {
        bodyOverflow: bodyStyle.overflow,
        bodyTouchAction: bodyStyle.touchAction,
        bodyOverscrollBehavior: bodyStyle.overscrollBehavior,
        bodyUserSelect: bodyStyle.userSelect,
        bodyCursor: bodyStyle.cursor,
        rootOverflow: rootStyle.overflow,
        rootTouchAction: rootStyle.touchAction,
        rootOverscrollBehavior: rootStyle.overscrollBehavior,
      };
    }
    bodyStyle.overflow = "hidden";
    bodyStyle.touchAction = "none";
    bodyStyle.overscrollBehavior = "none";
    bodyStyle.userSelect = "none";
    bodyStyle.cursor = cursor;
    rootStyle.overflow = "hidden";
    rootStyle.touchAction = "none";
    rootStyle.overscrollBehavior = "none";
  }, []);

  const releaseInteractionScroll = useCallback(() => {
    if (typeof document === "undefined") return;
    const snapshot = interactionDocumentLockRef.current;
    if (!snapshot) return;
    const bodyStyle = document.body.style;
    const rootStyle = document.documentElement.style;
    bodyStyle.overflow = snapshot.bodyOverflow;
    bodyStyle.touchAction = snapshot.bodyTouchAction;
    bodyStyle.overscrollBehavior = snapshot.bodyOverscrollBehavior;
    bodyStyle.userSelect = snapshot.bodyUserSelect;
    bodyStyle.cursor = snapshot.bodyCursor;
    rootStyle.overflow = snapshot.rootOverflow;
    rootStyle.touchAction = snapshot.rootTouchAction;
    rootStyle.overscrollBehavior = snapshot.rootOverscrollBehavior;
    interactionDocumentLockRef.current = null;
  }, []);

  const { isResizing, isDragging, startResize, startDrag } =
    useDesktopChatDockPointer({
      isOpen,
      panelSizeRef,
      panelPositionRef,
      applyPanelSizeToDom,
      applyPanelPositionToDom,
      setPanelSize,
      setPanelPosition,
      lockInteractionScroll,
      releaseInteractionScroll,
      onInteractionStart: () => setShowResizeHint(false),
    });

  useEffect(() => {
    panelSizeRef.current = panelSize;
    applyPanelSizeToDom(panelSize);
  }, [applyPanelSizeToDom, panelSize]);

  useEffect(() => {
    panelPositionRef.current = panelPosition;
    applyPanelPositionToDom(panelPosition);
  }, [applyPanelPositionToDom, panelPosition]);

  useEffect(() => {
    const emitClosed = () =>
      emitChatDockLayout({
        open: false,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
      });

    const emitOpen = () => {
      const panel = panelRef.current;
      if (!panel) {
        emitClosed();
        return;
      }
      const rect = panel.getBoundingClientRect();
      emitChatDockLayout({
        open: true,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      });
    };

    if (!isOpen) {
      emitClosed();
      return;
    }

    const rafId = window.requestAnimationFrame(emitOpen);
    const onResize = () => emitOpen();
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      if (!isOpen) {
        emitClosed();
      }
    };
  }, [
    isOpen,
    panelPosition.left,
    panelPosition.top,
    panelSize.width,
    panelSize.height,
    isDragging,
    isResizing,
    panelRef,
  ]);

  useEffect(() => {
    const restoredSize = getInitialDockSize();
    const restoredPosition = getInitialDockPosition(restoredSize);

    setPanelSize(restoredSize);
    panelSizeRef.current = restoredSize;
    applyPanelSizeToDom(restoredSize);

    setPanelPosition(restoredPosition);
    panelPositionRef.current = restoredPosition;
    applyPanelPositionToDom(restoredPosition);
  }, [applyPanelPositionToDom, applyPanelSizeToDom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setResizeHintDismissed(
        window.localStorage.getItem(DOCK_RESIZE_HINT_DISMISS_KEY) === "1"
      );
    } catch {}
  }, []);

  useEffect(() => {
    const onResize = () => {
      const nextSize = clampDockSize(panelSizeRef.current);
      panelSizeRef.current = nextSize;
      applyPanelSizeToDom(nextSize);
      setPanelSize(nextSize);

      const nextPosition = clampDockPosition(panelPositionRef.current, nextSize);
      panelPositionRef.current = nextPosition;
      applyPanelPositionToDom(nextPosition);
      setPanelPosition(nextPosition);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [applyPanelPositionToDom, applyPanelSizeToDom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpen || resizeHintDismissed || isResizing) {
      setShowResizeHint(false);
      return;
    }
    if (panelSize.width > DOCK_RESIZE_HINT_WIDTH) {
      setShowResizeHint(false);
      return;
    }
    setShowResizeHint(true);
    const timer = window.setTimeout(() => setShowResizeHint(false), 9000);
    return () => window.clearTimeout(timer);
  }, [isOpen, isResizing, panelSize.width, resizeHintDismissed]);

  const dismissResizeHint = useCallback(() => {
    setShowResizeHint(false);
    setResizeHintDismissed(true);
    try {
      window.localStorage.setItem(DOCK_RESIZE_HINT_DISMISS_KEY, "1");
    } catch {}
  }, []);

  const panelInlineStyle = useMemo(
    () => ({
      width: `${(isResizing ? panelSizeRef.current : panelSize).width}px`,
      height: `${(isResizing ? panelSizeRef.current : panelSize).height}px`,
      left: `${
        (isResizing || isDragging ? panelPositionRef.current : panelPosition)
          .left
      }px`,
      top: `${
        (isResizing || isDragging ? panelPositionRef.current : panelPosition)
          .top
      }px`,
    }),
    [isDragging, isResizing, panelPosition, panelSize]
  );

  return {
    isResizing,
    isDragging,
    showResizeHint,
    dismissResizeHint,
    startResize,
    startDrag,
    panelInlineStyle,
  };
}
