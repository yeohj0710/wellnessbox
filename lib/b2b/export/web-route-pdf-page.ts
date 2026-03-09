import "server-only";

const MIN_REPORT_PAGE_SIZE_PX = 240;
const MAX_REPORT_PAGE_SIZE_PX = 8192;
const REPORT_PAGE_SIZE_PADDING_PX = 2;

export type WebRouteReportPageSize = {
  widthPx: number;
  heightPx: number;
};

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

export async function resolveWebRouteReportPageSize(
  page: any
): Promise<WebRouteReportPageSize> {
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
    heightPx: clampReportPageSizePx(
      Math.ceil(resolvedHeight) + REPORT_PAGE_SIZE_PADDING_PX,
      1560
    ),
  };
}

export async function applyWebRoutePdfRenderOverrides(
  page: any,
  reportPageSize: WebRouteReportPageSize,
  pageMarginPx: number
) {
  const pageWidthPx = clampReportPageSizePx(
    reportPageSize.widthPx + pageMarginPx * 2,
    reportPageSize.widthPx
  );
  const pageHeightPx = clampReportPageSizePx(
    reportPageSize.heightPx + pageMarginPx * 2,
    reportPageSize.heightPx
  );

  await page.evaluate(() => {
    const exportRoot = document.querySelector<HTMLElement>('[data-report-export-root="1"]');
    if (!exportRoot) return;
    const clonedRoot = exportRoot.cloneNode(true) as HTMLElement;
    document.body.replaceChildren(clonedRoot);

    const surface = clonedRoot.querySelector<HTMLElement>('[data-testid="report-capture-surface"]');
    if (!surface) return;

    const reportPages = Array.from(surface.querySelectorAll<HTMLElement>("[data-report-page]"));
    for (const reportPage of reportPages) {
      if (reportPage.parentElement?.getAttribute("data-report-page-frame") === "1") continue;
      const parent = reportPage.parentElement;
      if (!parent) continue;
      const frame = document.createElement("div");
      frame.setAttribute("data-report-page-frame", "1");
      parent.insertBefore(frame, reportPage);
      frame.appendChild(reportPage);
    }
  });

  await page.addStyleTag({
    content: `
      @page {
        size: ${pageWidthPx}px ${pageHeightPx}px;
        margin: 0;
      }

      html, body {
        width: ${pageWidthPx}px !important;
        min-width: ${pageWidthPx}px !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      body > :not([data-report-export-root="1"]) {
        display: none !important;
      }

      [data-report-export-root="1"] {
        width: ${pageWidthPx}px !important;
        min-width: ${pageWidthPx}px !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      [data-testid="report-capture-surface"] {
        width: ${pageWidthPx}px !important;
        max-width: ${pageWidthPx}px !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page-frame="1"] {
        width: ${pageWidthPx}px !important;
        min-height: ${pageHeightPx}px !important;
        height: ${pageHeightPx}px !important;
        max-height: ${pageHeightPx}px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: ${pageMarginPx}px 0 !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
        overflow: hidden !important;
        break-before: auto !important;
        page-break-before: auto !important;
        break-after: auto !important;
        page-break-after: auto !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page-frame="1"] [data-report-page] {
        width: ${reportPageSize.widthPx}px !important;
        max-width: ${reportPageSize.widthPx}px !important;
        min-height: ${reportPageSize.heightPx}px !important;
        height: ${reportPageSize.heightPx}px !important;
        max-height: ${reportPageSize.heightPx}px !important;
        margin: 0 !important;
        overflow: hidden !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page-frame="1"] + [data-report-page-frame="1"] {
        break-before: page !important;
        page-break-before: always !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page-frame="1"]:last-child {
        break-after: auto !important;
        page-break-after: auto !important;
      }
    `,
  });
}
