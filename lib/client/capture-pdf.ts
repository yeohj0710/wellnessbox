export type CaptureElementToPdfInput = {
  element: HTMLElement;
  fileName: string;
  marginMm?: number;
  quality?: number;
  desktopViewportWidth?: number;
};

function clampQuality(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.95;
  if (value < 0.5) return 0.5;
  if (value > 1) return 1;
  return value;
}

function resolveScale() {
  if (typeof window === "undefined") return 2;
  const ratio = window.devicePixelRatio || 1;
  return Math.max(2, Math.min(3, ratio));
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
  const quality = clampQuality(input.quality);
  const desktopViewportWidth = Math.max(1280, input.desktopViewportWidth ?? 1440);

  await waitForStableCaptureFrame();

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
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
      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        scale: resolveScale(),
        scrollX: 0,
        scrollY: 0,
        windowWidth: desktopViewportWidth,
        windowHeight: Math.max(
          desktopViewportWidth,
          target.scrollHeight,
          target.clientHeight
        ),
      });

      const imageData = canvas.toDataURL("image/jpeg", quality);
      const scaleMmPerPx = Math.min(
        usableWidthMm / Math.max(1, canvas.width),
        usableHeightMm / Math.max(1, canvas.height)
      );
      const renderWidthMm = canvas.width * scaleMmPerPx;
      const renderHeightMm = canvas.height * scaleMmPerPx;
      const offsetX = marginMm + (usableWidthMm - renderWidthMm) / 2;
      const offsetY = marginMm + (usableHeightMm - renderHeightMm) / 2;

      if (index > 0) {
        pdf.addPage("a4", "portrait");
      }
      pdf.addImage(
        imageData,
        "JPEG",
        offsetX,
        offsetY,
        renderWidthMm,
        renderHeightMm,
        undefined,
        "FAST"
      );
    }

    pdf.save(input.fileName);
    return;
  }

  const canvas = await html2canvas(input.element, {
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    scale: resolveScale(),
    scrollX: 0,
    scrollY: 0,
    windowWidth: desktopViewportWidth,
    windowHeight: Math.max(
      desktopViewportWidth,
      input.element.scrollHeight,
      input.element.clientHeight
    ),
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

    const imageData = sliceCanvas.toDataURL("image/jpeg", quality);
    const renderHeightMm = currentHeightPx * mmPerPx;

    if (pageIndex > 0) {
      pdf.addPage("a4", "portrait");
    }
    pdf.addImage(
      imageData,
      "JPEG",
      marginMm,
      marginMm,
      usableWidthMm,
      renderHeightMm,
      undefined,
      "FAST"
    );

    offsetY += currentHeightPx;
    pageIndex += 1;
  }

  pdf.save(input.fileName);
}
