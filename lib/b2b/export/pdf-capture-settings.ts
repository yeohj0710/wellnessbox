import "server-only";

const MAX_CAPTURE_WIDTH_PX = 1400;
const DEFAULT_CAPTURE_WIDTH_FLOOR_PX = 960;
const MIN_CAPTURE_WIDTH_FLOOR_PX = 280;

function resolveCaptureWidthFloorPx() {
  const raw = (process.env.B2B_PDF_CAPTURE_MIN_WIDTH_PX || "").trim();
  if (!/^\d{3,4}$/.test(raw)) return DEFAULT_CAPTURE_WIDTH_FLOOR_PX;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_CAPTURE_WIDTH_FLOOR_PX;
  return Math.min(MAX_CAPTURE_WIDTH_PX, Math.max(MIN_CAPTURE_WIDTH_FLOOR_PX, Math.round(parsed)));
}

export function normalizePdfCaptureWidthPx(rawWidth: string | null | undefined) {
  const normalized = (rawWidth || "").trim();
  if (!/^\d{3,4}$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  const minWidth = resolveCaptureWidthFloorPx();
  return Math.min(MAX_CAPTURE_WIDTH_PX, Math.max(minWidth, Math.round(parsed)));
}

export function normalizePdfCaptureViewportWidthPx(rawWidth: string | null | undefined) {
  const normalized = (rawWidth || "").trim();
  if (!/^\d{3,4}$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(2560, Math.max(280, Math.round(parsed)));
}
