"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

type DragOffset = {
  x: number;
  y: number;
};

type DragState = {
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
};

type UseDraggableModalOptions = {
  margin?: number;
  resetOnOpen?: boolean;
};

type DragDocumentStyleSnapshot = {
  bodyOverflow: string;
  bodyTouchAction: string;
  bodyOverscrollBehavior: string;
  bodyUserSelect: string;
  bodyCursor: string;
  rootOverflow: string;
  rootTouchAction: string;
  rootOverscrollBehavior: string;
};

function clampDragOffset(
  raw: DragOffset,
  panelWidth: number,
  panelHeight: number,
  margin: number
) {
  if (typeof window === "undefined") return { x: 0, y: 0 };

  const availableX = Math.max(0, window.innerWidth - margin * 2 - panelWidth);
  const availableY = Math.max(0, window.innerHeight - margin * 2 - panelHeight);
  const boundX = availableX / 2;
  const boundY = availableY / 2;

  return {
    x: Math.min(boundX, Math.max(-boundX, raw.x)),
    y: Math.min(boundY, Math.max(-boundY, raw.y)),
  };
}

export function useDraggableModal(
  open: boolean,
  options: UseDraggableModalOptions = {}
) {
  const margin = options.margin ?? 12;
  const resetOnOpen = options.resetOnOpen ?? true;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const offsetRef = useRef<DragOffset>({ x: 0, y: 0 });
  const dragDocumentStyleSnapshotRef =
    useRef<DragDocumentStyleSnapshot | null>(null);
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const applyDraggingBodyState = useCallback((cursor: string) => {
    if (typeof document === "undefined") return;
    const bodyStyle = document.body.style;
    const rootStyle = document.documentElement.style;
    if (!dragDocumentStyleSnapshotRef.current) {
      dragDocumentStyleSnapshotRef.current = {
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

  const clearDraggingBodyState = useCallback(() => {
    if (typeof document === "undefined") return;
    const snapshot = dragDocumentStyleSnapshotRef.current;
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
    dragDocumentStyleSnapshotRef.current = null;
  }, []);

  const stopDragging = useCallback(() => {
    if (!dragStateRef.current && !isDragging) return;
    dragStateRef.current = null;
    setIsDragging(false);
    clearDraggingBodyState();
  }, [clearDraggingBodyState, isDragging]);

  useEffect(() => {
    if (!open) {
      stopDragging();
    }
  }, [open, stopDragging]);

  useEffect(() => {
    if (!open || !resetOnOpen) return;
    offsetRef.current = { x: 0, y: 0 };
    setOffset({ x: 0, y: 0 });
  }, [open, resetOnOpen]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      event.preventDefault();

      const panel = panelRef.current;
      const panelRect = panel?.getBoundingClientRect();
      const panelWidth = panelRect?.width ?? 0;
      const panelHeight = panelRect?.height ?? 0;
      if (panelWidth <= 0 || panelHeight <= 0) return;

      const rawOffset = {
        x: dragState.startOffsetX + (event.clientX - dragState.startX),
        y: dragState.startOffsetY + (event.clientY - dragState.startY),
      };
      const nextOffset = clampDragOffset(rawOffset, panelWidth, panelHeight, margin);
      offsetRef.current = nextOffset;
      setOffset(nextOffset);
    };

    const onPointerUp = () => {
      stopDragging();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      clearDraggingBodyState();
      dragStateRef.current = null;
    };
  }, [clearDraggingBodyState, margin, stopDragging]);

  const handleDragPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!open) return;
      if (event.button !== 0) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "button, a, input, textarea, select, [role='button'], [data-modal-no-drag='true']"
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: offsetRef.current.x,
        startOffsetY: offsetRef.current.y,
      };
      setIsDragging(true);
      applyDraggingBodyState("grabbing");
    },
    [applyDraggingBodyState, open]
  );

  const panelStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    }),
    [offset.x, offset.y]
  );

  return {
    panelRef,
    panelStyle,
    handleDragPointerDown,
    isDragging,
  };
}
