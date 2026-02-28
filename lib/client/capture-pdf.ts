export type CaptureElementToPdfInput = {
  element: HTMLElement;
  fileName: string;
  marginMm?: number;
  quality?: number;
  desktopViewportWidth?: number;
  scale?: number;
};

const TARGET_SCALE_MIN = 3;
const TARGET_SCALE_MAX = 4.5;
const CAPTURE_TARGET_ATTR = "data-wb-pdf-capture-target";

const CAPTURE_FREEZE_STYLE = `
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }

  html,
  body {
    -webkit-font-smoothing: antialiased !important;
    text-rendering: geometricPrecision !important;
  }
`;

type Html2CanvasFn = typeof import("html2canvas").default;

function resolveScale(explicitScale: number | undefined) {
  if (typeof explicitScale === "number" && Number.isFinite(explicitScale)) {
    return Math.max(TARGET_SCALE_MIN, Math.min(TARGET_SCALE_MAX, explicitScale));
  }

  if (typeof window === "undefined") return TARGET_SCALE_MIN;
  const ratio = window.devicePixelRatio || 1;
  return Math.max(TARGET_SCALE_MIN, Math.min(TARGET_SCALE_MAX, ratio + 2.2));
}

function resolveDesktopViewportWidth(value: number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1280, Math.round(value));
  }
  return 1440;
}

function resolveTargetDimensions(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const widthPx = Math.max(1, Math.round(rect.width || target.clientWidth || target.scrollWidth));
  const heightPx = Math.max(
    1,
    Math.round(rect.height || target.clientHeight || target.scrollHeight)
  );
  const windowHeightPx = Math.max(
    widthPx,
    Math.round(target.scrollHeight || 0),
    Math.round(target.clientHeight || 0),
    heightPx
  );

  return { widthPx, heightPx, windowHeightPx };
}

function buildTargetToken() {
  return `wb-capture-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isMeaningfullyBlankCanvas(canvas: HTMLCanvasElement) {
  if (canvas.width === 0 || canvas.height === 0) return true;

  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = 64;
  probeCanvas.height = 64;
  const probeContext = probeCanvas.getContext("2d", { willReadFrequently: true });
  if (!probeContext) return false;

  probeContext.clearRect(0, 0, probeCanvas.width, probeCanvas.height);
  probeContext.drawImage(canvas, 0, 0, probeCanvas.width, probeCanvas.height);

  const { data } = probeContext.getImageData(0, 0, probeCanvas.width, probeCanvas.height);
  let nonWhiteCount = 0;
  const totalPixels = data.length / 4;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const hasInk = alpha > 20 && (red < 246 || green < 246 || blue < 246);
    if (hasInk) {
      nonWhiteCount += 1;
    }
  }

  return nonWhiteCount / Math.max(1, totalPixels) < 0.003;
}

function createCaptureOptions(input: {
  desktopViewportWidth: number;
  scale: number;
  targetToken: string;
  targetWidthPx: number;
  windowHeightPx: number;
  foreignObjectRendering: boolean;
}) {
  return {
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    scale: input.scale,
    scrollX: 0,
    scrollY: 0,
    windowWidth: input.desktopViewportWidth,
    windowHeight: input.windowHeightPx,
    removeContainer: true,
    foreignObjectRendering: input.foreignObjectRendering,
    onclone: (clonedDocument: Document) => {
      const style = clonedDocument.createElement("style");
      style.textContent = CAPTURE_FREEZE_STYLE;
      clonedDocument.head.appendChild(style);

      const clonedTarget = clonedDocument.querySelector<HTMLElement>(
        `[${CAPTURE_TARGET_ATTR}="${input.targetToken}"]`
      );
      if (!clonedTarget) return;

      clonedTarget.style.width = `${input.targetWidthPx}px`;
      clonedTarget.style.minWidth = `${input.targetWidthPx}px`;
      clonedTarget.style.maxWidth = `${input.targetWidthPx}px`;
    },
  } satisfies Parameters<Html2CanvasFn>[1];
}

async function renderTargetCanvas(input: {
  html2canvas: Html2CanvasFn;
  target: HTMLElement;
  desktopViewportWidth: number;
  scale: number;
}) {
  const { widthPx, windowHeightPx } = resolveTargetDimensions(input.target);
  const targetToken = buildTargetToken();
  input.target.setAttribute(CAPTURE_TARGET_ATTR, targetToken);

  const captureOptions = createCaptureOptions({
    desktopViewportWidth: input.desktopViewportWidth,
    scale: input.scale,
    targetToken,
    targetWidthPx: widthPx,
    windowHeightPx,
    foreignObjectRendering: true,
  });
  const fallbackOptions = createCaptureOptions({
    desktopViewportWidth: input.desktopViewportWidth,
    scale: input.scale,
    targetToken,
    targetWidthPx: widthPx,
    windowHeightPx,
    foreignObjectRendering: false,
  });

  try {
    try {
      const rendered = await input.html2canvas(input.target, captureOptions);
      if (!isMeaningfullyBlankCanvas(rendered)) {
        return rendered;
      }
    } catch {
      // Ignore and fallback to the default renderer below.
    }
    return await input.html2canvas(input.target, fallbackOptions);
  } finally {
    input.target.removeAttribute(CAPTURE_TARGET_ATTR);
  }
}

async function waitForStableCaptureFrame() {
  if (typeof document === "undefined") return;
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading failures and continue capture.
    }
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export async function captureElementToPdf(input: CaptureElementToPdfInput) {
  if (typeof window === "undefined") {
    throw new Error("captureElementToPdf can only run in the browser.");
  }

  const html2canvasModule = await import("html2canvas");
  const jspdfModule = await import("jspdf");
  const html2canvas = html2canvasModule.default;
  const { jsPDF } = jspdfModule;

  const marginMm = input.marginMm ?? 8;
  const desktopViewportWidth = resolveDesktopViewportWidth(input.desktopViewportWidth);
  const captureScale = resolveScale(input.scale);

  await waitForStableCaptureFrame();

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: false,
  });
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const usableWidthMm = pageWidthMm - marginMm * 2;
  const usableHeightMm = pageHeightMm - marginMm * 2;

  const pagedTargets = Array.from(
    input.element.querySelectorAll<HTMLElement>("[data-report-page]")
  );
  if (pagedTargets.length > 0) {
    for (let index = 0; index < pagedTargets.length; index += 1) {
      const target = pagedTargets[index];
      await waitForStableCaptureFrame();
      const canvas = await renderTargetCanvas({
        html2canvas,
        target,
        desktopViewportWidth,
        scale: captureScale,
      });

      const scaleMmPerPx = Math.min(
        usableWidthMm / Math.max(1, canvas.width),
        usableHeightMm / Math.max(1, canvas.height)
      );
      const renderWidthMm = canvas.width * scaleMmPerPx;
      const renderHeightMm = canvas.height * scaleMmPerPx;
      const offsetX = marginMm + (usableWidthMm - renderWidthMm) / 2;
      const offsetY = marginMm + (usableHeightMm - renderHeightMm) / 2;
      const imageData = canvas.toDataURL("image/png");

      if (index > 0) {
        pdf.addPage("a4", "portrait");
      }
      pdf.addImage(
        imageData,
        "PNG",
        offsetX,
        offsetY,
        renderWidthMm,
        renderHeightMm,
        undefined,
        "NONE"
      );
    }

    pdf.save(input.fileName);
    return;
  }

  const canvas = await renderTargetCanvas({
    html2canvas,
    target: input.element,
    desktopViewportWidth,
    scale: captureScale,
  });

  const mmPerPx = usableWidthMm / canvas.width;
  const pageHeightPx = Math.max(1, Math.floor(usableHeightMm / mmPerPx));

  const sliceCanvas = document.createElement("canvas");
  sliceCanvas.width = canvas.width;
  const sliceContext = sliceCanvas.getContext("2d");
  if (!sliceContext) {
    throw new Error("Unable to build a PDF image slice.");
  }

  let offsetY = 0;
  let pageIndex = 0;
  while (offsetY < canvas.height) {
    const currentHeightPx = Math.min(pageHeightPx, canvas.height - offsetY);
    sliceCanvas.height = currentHeightPx;
    sliceContext.clearRect(0, 0, sliceCanvas.width, currentHeightPx);
    sliceContext.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      currentHeightPx,
      0,
      0,
      canvas.width,
      currentHeightPx
    );

    const renderHeightMm = currentHeightPx * mmPerPx;
    const imageData = sliceCanvas.toDataURL("image/png");

    if (pageIndex > 0) {
      pdf.addPage("a4", "portrait");
    }
    pdf.addImage(
      imageData,
      "PNG",
      marginMm,
      marginMm,
      usableWidthMm,
      renderHeightMm,
      undefined,
      "NONE"
    );

    offsetY += currentHeightPx;
    pageIndex += 1;
  }

  pdf.save(input.fileName);
}
