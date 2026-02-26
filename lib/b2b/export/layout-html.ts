import type { LayoutDocument, LayoutNode } from "@/lib/b2b/export/layout-types";
import {
  REPORT_FONT_STACK,
  REPORT_TEXT_LINE_HEIGHT,
} from "@/lib/b2b/export/render-style";

export const MM_TO_PX = 3.7795275591;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function renderNodeHtml(node: LayoutNode) {
  const style = [
    "position:absolute",
    `left:${node.x * MM_TO_PX}px`,
    `top:${node.y * MM_TO_PX}px`,
    `width:${node.w * MM_TO_PX}px`,
    `height:${node.h * MM_TO_PX}px`,
    "box-sizing:border-box",
    "overflow:hidden",
  ];

  if (node.type === "rect") {
    style.push(`background:#${node.fill || "FFFFFF"}`);
    return `<div style="${style.join(";")}"></div>`;
  }

  style.push(`color:#${node.color || "111827"}`);
  style.push(`font-size:${node.fontSize ?? 12}px`);
  style.push(`font-weight:${node.bold ? 700 : 400}`);
  style.push(`font-family:${REPORT_FONT_STACK}`);
  style.push("display:flex");
  style.push("align-items:flex-start");
  style.push("justify-content:flex-start");
  style.push("margin:0");
  style.push("padding:0");
  style.push(`line-height:${REPORT_TEXT_LINE_HEIGHT}`);
  style.push("white-space:pre-wrap");
  style.push("word-break:keep-all");
  return `<div style="${style.join(";")}">${escapeHtml(node.text || "")}</div>`;
}

export function buildLayoutHtml(layout: LayoutDocument) {
  const pages = layout.pages
    .map((page) => {
      const pageNodes = page.nodes.map((node) => renderNodeHtml(node)).join("");
      return `
        <section class="page" style="width:${page.widthMm * MM_TO_PX}px;height:${
          page.heightMm * MM_TO_PX
        }px;">
          ${pageNodes}
        </section>
      `;
    })
    .join("\n");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: ${REPORT_FONT_STACK};
          line-height: ${REPORT_TEXT_LINE_HEIGHT};
        }
        .report-root {
          margin: 0;
          padding: 0;
        }
        .page {
          position: relative;
          margin: 0 auto;
          page-break-after: always;
          break-after: page;
        }
        .page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
      </style>
    </head>
    <body>
      <main class="report-root">${pages}</main>
    </body>
  </html>`;
}
