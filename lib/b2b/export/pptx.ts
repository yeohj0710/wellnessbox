import "server-only";

import PptxGenJS from "pptxgenjs";
import type { LayoutDocument, LayoutNode } from "@/lib/b2b/export/layout-dsl";

function mmToInch(mm: number) {
  return mm / 25.4;
}

function nodeToRectShape(slide: PptxGenJS.Slide, node: LayoutNode) {
  slide.addShape(PptxGenJS.ShapeType.rect, {
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
    color: node.color || "111827",
    valign: "top",
    fit: "shrink",
    breakLine: true,
  });
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

  for (const page of layout.pages) {
    const slide = pptx.addSlide();
    for (const node of page.nodes) {
      if (node.type === "rect") {
        nodeToRectShape(slide, node);
        continue;
      }
      nodeToText(slide, node);
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer", compression: true });
  return Buffer.from(buffer as ArrayBuffer);
}
