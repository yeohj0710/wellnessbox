"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ProfileImageEditorProps = {
  file: File;
  onCancel: () => void;
  onApply: (blob: Blob, previewUrl: string) => void | Promise<void>;
};

type Point = { x: number; y: number };
type Size = { width: number; height: number };

export function ProfileImageEditor({
  file,
  onCancel,
  onApply,
}: ProfileImageEditorProps) {
  const previewSize = 320;
  const miniPreviewSize = 128;
  const canvasSize = 640;

  const minZoom = 1;
  const maxZoom = 3.2;

  const defaultZoom = 1.1;

  const [objectUrl, setObjectUrl] = useState<string>("");
  const [isImageReady, setIsImageReady] = useState(false);

  const [zoom, setZoom] = useState(defaultZoom);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });

  const [dragging, setDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });

  const [naturalSize, setNaturalSize] = useState<Size>({ width: 1, height: 1 });
  const [isApplying, setIsApplying] = useState(false);

  const previewRef = useRef<HTMLDivElement | null>(null);

  const resetView = useCallback(() => {
    setZoom(defaultZoom);
    setPosition({ x: 0, y: 0 });
  }, []);

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

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const clampZoom = useCallback(
    (value: number) => Math.min(maxZoom, Math.max(minZoom, value)),
    [maxZoom, minZoom]
  );

  const baseScale = useMemo(() => {
    const { width, height } = naturalSize;
    if (!width || !height) return 1;
    return Math.max(previewSize / width, previewSize / height);
  }, [naturalSize, previewSize]);

  const clampPosition = useCallback(
    (next: Point, zoomValue = zoom) => {
      const scaledWidth = naturalSize.width * baseScale * zoomValue;
      const scaledHeight = naturalSize.height * baseScale * zoomValue;

      const maxX = Math.max(0, (scaledWidth - previewSize) / 2);
      const maxY = Math.max(0, (scaledHeight - previewSize) / 2);

      return {
        x: Math.min(Math.max(next.x, -maxX), maxX),
        y: Math.min(Math.max(next.y, -maxY), maxY),
      };
    },
    [baseScale, naturalSize.height, naturalSize.width, previewSize, zoom]
  );

  useEffect(() => {
    setPosition((prev) => clampPosition(prev, zoom));
  }, [clampPosition, zoom]);

  const applyZoomAt = useCallback(
    (nextZoomRaw: number, origin: Point) => {
      setZoom((prevZoom) => {
        const nextZoom = clampZoom(nextZoomRaw);
        if (nextZoom === prevZoom) return prevZoom;

        setPosition((prevPos) => {
          const scaleChange = nextZoom / prevZoom;
          const nextPos = {
            x: origin.x - (origin.x - prevPos.x) * scaleChange,
            y: origin.y - (origin.y - prevPos.y) * scaleChange,
          };
          return clampPosition(nextPos, nextZoom);
        });

        return nextZoom;
      });
    },
    [clampPosition, clampZoom]
  );

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const origin = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      };

      const step = 0.12;
      const delta = e.deltaY > 0 ? step : -step;
      applyZoomAt(zoom - delta, origin);
    };

    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener(
      "gesturestart",
      onGesture as EventListener,
      { passive: false } as AddEventListenerOptions
    );
    el.addEventListener(
      "gesturechange",
      onGesture as EventListener,
      { passive: false } as AddEventListenerOptions
    );
    el.addEventListener(
      "gestureend",
      onGesture as EventListener,
      { passive: false } as AddEventListenerOptions
    );

    return () => {
      el.removeEventListener("wheel", onWheel as EventListener);
      el.removeEventListener("gesturestart", onGesture as EventListener);
      el.removeEventListener("gesturechange", onGesture as EventListener);
      el.removeEventListener("gestureend", onGesture as EventListener);
    };
  }, [applyZoomAt, zoom]);

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isImageReady || isApplying) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setStartPoint({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const nextX = e.clientX - startPoint.x;
    const nextY = e.clientY - startPoint.y;
    setPosition(clampPosition({ x: nextX, y: nextY }));
  };

  const handleDragEnd = (e?: ReactPointerEvent<HTMLDivElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    setDragging(false);
  };

  const editorImageStyle = useMemo(() => {
    const s = baseScale * zoom;
    return {
      width: naturalSize.width,
      height: naturalSize.height,
      transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${s})`,
      transformOrigin: "center",
    } satisfies CSSProperties;
  }, [
    baseScale,
    zoom,
    naturalSize.width,
    naturalSize.height,
    position.x,
    position.y,
  ]);

  const livePreviewStyle = useMemo(() => {
    const ratio = miniPreviewSize / previewSize;
    const s = baseScale * zoom * ratio;
    return {
      width: naturalSize.width,
      height: naturalSize.height,
      transform: `translate(-50%, -50%) translate(${position.x * ratio}px, ${
        position.y * ratio
      }px) scale(${s})`,
      transformOrigin: "center",
    } satisfies CSSProperties;
  }, [
    baseScale,
    zoom,
    miniPreviewSize,
    previewSize,
    naturalSize.width,
    naturalSize.height,
    position.x,
    position.y,
  ]);

  const handleApply = useCallback(async () => {
    if (!objectUrl || !isImageReady || isApplying) return;

    setIsApplying(true);
    try {
      const img: HTMLImageElement = new window.Image();
      img.src = objectUrl;

      try {
        await img.decode();
      } catch {
        await new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }

      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = baseScale * zoom;

      const scaledW = img.naturalWidth * scale;
      const scaledH = img.naturalHeight * scale;

      const x0 = previewSize / 2 + position.x - scaledW / 2;
      const y0 = previewSize / 2 + position.y - scaledH / 2;

      let sx = (0 - x0) / scale;
      let sy = (0 - y0) / scale;
      let sw = previewSize / scale;
      let sh = previewSize / scale;

      if (sx < 0) {
        sw += sx;
        sx = 0;
      }
      if (sy < 0) {
        sh += sy;
        sy = 0;
      }
      if (sx + sw > img.naturalWidth) {
        sw = img.naturalWidth - sx;
      }
      if (sy + sh > img.naturalHeight) {
        sh = img.naturalHeight - sy;
      }

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (sw > 0 && sh > 0) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasSize, canvasSize);
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });

      if (!blob) return;

      const preview = canvas.toDataURL("image/jpeg", 0.92);
      await onApply(blob, preview);
    } finally {
      setIsApplying(false);
    }
  }, [
    objectUrl,
    isImageReady,
    isApplying,
    canvasSize,
    baseScale,
    zoom,
    previewSize,
    position.x,
    position.y,
    onApply,
  ]);

  const canApply = isImageReady && !isApplying;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              프로필 이미지 편집
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              드래그로 위치를 옮기고, wheel 또는 아래 조절 막대로 확대/축소해
              구도를 맞추세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div
            ref={previewRef}
            className="relative h-[320px] w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 select-none"
            style={{ touchAction: "none" }}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
          >
            {objectUrl ? (
              <>
                <img
                  src={objectUrl}
                  alt="편집 preview"
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    setNaturalSize({
                      width: el.naturalWidth || 1,
                      height: el.naturalHeight || 1,
                    });
                    setIsImageReady(true);
                    setZoom((z) => clampZoom(z));
                    setPosition((p) => clampPosition(p, zoom));
                  }}
                  style={editorImageStyle}
                />
                {!isImageReady ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                    이미지 준비 중...
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                이미지 준비 중...
              </div>
            )}

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 rounded-2xl ring-2 ring-white/80" />
              <div
                className="absolute left-0 right-0 border-t border-white/40"
                style={{ top: "33.333%" }}
              />
              <div
                className="absolute left-0 right-0 border-t border-white/40"
                style={{ top: "66.666%" }}
              />
              <div
                className="absolute top-0 bottom-0 border-l border-white/40"
                style={{ left: "33.333%" }}
              />
              <div
                className="absolute top-0 bottom-0 border-l border-white/40"
                style={{ left: "66.666%" }}
              />
            </div>

            {dragging ? (
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-sky-300/60" />
            ) : null}
          </div>

          <div className="hidden sm:flex flex-col items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-gray-700">
              최종 preview
            </span>
            <div className="relative h-32 w-32 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-sm">
              {objectUrl && isImageReady ? (
                <img
                  src={objectUrl}
                  alt="최종 적용 preview"
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={livePreviewStyle}
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 ring-2 ring-white/80" />
            </div>
            <p className="text-center text-[11px] leading-relaxed text-gray-500">
              저장 후 표시될 모습을 실시간으로 확인할 수 있어요.
            </p>
          </div>
        </div>

        <div className="mt-4 flex w-full items-center gap-3">
          <span className="text-xs text-gray-600">확대</span>
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.01}
            value={zoom}
            onChange={(e) =>
              applyZoomAt(parseFloat(e.target.value), { x: 0, y: 0 })
            }
            className="flex-1 accent-sky-500"
            disabled={!isImageReady || isApplying}
          />
          <span className="text-xs text-gray-600">{zoom.toFixed(1)}x</span>
        </div>

        <div className="mt-4 flex w-full items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetView}
            disabled={!isImageReady || isApplying}
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-60"
          >
            {isApplying ? "저장 중..." : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
