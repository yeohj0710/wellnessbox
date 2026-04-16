import "server-only";

import { normalizePdfCaptureViewportWidthPx } from "@/lib/b2b/export/pdf-capture-settings";

const DEFAULT_VIEWPORT_WIDTH_PX = 1920;
const DEFAULT_PDF_DEVICE_SCALE_FACTOR = 1.35;
const NARROW_VIEWPORT_PDF_DEVICE_SCALE_FACTOR = 1.2;
const NARROW_VIEWPORT_BREAKPOINT_PX = 1024;
const MIN_PDF_DEVICE_SCALE_FACTOR = 1;
const MAX_PDF_DEVICE_SCALE_FACTOR = 2;
const DEFAULT_PDF_MAX_BYTES = 15 * 1024 * 1024;
const MIN_PDF_MAX_BYTES = 2 * 1024 * 1024;
const MAX_PDF_MAX_BYTES = 80 * 1024 * 1024;
const DEFAULT_PDF_PAGE_MARGIN_PX = 20;
const MIN_PDF_PAGE_MARGIN_PX = 0;
const MAX_PDF_PAGE_MARGIN_PX = 160;

export const WEB_ROUTE_PDF_DEFAULT_VIEWPORT = {
  width: DEFAULT_VIEWPORT_WIDTH_PX,
  height: 2600,
} as const;

export const WEB_ROUTE_PDF_NAV_TIMEOUT_MS = 120_000;
export const WEB_ROUTE_PDF_RENDER_TIMEOUT_MS = 60_000;
export const WEB_ROUTE_PDF_MIN_DEVICE_SCALE_FACTOR = MIN_PDF_DEVICE_SCALE_FACTOR;

export function normalizeWebRoutePdfViewportWidthPx(
  value: number | null | undefined
) {
  if (!Number.isFinite(value)) return WEB_ROUTE_PDF_DEFAULT_VIEWPORT.width;
  return (
    normalizePdfCaptureViewportWidthPx(String(Math.round(Number(value)))) ??
    WEB_ROUTE_PDF_DEFAULT_VIEWPORT.width
  );
}

export function resolveWebRoutePdfDeviceScaleFactor(viewportWidthPx: number) {
  const raw = process.env.B2B_PDF_CAPTURE_DSF;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return viewportWidthPx <= NARROW_VIEWPORT_BREAKPOINT_PX
      ? NARROW_VIEWPORT_PDF_DEVICE_SCALE_FACTOR
      : DEFAULT_PDF_DEVICE_SCALE_FACTOR;
  }
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed)) {
    return viewportWidthPx <= NARROW_VIEWPORT_BREAKPOINT_PX
      ? NARROW_VIEWPORT_PDF_DEVICE_SCALE_FACTOR
      : DEFAULT_PDF_DEVICE_SCALE_FACTOR;
  }
  if (parsed < MIN_PDF_DEVICE_SCALE_FACTOR) return MIN_PDF_DEVICE_SCALE_FACTOR;
  if (parsed > MAX_PDF_DEVICE_SCALE_FACTOR) return MAX_PDF_DEVICE_SCALE_FACTOR;
  return Math.round(parsed * 100) / 100;
}

export function resolveWebRoutePdfMaxBytes() {
  const raw = (process.env.B2B_PDF_MAX_BYTES || "").trim();
  if (!/^\d+$/.test(raw)) return DEFAULT_PDF_MAX_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_PDF_MAX_BYTES;
  return Math.min(MAX_PDF_MAX_BYTES, Math.max(MIN_PDF_MAX_BYTES, Math.round(parsed)));
}

export function resolveWebRoutePdfPageMarginPx() {
  const raw = (process.env.B2B_PDF_PAGE_MARGIN_PX || "").trim();
  if (!/^\d{1,3}$/.test(raw)) return DEFAULT_PDF_PAGE_MARGIN_PX;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_PDF_PAGE_MARGIN_PX;
  return Math.min(MAX_PDF_PAGE_MARGIN_PX, Math.max(MIN_PDF_PAGE_MARGIN_PX, Math.round(parsed)));
}
