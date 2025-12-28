"use client";

import NextImage from "next/image";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ProfileImageEditorProps = {
  file: File;
  onCancel: () => void;
  onApply: (blob: Blob, previewUrl: string) => void | Promise<void>;
};

export function ProfileImageEditor({
  file,
  onCancel,
  onApply,
}: ProfileImageEditorProps) {
  const [objectUrl, setObjectUrl] = useState<string>("");
  const minZoom = 1;
  const maxZoom = 3.2;
  const [zoom, setZoom] = useState(1.1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const previewRef = useRef<HTMLDivElement | null>(null);

  const previewSize = 320;
  const miniPreviewSize = 128;

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setZoom(1.1);
    setPosition({ x: 0, y: 0 });
    setNaturalSize({ width: 1, height: 1 });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  const clampZoom = useCallback(
    (value: number) => Math.min(maxZoom, Math.max(minZoom, value)),
    [maxZoom, minZoom]
  );

  const baseScale = useMemo(() => {
    const { width, height } = naturalSize;
    return Math.max(previewSize / width, previewSize / height);
  }, [naturalSize]);

  const livePreviewStyle = useMemo(() => {
    const ratio = miniPreviewSize / previewSize;
    const scale = baseScale * zoom * ratio;

    return {
      transform: `translate(${position.x * ratio}px, ${
        position.y * ratio
      }px) scale(${scale})`,
      transformOrigin: "center",
    } satisfies CSSProperties;
  }, [baseScale, miniPreviewSize, position.x, position.y, previewSize, zoom]);

  const clampPosition = useCallback(
    (next: { x: number; y: number }, zoomValue = zoom) => {
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
    setPosition((prev) => clampPosition(prev));
  }, [clampPosition]);

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
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
      } catch {
        // ignore
      }
    }
    setDragging(false);
  };

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? -0.12 : 0.12;

      const rect = previewRef.current?.getBoundingClientRect();
      const origin = rect
        ? {
            x: e.clientX - rect.left - rect.width / 2,
            y: e.clientY - rect.top - rect.height / 2,
          }
        : { x: 0, y: 0 };

      setZoom((prevZoom) => {
        const nextZoom = clampZoom(prevZoom - delta);
        if (nextZoom === prevZoom) return prevZoom;

        setPosition((prevPos) => {
          const scaleChange = nextZoom / prevZoom;
          const offset = {
            x: prevPos.x - origin.x * (scaleChange - 1),
            y: prevPos.y - origin.y * (scaleChange - 1),
          };
          return clampPosition(offset, nextZoom);
        });

        return nextZoom;
      });
    },
    [clampPosition, clampZoom]
  );

  const handleApply = async () => {
    const img = new window.Image();
    img.src = objectUrl;

    await new Promise<void>((resolve) => {
      if (img.complete) return resolve();
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    const canvasSize = 640;
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = baseScale * zoom;
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const ratio = canvasSize / previewSize;

    const dx = (canvasSize - drawWidth) / 2 + position.x * ratio;
    const dy = (canvasSize - drawHeight) / 2 + position.y * ratio;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const preview = canvas.toDataURL("image/jpeg", 0.92);
        onApply(blob, preview);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              프로필 이미지 편집
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              이미지를 눌러 위치를 옮기고, 확대/축소로 원하는 구도를 맞추세요.
              아래 조절 막대로도 미세 조정이 가능해요.
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
            className="relative h-[320px] w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
            onWheel={handleWheel}
          >
            {objectUrl ? (
              <NextImage
                key={objectUrl}
                src={objectUrl}
                alt="편집 preview"
                fill
                sizes="320px"
                unoptimized
                className="select-none"
                draggable={false}
                onLoadingComplete={(imgEl) =>
                  setNaturalSize({
                    width: imgEl.naturalWidth,
                    height: imgEl.naturalHeight,
                  })
                }
                style={{
                  transform: `translate(${position.x}px, ${
                    position.y
                  }px) scale(${baseScale * zoom})`,
                  transformOrigin: "center",
                }}
              />
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
          </div>

          <div className="hidden sm:flex flex-col items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-gray-700">
              최종 preview
            </span>
            <div className="relative h-32 w-32 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-sm">
              {objectUrl ? (
                <NextImage
                  key={`${objectUrl}-preview`}
                  src={objectUrl}
                  alt="최종 적용 preview"
                  fill
                  sizes="128px"
                  unoptimized
                  className="select-none"
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
            min={1}
            max={maxZoom}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(clampZoom(parseFloat(e.target.value)))}
            className="flex-1 accent-sky-500"
          />
          <span className="text-xs text-gray-600">{zoom.toFixed(1)}x</span>
        </div>

        <div className="mt-4 flex w-full items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
