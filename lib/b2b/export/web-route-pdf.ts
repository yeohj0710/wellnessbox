import "server-only";

const DEFAULT_VIEWPORT = {
  width: 1920,
  height: 2600,
} as const;

const NAV_TIMEOUT_MS = 120_000;
const RENDER_TIMEOUT_MS = 60_000;
const DEFAULT_PDF_DEVICE_SCALE_FACTOR = 2;
const NARROW_VIEWPORT_PDF_DEVICE_SCALE_FACTOR = 1.8;
const NARROW_VIEWPORT_BREAKPOINT_PX = 1024;
const MIN_PDF_DEVICE_SCALE_FACTOR = 1;
const MAX_PDF_DEVICE_SCALE_FACTOR = 3;
const MIN_REPORT_PAGE_SIZE_PX = 240;
const MAX_REPORT_PAGE_SIZE_PX = 8192;
const REPORT_PAGE_SIZE_PADDING_PX = 2;

type ExportPdfFromWebRouteInput = {
  url: string;
  cookieHeader: string | null;
  waitForTestId?: string;
  viewportWidthPx?: number | null;
};

type ExportPdfFromWebRouteResult =
  | { ok: true; pdfBuffer: Buffer }
  | { ok: false; reason: string };

async function loadPlaywrightModule() {
  try {
    const dynamicImport = new Function("moduleName", "return import(moduleName);") as (
      moduleName: string
    ) => Promise<any>;
    return await dynamicImport("playwright");
  } catch {
    return null;
  }
}

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

function normalizeViewportWidthPx(value: number | null | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_VIEWPORT.width;
  const rounded = Math.round(Number(value));
  if (rounded < 280) return 280;
  if (rounded > 2560) return 2560;
  return rounded;
}

function resolvePdfDeviceScaleFactor(viewportWidthPx: number) {
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

function clampReportPageSizePx(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < MIN_REPORT_PAGE_SIZE_PX) return MIN_REPORT_PAGE_SIZE_PX;
  if (rounded > MAX_REPORT_PAGE_SIZE_PX) return MAX_REPORT_PAGE_SIZE_PX;
  return rounded;
}

async function resolveReportPageSizeFromSurfaceAttributes(page: any) {
  const raw = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[data-testid="report-capture-surface"]');
    if (!surface) return null;
    const widthRaw = surface.dataset.reportWidthPx || surface.getAttribute("data-report-width-px");
    const heightRaw =
      surface.dataset.reportHeightPx || surface.getAttribute("data-report-height-px");
    if (!widthRaw || !heightRaw) return null;
    return {
      width: Number(widthRaw),
      height: Number(heightRaw),
    };
  });

  if (!raw) return null;
  if (!Number.isFinite(raw.width) || !Number.isFinite(raw.height)) return null;

  return {
    widthPx: clampReportPageSizePx(raw.width, 1080),
    heightPx: clampReportPageSizePx(raw.height, 1560),
  };
}

async function resolveReportPageSize(page: any) {
  const reportPageLocator = page.locator(
    '[data-testid="report-capture-surface"] [data-report-page]'
  );
  const reportPageCount = await reportPageLocator.count();
  if (reportPageCount < 1) {
    throw new Error("Report page elements are missing");
  }

  let maxWidthPx = 0;
  let maxHeightPx = 0;
  for (let index = 0; index < reportPageCount; index += 1) {
    const box = await reportPageLocator.nth(index).boundingBox();
    if (!box) {
      throw new Error(`Report page bounding box is unavailable (index=${index})`);
    }
    maxWidthPx = Math.max(maxWidthPx, box.width);
    maxHeightPx = Math.max(maxHeightPx, box.height);
  }

  const attrSize = await resolveReportPageSizeFromSurfaceAttributes(page);
  const resolvedWidth = Math.max(attrSize?.widthPx ?? 0, maxWidthPx);
  const resolvedHeight = Math.max(attrSize?.heightPx ?? 0, maxHeightPx);

  return {
    widthPx: clampReportPageSizePx(Math.ceil(resolvedWidth), 1080),
    heightPx: clampReportPageSizePx(Math.ceil(resolvedHeight) + REPORT_PAGE_SIZE_PADDING_PX, 1560),
  };
}

async function applyPdfRenderOverrides(
  page: any,
  reportPageSize: { widthPx: number; heightPx: number }
) {
  await page.evaluate(() => {
    const exportRoot = document.querySelector<HTMLElement>('[data-report-export-root="1"]');
    if (!exportRoot) return;
    const clonedRoot = exportRoot.cloneNode(true);
    document.body.replaceChildren(clonedRoot);
  });

  await page.addStyleTag({
    content: `
      @page {
        size: ${reportPageSize.widthPx}px ${reportPageSize.heightPx}px;
        margin: 0;
      }

      html, body {
        width: ${reportPageSize.widthPx}px !important;
        min-width: ${reportPageSize.widthPx}px !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      body > :not([data-report-export-root="1"]) {
        display: none !important;
      }

      [data-report-export-root="1"] {
        width: ${reportPageSize.widthPx}px !important;
        min-width: ${reportPageSize.widthPx}px !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      [data-testid="report-capture-surface"] {
        width: ${reportPageSize.widthPx}px !important;
        max-width: ${reportPageSize.widthPx}px !important;
        margin: 0 !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page] {
        width: ${reportPageSize.widthPx}px !important;
        max-width: ${reportPageSize.widthPx}px !important;
        break-before: auto !important;
        page-break-before: auto !important;
        break-after: auto !important;
        page-break-after: auto !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page] + [data-report-page] {
        break-before: page !important;
        page-break-before: always !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page]:last-child {
        break-after: auto !important;
        page-break-after: auto !important;
      }
    `,
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

export async function exportPdfFromWebRoute(
  input: ExportPdfFromWebRouteInput
): Promise<ExportPdfFromWebRouteResult> {
  const playwright = await loadPlaywrightModule();
  if (!playwright?.chromium) {
    return {
      ok: false,
      reason: "Playwright is not available",
    };
  }

  const browser = await playwright.chromium.launch({ headless: true });

  try {
    const extraHTTPHeaders =
      typeof input.cookieHeader === "string" && input.cookieHeader.trim().length > 0
        ? { cookie: input.cookieHeader }
        : undefined;
    const viewportWidth = normalizeViewportWidthPx(input.viewportWidthPx);
    const pdfDeviceScaleFactor = resolvePdfDeviceScaleFactor(viewportWidth);
    const context = await browser.newContext({
      viewport: {
        width: viewportWidth,
        height: DEFAULT_VIEWPORT.height,
      },
      deviceScaleFactor: pdfDeviceScaleFactor,
      colorScheme: "light",
      locale: "ko-KR",
      extraHTTPHeaders,
    });

    try {
      const page = await context.newPage();
      await page.goto(input.url, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
      await page.waitForLoadState("networkidle", {
        timeout: NAV_TIMEOUT_MS,
      });

      const waitForTestId = (input.waitForTestId || "report-capture-surface").trim();
      await page.getByTestId(waitForTestId).first().waitFor({
        state: "visible",
        timeout: RENDER_TIMEOUT_MS,
      });
      await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page="1"]', {
        timeout: RENDER_TIMEOUT_MS,
      });
      await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page="2"]', {
        timeout: RENDER_TIMEOUT_MS,
      });
      await page.emulateMedia({ media: "screen" });
      const reportPageSize = await resolveReportPageSize(page);
      await applyPdfRenderOverrides(page, reportPageSize);
      await waitForFontsAndFrames(page);
      const pdfBuffer = await buildPdfFromWebPage(page);

      return {
        ok: true,
        pdfBuffer,
      };
    } finally {
      await context.close().catch(() => undefined);
    }
  } catch (error) {
    return {
      ok: false,
      reason: toErrorReason(error, "Web route PDF conversion failed"),
    };
  } finally {
    await browser.close();
  }
}
