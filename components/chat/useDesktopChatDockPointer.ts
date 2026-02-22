"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import {
  clampDockPosition,
  clampDockSize,
  edgeIncludesBottom,
  edgeIncludesLeft,
  edgeIncludesRight,
  edgeIncludesTop,
  resizeCursorForEdge,
  saveDockPosition,
  saveDockSize,
  type DockDragState,
  type DockPanelPosition,
  type DockPanelSize,
  type DockResizeEdge,
  type DockResizeState,
} from "./DesktopChatDock.layout";

type UseDesktopChatDockPointerOptions = {
  isOpen: boolean;
  panelSizeRef: MutableRefObject<DockPanelSize>;
  panelPositionRef: MutableRefObject<DockPanelPosition>;
  applyPanelSizeToDom: (size: DockPanelSize) => void;
  applyPanelPositionToDom: (position: DockPanelPosition) => void;
  setPanelSize: Dispatch<SetStateAction<DockPanelSize>>;
  setPanelPosition: Dispatch<SetStateAction<DockPanelPosition>>;
  lockInteractionScroll: (cursor: string) => void;
  releaseInteractionScroll: () => void;
  onInteractionStart?: () => void;
};

type UseDesktopChatDockPointerResult = {
  isResizing: boolean;
  isDragging: boolean;
  startResize: (
    event: ReactPointerEvent<HTMLElement>,
    edge: DockResizeEdge
  ) => void;
  startDrag: (event: ReactPointerEvent<HTMLElement>) => void;
};

export function useDesktopChatDockPointer({
  isOpen,
  panelSizeRef,
  panelPositionRef,
  applyPanelSizeToDom,
  applyPanelPositionToDom,
  setPanelSize,
  setPanelPosition,
  lockInteractionScroll,
  releaseInteractionScroll,
  onInteractionStart,
}: UseDesktopChatDockPointerOptions): UseDesktopChatDockPointerResult {
  const resizeStateRef = useRef<DockResizeState | null>(null);
  const dragStateRef = useRef<DockDragState | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const pendingResizeSizeRef = useRef<DockPanelSize | null>(null);
  const pendingResizePositionRef = useRef<DockPanelPosition | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (resizeState) {
        event.preventDefault();
        const deltaX = event.clientX - resizeState.startX;
        const deltaY = event.clientY - resizeState.startY;
        let nextWidth = resizeState.startWidth;
        let nextHeight = resizeState.startHeight;
        let nextLeft = resizeState.startLeft;
        let nextTop = resizeState.startTop;

        if (edgeIncludesLeft(resizeState.edge)) {
          nextWidth = resizeState.startWidth - deltaX;
        }
        if (edgeIncludesRight(resizeState.edge)) {
          nextWidth = resizeState.startWidth + deltaX;
        }
        if (edgeIncludesTop(resizeState.edge)) {
          nextHeight = resizeState.startHeight - deltaY;
        }
        if (edgeIncludesBottom(resizeState.edge)) {
          nextHeight = resizeState.startHeight + deltaY;
        }

        const clampedSize = clampDockSize({
          width: nextWidth,
          height: nextHeight,
        });
        panelSizeRef.current = clampedSize;
        pendingResizeSizeRef.current = clampedSize;

        if (edgeIncludesLeft(resizeState.edge)) {
          nextLeft =
            resizeState.startLeft +
            (resizeState.startWidth - clampedSize.width);
        }
        if (edgeIncludesTop(resizeState.edge)) {
          nextTop =
            resizeState.startTop +
            (resizeState.startHeight - clampedSize.height);
        }

        const clampedPosition = clampDockPosition(
          { left: nextLeft, top: nextTop },
          clampedSize
        );
        panelPositionRef.current = clampedPosition;
        pendingResizePositionRef.current = clampedPosition;

        if (resizeRafRef.current !== null) return;
        resizeRafRef.current = window.requestAnimationFrame(() => {
          resizeRafRef.current = null;
          const nextSize = pendingResizeSizeRef.current;
          const nextPosition = pendingResizePositionRef.current;
          if (nextSize) {
            applyPanelSizeToDom(nextSize);
          }
          if (nextPosition) {
            applyPanelPositionToDom(nextPosition);
          }
        });
        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState) return;
      event.preventDefault();

      const nextPosition = clampDockPosition(
        {
          left: dragState.startLeft + (event.clientX - dragState.startX),
          top: dragState.startTop + (event.clientY - dragState.startY),
        },
        panelSizeRef.current
      );
      panelPositionRef.current = nextPosition;
      applyPanelPositionToDom(nextPosition);
    };

    const stopInteraction = () => {
      const wasResizing = Boolean(resizeStateRef.current);
      const wasDragging = Boolean(dragStateRef.current);
      if (!wasResizing && !wasDragging) return;

      resizeStateRef.current = null;
      dragStateRef.current = null;

      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      pendingResizeSizeRef.current = null;
      pendingResizePositionRef.current = null;

      setIsResizing(false);
      setIsDragging(false);
      releaseInteractionScroll();

      const committedSize = panelSizeRef.current;
      const committedPosition = clampDockPosition(
        panelPositionRef.current,
        committedSize
      );

      applyPanelSizeToDom(committedSize);
      applyPanelPositionToDom(committedPosition);
      panelPositionRef.current = committedPosition;

      if (wasResizing) {
        setPanelSize(committedSize);
        saveDockSize(committedSize);
      }

      if (wasResizing || wasDragging) {
        setPanelPosition(committedPosition);
        saveDockPosition(committedPosition);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopInteraction);
    window.addEventListener("pointercancel", stopInteraction);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopInteraction);
      window.removeEventListener("pointercancel", stopInteraction);
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      pendingResizeSizeRef.current = null;
      pendingResizePositionRef.current = null;
      releaseInteractionScroll();
    };
  }, [
    applyPanelPositionToDom,
    applyPanelSizeToDom,
    panelPositionRef,
    panelSizeRef,
    releaseInteractionScroll,
    setPanelPosition,
    setPanelSize,
  ]);

  useEffect(() => {
    if (isOpen) return;
    resizeStateRef.current = null;
    dragStateRef.current = null;
    if (resizeRafRef.current !== null) {
      window.cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    pendingResizeSizeRef.current = null;
    pendingResizePositionRef.current = null;
    setIsResizing(false);
    setIsDragging(false);
    releaseInteractionScroll();
  }, [isOpen, releaseInteractionScroll]);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>, edge: DockResizeEdge) => {
      if (!isOpen) return;
      if (event.button !== 0) return;
      onInteractionStart?.();
      event.preventDefault();
      event.stopPropagation();

      dragStateRef.current = null;
      setIsDragging(false);

      resizeStateRef.current = {
        edge,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: panelSizeRef.current.width,
        startHeight: panelSizeRef.current.height,
        startLeft: panelPositionRef.current.left,
        startTop: panelPositionRef.current.top,
      };
      setIsResizing(true);
      lockInteractionScroll(resizeCursorForEdge(edge));
    },
    [isOpen, lockInteractionScroll, onInteractionStart, panelPositionRef, panelSizeRef]
  );

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isOpen) return;
      if (event.button !== 0) return;
      if (isResizing) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("button, a, input, textarea, select, [role='button']")
      ) {
        return;
      }

      onInteractionStart?.();
      event.preventDefault();
      event.stopPropagation();

      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startLeft: panelPositionRef.current.left,
        startTop: panelPositionRef.current.top,
      };
      setIsDragging(true);
      lockInteractionScroll("grabbing");
    },
    [isOpen, isResizing, lockInteractionScroll, onInteractionStart, panelPositionRef]
  );

  return {
    isResizing,
    isDragging,
    startResize,
    startDrag,
  };
}
