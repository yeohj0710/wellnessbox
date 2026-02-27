"use client";

import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildEditorImageStyle,
  buildLivePreviewStyle,
  clampImagePosition,
  clampZoomValue,
  computeBaseScale,
  loadImageFromObjectUrl,
  renderCroppedProfileImage,
  type Point,
  type Size,
} from "./profileImageEditor.helpers";

type UseProfileImageEditorControllerInput = {
  file: File;
  previewSize: number;
  miniPreviewSize: number;
  canvasSize: number;
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
  onApply: (blob: Blob, previewUrl: string) => void | Promise<void>;
};

export function useProfileImageEditorController({
  file,
  previewSize,
  miniPreviewSize,
  canvasSize,
  minZoom,
  maxZoom,
  defaultZoom,
  onApply,
}: UseProfileImageEditorControllerInput) {
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [isImageReady, setIsImageReady] = useState(false);
  const [zoom, setZoom] = useState(defaultZoom);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 1, height: 1 });
  const [isApplying, setIsApplying] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setZoom(defaultZoom);
    setPosition({ x: 0, y: 0 });
  }, [defaultZoom]);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setIsImageReady(false);
    resetView();
    setNaturalSize({ width: 1, height: 1 });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file, resetView]);

  const clampZoom = useCallback(
    (value: number) => clampZoomValue(value, minZoom, maxZoom),
    [maxZoom, minZoom]
  );

  const baseScale = useMemo(
    () => computeBaseScale(naturalSize, previewSize),
    [naturalSize, previewSize]
  );

  const clampPosition = useCallback(
    (next: Point, zoomValue = zoom) =>
      clampImagePosition({
        next,
        zoomValue,
        naturalSize,
        baseScale,
        previewSize,
      }),
    [baseScale, naturalSize, previewSize, zoom]
  );

  useEffect(() => {
    setPosition((prev) => clampPosition(prev, zoom));
  }, [clampPosition, zoom]);

  const applyZoomAt = useCallback(
    (nextZoomRaw: number, origin: Point) => {
      setZoom((prevZoom) => {
        const nextZoom = clampZoom(nextZoomRaw);
        if (nextZoom === prevZoom) return prevZoom;

        setPosition((prevPosition) => {
          const scaleChange = nextZoom / prevZoom;
          const nextPosition = {
            x: origin.x - (origin.x - prevPosition.x) * scaleChange,
            y: origin.y - (origin.y - prevPosition.y) * scaleChange,
          };
          return clampPosition(nextPosition, nextZoom);
        });

        return nextZoom;
      });
    },
    [clampPosition, clampZoom]
  );

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = element.getBoundingClientRect();
      const origin = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      };

      const step = 0.12;
      const delta = event.deltaY > 0 ? step : -step;
      applyZoomAt(zoom - delta, origin);
    };

    const onGesture = (event: Event) => {
      event.preventDefault();
    };

    const passiveFalse = { passive: false } as AddEventListenerOptions;
    element.addEventListener("wheel", onWheel, passiveFalse);
    element.addEventListener("gesturestart", onGesture as EventListener, passiveFalse);
    element.addEventListener("gesturechange", onGesture as EventListener, passiveFalse);
    element.addEventListener("gestureend", onGesture as EventListener, passiveFalse);

    return () => {
      element.removeEventListener("wheel", onWheel as EventListener);
      element.removeEventListener("gesturestart", onGesture as EventListener);
      element.removeEventListener("gesturechange", onGesture as EventListener);
      element.removeEventListener("gestureend", onGesture as EventListener);
    };
  }, [applyZoomAt, zoom]);

  const handleDragStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isImageReady || isApplying) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      setStartPoint({
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      });
    },
    [isApplying, isImageReady, position]
  );

  const handleDragMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const nextX = event.clientX - startPoint.x;
      const nextY = event.clientY - startPoint.y;
      setPosition(clampPosition({ x: nextX, y: nextY }));
    },
    [clampPosition, dragging, startPoint.x, startPoint.y]
  );

  const handleDragEnd = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
    }
    setDragging(false);
  }, []);

  const editorImageStyle = useMemo(
    () =>
      buildEditorImageStyle({
        naturalSize,
        position,
        baseScale,
        zoom,
      }),
    [baseScale, naturalSize, position, zoom]
  );

  const livePreviewStyle = useMemo(
    () =>
      buildLivePreviewStyle({
        naturalSize,
        position,
        baseScale,
        zoom,
        miniPreviewSize,
        previewSize,
      }),
    [baseScale, miniPreviewSize, naturalSize, position, previewSize, zoom]
  );

  const handleApply = useCallback(async () => {
    if (!objectUrl || !isImageReady || isApplying) return;

    setIsApplying(true);
    try {
      const image = await loadImageFromObjectUrl(objectUrl);
      const rendered = await renderCroppedProfileImage({
        image,
        canvasSize,
        previewSize,
        position,
        baseScale,
        zoom,
      });
      if (!rendered) return;

      await onApply(rendered.blob, rendered.previewDataUrl);
    } finally {
      setIsApplying(false);
    }
  }, [
    objectUrl,
    isImageReady,
    isApplying,
    canvasSize,
    previewSize,
    position,
    baseScale,
    zoom,
    onApply,
  ]);

  const handleImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const element = event.currentTarget;
      setNaturalSize({
        width: element.naturalWidth || 1,
        height: element.naturalHeight || 1,
      });
      setIsImageReady(true);
      setZoom((prevZoom) => {
        const nextZoom = clampZoom(prevZoom);
        setPosition((prevPosition) => clampPosition(prevPosition, nextZoom));
        return nextZoom;
      });
    },
    [clampPosition, clampZoom]
  );

  const handleZoomChange = useCallback(
    (nextZoomValue: number) => {
      applyZoomAt(nextZoomValue, { x: 0, y: 0 });
    },
    [applyZoomAt]
  );

  return {
    objectUrl,
    isImageReady,
    zoom,
    dragging,
    isApplying,
    previewRef,
    editorImageStyle,
    livePreviewStyle,
    resetView,
    handleApply,
    handleImageLoad,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleZoomChange,
    canApply: isImageReady && !isApplying,
  };
}
