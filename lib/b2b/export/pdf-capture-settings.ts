import "server-only";

const MAX_CAPTURE_WIDTH_PX = 1400;
const MIN_CAPTURE_WIDTH_PX = 280;

export function normalizePdfCaptureWidthPx(rawWidth: string | null | undefined) {
  const normalized = (rawWidth || "").trim();
  if (!/^\d{3,4}$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_CAPTURE_WIDTH_PX, Math.max(MIN_CAPTURE_WIDTH_PX, Math.round(parsed)));
}

export function normalizePdfCaptureViewportWidthPx(rawWidth: string | null | undefined) {
  const normalized = (rawWidth || "").trim();
  if (!/^\d{3,4}$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(2560, Math.max(280, Math.round(parsed)));
}
