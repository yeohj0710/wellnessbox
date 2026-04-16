import "server-only";

const MIN_REPORT_PAGE_SIZE_PX = 240;
const MAX_REPORT_PAGE_SIZE_PX = 8192;
const REPORT_PAGE_SIZE_PADDING_PX = 2;
const A4_PAGE_WIDTH_PX = 794;
const A4_PAGE_HEIGHT_PX = 1123;
const MAX_PDF_SAFE_MARGIN_PX = 40;

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
  const safeHorizontalMarginPx = Math.max(
    0,
    Math.min(MAX_PDF_SAFE_MARGIN_PX, Math.round(pageMarginPx))
  );
  const safeVerticalMarginPx = Math.max(
    0,
    Math.min(
      MAX_PDF_SAFE_MARGIN_PX,
      Math.max(safeHorizontalMarginPx + 10, Math.round(pageMarginPx + 12))
    )
  );
  const contentWidthPx = A4_PAGE_WIDTH_PX - safeHorizontalMarginPx * 2;
  const contentHeightPx = A4_PAGE_HEIGHT_PX - safeVerticalMarginPx * 2;
  const baseScaleValue = Math.min(
    contentWidthPx / reportPageSize.widthPx,
    contentHeightPx / reportPageSize.heightPx
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

  await page.evaluate(
    ({
      pageWidthPx,
      pageHeightPx,
      pageMarginInlinePx: safeMarginInline,
      pageMarginBlockPx: safeMarginBlock,
      baseScaleValue: baseScale,
    }: {
      pageWidthPx: number;
      pageHeightPx: number;
      pageMarginInlinePx: number;
      pageMarginBlockPx: number;
      baseScaleValue: number;
    }) => {
      const frames = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page-frame="1"]'
        )
      );

      for (const frame of frames) {
        const reportPage = frame.querySelector<HTMLElement>("[data-report-page]");
        if (!reportPage) continue;

        reportPage.style.setProperty("--report-page-print-scale", String(baseScale));
        const horizontalOverflow =
          reportPage.scrollWidth > 0 ? frame.clientWidth / reportPage.scrollWidth : 1;
        const verticalOverflow =
          reportPage.scrollHeight > 0 ? frame.clientHeight / reportPage.scrollHeight : 1;
        const overflowScale = Math.min(1, horizontalOverflow, verticalOverflow);
        const finalScale = Math.max(0.58, Math.min(1.18, baseScale * overflowScale));

        reportPage.style.setProperty("--report-page-print-scale", String(finalScale));
      }

      document.documentElement.style.width = `${pageWidthPx}px`;
      document.documentElement.style.minWidth = `${pageWidthPx}px`;
      document.documentElement.style.minHeight = `${pageHeightPx}px`;
      document.body.style.width = `${pageWidthPx}px`;
      document.body.style.minWidth = `${pageWidthPx}px`;
      document.body.style.minHeight = `${pageHeightPx}px`;
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.background = "#ffffff";
      document.body.style.setProperty("--report-page-frame-padding-inline", `${safeMarginInline}px`);
      document.body.style.setProperty("--report-page-frame-padding-block", `${safeMarginBlock}px`);
    },
    {
      pageWidthPx: A4_PAGE_WIDTH_PX,
      pageHeightPx: A4_PAGE_HEIGHT_PX,
      pageMarginInlinePx: safeHorizontalMarginPx,
      pageMarginBlockPx: safeVerticalMarginPx,
      baseScaleValue,
    }
  );

  await page.addStyleTag({
    content: `
      @page {
        size: A4;
        margin: 0;
      }

      html, body {
        width: ${A4_PAGE_WIDTH_PX}px !important;
        min-width: ${A4_PAGE_WIDTH_PX}px !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      body > :not([data-report-export-root="1"]) {
        display: none !important;
      }

      [data-report-export-root="1"] {
        width: ${A4_PAGE_WIDTH_PX}px !important;
        min-width: ${A4_PAGE_WIDTH_PX}px !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      [data-testid="report-capture-surface"] {
        width: ${A4_PAGE_WIDTH_PX}px !important;
        max-width: ${A4_PAGE_WIDTH_PX}px !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      }

      [data-report-export-root="1"] [data-testid="report-capture-surface"] [data-report-page-frame="1"] {
        width: ${A4_PAGE_WIDTH_PX}px !important;
        min-height: ${A4_PAGE_HEIGHT_PX}px !important;
        height: ${A4_PAGE_HEIGHT_PX}px !important;
        max-height: ${A4_PAGE_HEIGHT_PX}px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding:
          var(--report-page-frame-padding-block, 0px)
          var(--report-page-frame-padding-inline, 0px) !important;
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
        transform: scale(var(--report-page-print-scale, 1)) !important;
        transform-origin: top center !important;
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
