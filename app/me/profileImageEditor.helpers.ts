import type { CSSProperties } from "react";

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

type CropRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export function clampZoomValue(value: number, minZoom: number, maxZoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, value));
}

export function computeBaseScale(naturalSize: Size, previewSize: number) {
  const { width, height } = naturalSize;
  if (!width || !height) return 1;
  return Math.max(previewSize / width, previewSize / height);
}

export function clampImagePosition(params: {
  next: Point;
  zoomValue: number;
  naturalSize: Size;
  baseScale: number;
  previewSize: number;
}) {
  const { next, zoomValue, naturalSize, baseScale, previewSize } = params;
  const scaledWidth = naturalSize.width * baseScale * zoomValue;
  const scaledHeight = naturalSize.height * baseScale * zoomValue;

  const maxX = Math.max(0, (scaledWidth - previewSize) / 2);
  const maxY = Math.max(0, (scaledHeight - previewSize) / 2);

  return {
    x: Math.min(Math.max(next.x, -maxX), maxX),
    y: Math.min(Math.max(next.y, -maxY), maxY),
  };
}

export function buildEditorImageStyle(params: {
  naturalSize: Size;
  position: Point;
  baseScale: number;
  zoom: number;
}) {
  const { naturalSize, position, baseScale, zoom } = params;
  const scale = baseScale * zoom;
  return {
    width: naturalSize.width,
    height: naturalSize.height,
    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: "center",
  } satisfies CSSProperties;
}

export function buildLivePreviewStyle(params: {
  naturalSize: Size;
  position: Point;
  baseScale: number;
  zoom: number;
  miniPreviewSize: number;
  previewSize: number;
}) {
  const { naturalSize, position, baseScale, zoom, miniPreviewSize, previewSize } =
    params;
  const ratio = miniPreviewSize / previewSize;
  const scale = baseScale * zoom * ratio;

  return {
    width: naturalSize.width,
    height: naturalSize.height,
    transform: `translate(-50%, -50%) translate(${position.x * ratio}px, ${
      position.y * ratio
    }px) scale(${scale})`,
    transformOrigin: "center",
  } satisfies CSSProperties;
}

export async function loadImageFromObjectUrl(objectUrl: string) {
  const image = new window.Image();
  image.src = objectUrl;

  try {
    await image.decode();
  } catch {
    await new Promise<void>((resolve) => {
      if (image.complete) return resolve();
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
  }

  return image;
}

function computeCropRect(params: {
  image: HTMLImageElement;
  scale: number;
  previewSize: number;
  position: Point;
}): CropRect {
  const { image, scale, previewSize, position } = params;
  const scaledW = image.naturalWidth * scale;
  const scaledH = image.naturalHeight * scale;

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
  if (sx + sw > image.naturalWidth) {
    sw = image.naturalWidth - sx;
  }
  if (sy + sh > image.naturalHeight) {
    sh = image.naturalHeight - sy;
  }

  return { sx, sy, sw, sh };
}

export async function renderCroppedProfileImage(params: {
  image: HTMLImageElement;
  canvasSize: number;
  previewSize: number;
  position: Point;
  baseScale: number;
  zoom: number;
}) {
  const { image, canvasSize, previewSize, position, baseScale, zoom } = params;
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scale = baseScale * zoom;
  const cropRect = computeCropRect({
    image,
    scale,
    previewSize,
    position,
  });

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (cropRect.sw > 0 && cropRect.sh > 0) {
    ctx.drawImage(
      image,
      cropRect.sx,
      cropRect.sy,
      cropRect.sw,
      cropRect.sh,
      0,
      0,
      canvasSize,
      canvasSize
    );
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.92);
  });

  if (!blob) return null;

  return {
    blob,
    previewDataUrl: canvas.toDataURL("image/jpeg", 0.92),
  };
}

