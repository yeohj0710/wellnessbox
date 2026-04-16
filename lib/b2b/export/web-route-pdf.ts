import "server-only";

import {
  normalizeWebRoutePdfViewportWidthPx,
  resolveWebRoutePdfDeviceScaleFactor,
  resolveWebRoutePdfMaxBytes,
  resolveWebRoutePdfPageMarginPx,
  WEB_ROUTE_PDF_DEFAULT_VIEWPORT,
  WEB_ROUTE_PDF_MIN_DEVICE_SCALE_FACTOR,
  WEB_ROUTE_PDF_NAV_TIMEOUT_MS,
  WEB_ROUTE_PDF_RENDER_TIMEOUT_MS,
} from "@/lib/b2b/export/web-route-pdf.config";
import {
  applyWebRoutePdfRenderOverrides,
  resolveWebRouteReportPageSize,
} from "@/lib/b2b/export/web-route-pdf-page";
import { launchPlaywrightChromium } from "@/lib/b2b/export/playwright-runtime";

type ExportPdfFromWebRouteInput = {
  url: string;
  cookieHeader: string | null;
  waitForTestId?: string;
  viewportWidthPx?: number | null;
  documentTitle?: string | null;
};

type ExportPdfFromWebRouteResult =
  | { ok: true; pdfBuffer: Buffer }
  | { ok: false; reason: string };

function toErrorReason(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

async function waitForFontsAndFrames(page: any) {
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function buildPdfFromWebPage(page: any) {
  const pdfBuffer = await page.pdf({
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
    },
    preferCSSPageSize: true,
    scale: 1,
  });
  return Buffer.from(pdfBuffer);
}

type CapturePdfFromWebRouteResult =
  | { ok: true; pdfBuffer: Buffer; deviceScaleFactor: number }
  | { ok: false; reason: string };

async function capturePdfFromWebRoute(input: {
  browser: any;
  url: string;
  cookieHeader: string | null;
  waitForTestId?: string;
  viewportWidthPx?: number | null;
  documentTitle?: string | null;
  deviceScaleFactor: number;
}): Promise<CapturePdfFromWebRouteResult> {
  try {
    const extraHTTPHeaders =
      typeof input.cookieHeader === "string" && input.cookieHeader.trim().length > 0
        ? { cookie: input.cookieHeader }
        : undefined;
    const viewportWidth = normalizeWebRoutePdfViewportWidthPx(input.viewportWidthPx);
    const context = await input.browser.newContext({
      viewport: {
        width: viewportWidth,
        height: WEB_ROUTE_PDF_DEFAULT_VIEWPORT.height,
      },
      deviceScaleFactor: input.deviceScaleFactor,
      colorScheme: "light",
      locale: "ko-KR",
      extraHTTPHeaders,
    });

    try {
      const page = await context.newPage();
      await page.goto(input.url, {
        waitUntil: "domcontentloaded",
        timeout: WEB_ROUTE_PDF_NAV_TIMEOUT_MS,
      });
      await page.waitForLoadState("networkidle", {
        timeout: WEB_ROUTE_PDF_NAV_TIMEOUT_MS,
      });

      const waitForTestId = (input.waitForTestId || "report-capture-surface").trim();
      await page.getByTestId(waitForTestId).first().waitFor({
        state: "visible",
        timeout: WEB_ROUTE_PDF_RENDER_TIMEOUT_MS,
      });
      await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page="1"]', {
        timeout: WEB_ROUTE_PDF_RENDER_TIMEOUT_MS,
      });
      await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page="2"]', {
        timeout: WEB_ROUTE_PDF_RENDER_TIMEOUT_MS,
      });
      await page.emulateMedia({ media: "screen" });
      const reportPageSize = await resolveWebRouteReportPageSize(page);
      const pageMarginPx = resolveWebRoutePdfPageMarginPx();
      await applyWebRoutePdfRenderOverrides(page, reportPageSize, pageMarginPx);
      if (typeof input.documentTitle === "string" && input.documentTitle.trim().length > 0) {
        await page.evaluate((title: string) => {
          document.title = title;
        }, input.documentTitle.trim());
      }
      await waitForFontsAndFrames(page);
      const pdfBuffer = await buildPdfFromWebPage(page);
      return {
        ok: true,
        pdfBuffer,
        deviceScaleFactor: input.deviceScaleFactor,
      };
    } finally {
      await context.close().catch(() => undefined);
    }
  } catch (error) {
    return {
      ok: false,
      reason: toErrorReason(error, "Web route PDF conversion failed"),
    };
  }
}

export async function exportPdfFromWebRoute(
  input: ExportPdfFromWebRouteInput
): Promise<ExportPdfFromWebRouteResult> {
  const launched = await launchPlaywrightChromium();
  if (!launched.ok) {
    return {
      ok: false,
      reason: launched.reason,
    };
  }
  const { browser } = launched;

  try {
    const viewportWidth = normalizeWebRoutePdfViewportWidthPx(input.viewportWidthPx);
    const primaryScaleFactor = resolveWebRoutePdfDeviceScaleFactor(viewportWidth);
    const primary = await capturePdfFromWebRoute({
      browser,
      url: input.url,
      cookieHeader: input.cookieHeader,
      waitForTestId: input.waitForTestId,
      viewportWidthPx: viewportWidth,
      documentTitle: input.documentTitle,
      deviceScaleFactor: primaryScaleFactor,
    });
    if (!primary.ok) {
      return {
        ok: false,
        reason: primary.reason,
      };
    }

    const maxPdfBytes = resolveWebRoutePdfMaxBytes();
    const needsCompactRetry =
      primaryScaleFactor > WEB_ROUTE_PDF_MIN_DEVICE_SCALE_FACTOR &&
      primary.pdfBuffer.byteLength > maxPdfBytes;

    if (!needsCompactRetry) {
      return {
        ok: true,
        pdfBuffer: primary.pdfBuffer,
      };
    }

    const compact = await capturePdfFromWebRoute({
      browser,
      url: input.url,
      cookieHeader: input.cookieHeader,
      waitForTestId: input.waitForTestId,
      viewportWidthPx: viewportWidth,
      documentTitle: input.documentTitle,
      deviceScaleFactor: WEB_ROUTE_PDF_MIN_DEVICE_SCALE_FACTOR,
    });
    if (!compact.ok) {
      return {
        ok: true,
        pdfBuffer: primary.pdfBuffer,
      };
    }

    return {
      ok: true,
      pdfBuffer:
        compact.pdfBuffer.byteLength <= primary.pdfBuffer.byteLength
          ? compact.pdfBuffer
          : primary.pdfBuffer,
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
