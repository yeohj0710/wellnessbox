import "server-only";

import PptxGenJS from "pptxgenjs";
import type { LayoutDocument, LayoutNode } from "@/lib/b2b/export/layout-types";
import { buildLayoutHtml, MM_TO_PX } from "@/lib/b2b/export/layout-html";
import { launchPlaywrightChromium } from "@/lib/b2b/export/playwright-runtime";
import { REPORT_PPTX_FONT_FACE } from "@/lib/b2b/export/render-style";

function mmToInch(mm: number) {
  return mm / 25.4;
}

function nodeToRectShape(slide: PptxGenJS.Slide, node: LayoutNode) {
  slide.addShape("rect", {
    x: mmToInch(node.x),
    y: mmToInch(node.y),
    w: mmToInch(node.w),
    h: mmToInch(node.h),
    line: { color: node.fill || "FFFFFF", transparency: 100 },
    fill: { color: node.fill || "FFFFFF", transparency: 0 },
  });
}

function nodeToText(slide: PptxGenJS.Slide, node: LayoutNode) {
  slide.addText(node.text || "", {
    x: mmToInch(node.x),
    y: mmToInch(node.y),
    w: mmToInch(node.w),
    h: mmToInch(node.h),
    fontSize: node.fontSize ?? 12,
    bold: !!node.bold,
    fontFace: REPORT_PPTX_FONT_FACE,
    color: node.color || "111827",
    valign: "top",
    margin: 0,
    breakLine: true,
  });
}

function toErrorReason(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function toPngDataUri(buffer: Buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

type RasterizedPagesResult =
  | { ok: true; images: string[] }
  | { ok: false; reason: string };

async function renderLayoutToPngDataUris(layout: LayoutDocument): Promise<RasterizedPagesResult> {
  const launched = await launchPlaywrightChromium();
  if (!launched.ok) {
    return {
      ok: false,
      reason: launched.reason,
    };
  }
  const { browser } = launched;
  try {
    const viewportWidth = Math.max(
      1,
      ...layout.pages.map((page) => Math.ceil(page.widthMm * MM_TO_PX))
    );
    const viewportHeight = Math.max(
      1,
      ...layout.pages.map((page) => Math.ceil(page.heightMm * MM_TO_PX))
    );

    const page = await browser.newPage({
      viewport: { width: viewportWidth, height: viewportHeight },
    });
    await page.setContent(buildLayoutHtml(layout), {
      waitUntil: "domcontentloaded",
    });

    const pageHandles = await page.$$(".page");
    if (pageHandles.length === 0) {
      return {
        ok: false,
        reason: "Layout page elements are missing",
      };
    }

    const images: string[] = [];
    for (const pageHandle of pageHandles) {
      const screenshot = await pageHandle.screenshot({ type: "png" });
      images.push(toPngDataUri(Buffer.from(screenshot)));
    }

    return {
      ok: true,
      images,
    };
  } catch (error) {
    return {
      ok: false,
      reason: toErrorReason(error, "Playwright layout rasterization failed"),
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function allowVectorFallback() {
  const value = (process.env.B2B_ALLOW_PPTX_VECTOR_FALLBACK || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "y";
}

export async function renderLayoutToPptxBuffer(layout: LayoutDocument) {
  const pptx = new PptxGenJS();
  pptx.author = "WellnessBox";
  pptx.company = "WellnessBox";
  pptx.subject = "B2B employee report";
  pptx.title = layout.docTitle;

  const layoutName = `WB_${layout.pageSize}_${layout.variantIndex}`;
  pptx.defineLayout({
    name: layoutName,
    width: mmToInch(layout.pageSizeMm.width),
    height: mmToInch(layout.pageSizeMm.height),
  });
  pptx.layout = layoutName;

  const rasterizedPages = await renderLayoutToPngDataUris(layout);
  if (rasterizedPages.ok && rasterizedPages.images.length === layout.pages.length) {
    for (let index = 0; index < layout.pages.length; index += 1) {
      const pageDef = layout.pages[index];
      const slide = pptx.addSlide();
      slide.addImage({
        data: rasterizedPages.images[index],
        x: 0,
        y: 0,
        w: mmToInch(pageDef.widthMm),
        h: mmToInch(pageDef.heightMm),
      });
    }
  } else {
    const rasterizeReason = rasterizedPages.ok
      ? `Rasterized page count mismatch (${rasterizedPages.images.length}/${layout.pages.length})`
      : rasterizedPages.reason;
    if (!allowVectorFallback()) {
      throw new Error(
        `${rasterizeReason}. Vector fallback is disabled to keep web/PPTX parity.`
      );
    }
    for (const pageDef of layout.pages) {
      const slide = pptx.addSlide();
      for (const node of pageDef.nodes) {
        if (node.type === "rect") {
          nodeToRectShape(slide, node);
          continue;
        }
        nodeToText(slide, node);
      }
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer", compression: true });
  return Buffer.from(buffer as ArrayBuffer);
}
