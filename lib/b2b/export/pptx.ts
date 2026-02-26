import "server-only";

import PptxGenJS from "pptxgenjs";
import type { LayoutDocument, LayoutNode } from "@/lib/b2b/export/layout-types";
import { buildLayoutHtml, MM_TO_PX } from "@/lib/b2b/export/layout-html";
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

function toPngDataUri(buffer: Buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function renderLayoutToPngDataUris(layout: LayoutDocument) {
  const playwright = await loadPlaywrightModule();
  if (!playwright?.chromium) return null;

  const browser = await playwright.chromium.launch({ headless: true });
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
    if (pageHandles.length === 0) return null;

    const images: string[] = [];
    for (const pageHandle of pageHandles) {
      const screenshot = await pageHandle.screenshot({ type: "png" });
      images.push(toPngDataUri(Buffer.from(screenshot)));
    }

    return images;
  } catch {
    return null;
  } finally {
    await browser.close();
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
  if (rasterizedPages && rasterizedPages.length === layout.pages.length) {
    for (let index = 0; index < layout.pages.length; index += 1) {
      const pageDef = layout.pages[index];
      const slide = pptx.addSlide();
      slide.addImage({
        data: rasterizedPages[index],
        x: 0,
        y: 0,
        w: mmToInch(pageDef.widthMm),
        h: mmToInch(pageDef.heightMm),
      });
    }
  } else {
    if (!allowVectorFallback()) {
      throw new Error(
        "Playwright HTML renderer is unavailable for PPTX export. Vector fallback is disabled to keep web/PPTX parity."
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
