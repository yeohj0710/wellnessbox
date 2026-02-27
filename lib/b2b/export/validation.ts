import "server-only";

import type { LayoutDocument, LayoutNode } from "@/lib/b2b/export/layout-types";
import type {
  LayoutValidationIssue,
} from "@/lib/b2b/export/validation-types";
import {
  MM_TO_PX,
  buildBoundsIssue,
  estimateTextHeightMm,
  estimateTextWidthMm,
  intersects,
  isMeaningfulOverlapMm,
  shouldIgnoreOverlap,
  toBounds,
} from "@/lib/b2b/export/validation-geometry";

export type LayoutValidationResult = {
  ok: boolean;
  staticIssues: LayoutValidationIssue[];
  runtimeIssues: LayoutValidationIssue[];
  runtimeEngine: "playwright" | "heuristic";
};

export function validateLayoutStatic(layout: LayoutDocument) {
  const issues: LayoutValidationIssue[] = [];

  for (const page of layout.pages) {
    for (const node of page.nodes) {
      if (node.w <= 0 || node.h <= 0) {
        issues.push(
          buildBoundsIssue({
            pageId: page.id,
            node,
            detail: "요소 너비/높이는 0보다 커야 합니다.",
          })
        );
      }

      if (node.x < 0 || node.y < 0) {
        issues.push(
          buildBoundsIssue({
            pageId: page.id,
            node,
            detail: "요소 좌표는 음수일 수 없습니다.",
          })
        );
      }

      if (node.x + node.w > page.widthMm || node.y + node.h > page.heightMm) {
        issues.push(
          buildBoundsIssue({
            pageId: page.id,
            node,
            detail: "요소가 페이지 경계를 벗어났습니다.",
          })
        );
      }

      if (node.type === "text" && node.text) {
        const estimatedW = estimateTextWidthMm(node.text, node.fontSize);
        const estimatedH = estimateTextHeightMm(node.fontSize);
        if (estimatedW > node.w * 1.42 || estimatedH > node.h * 1.4) {
          issues.push({
            code: "TEXT_OVERFLOW",
            pageId: page.id,
            nodeId: node.id,
            detail: "텍스트 길이가 요소 영역 대비 과도합니다.",
            nodeBounds: toBounds(node),
          });
        }
      }
    }

    const textNodes = page.nodes.filter((node) => node.type === "text");
    for (let i = 0; i < textNodes.length; i += 1) {
      const left = textNodes[i];
      const leftBounds = toBounds(left);
      for (let j = i + 1; j < textNodes.length; j += 1) {
        const right = textNodes[j];
        if (shouldIgnoreOverlap(left, right)) continue;
        const rightBounds = toBounds(right);
        if (!intersects(leftBounds, rightBounds)) continue;
        if (!isMeaningfulOverlapMm(leftBounds, rightBounds)) continue;
        issues.push({
          code: "OVERLAP",
          pageId: page.id,
          nodeId: left.id,
          relatedNodeId: right.id,
          detail: "텍스트 요소 간 겹침이 감지되었습니다.",
          nodeBounds: leftBounds,
          relatedNodeBounds: rightBounds,
        });
      }
    }
  }

  return issues;
}

function buildRuntimeHtml(layout: LayoutDocument) {
  const pages = layout.pages
    .map((page) => {
      const nodes = page.nodes
        .map((node) => {
          const style = [
            `left:${node.x * MM_TO_PX}px`,
            `top:${node.y * MM_TO_PX}px`,
            `width:${node.w * MM_TO_PX}px`,
            `height:${node.h * MM_TO_PX}px`,
            "position:absolute",
            "box-sizing:border-box",
            "overflow:hidden",
            node.type === "rect" ? `background:#${node.fill || "FFFFFF"}` : "",
            node.type === "text"
              ? `font-size:${node.fontSize ?? 12}px;line-height:1.28;font-family:'Noto Sans KR',sans-serif;color:#${
                  node.color || "111827"
                };font-weight:${node.bold ? 700 : 400};white-space:pre-wrap;word-break:keep-all`
              : "",
          ]
            .filter(Boolean)
            .join(";");

          const content = node.type === "text" ? node.text ?? "" : "";
          return `<div data-page-id="${page.id}" data-node-id="${node.id}" data-node-type="${
            node.type
          }" data-role="${node.role || ""}" data-allow-overlap="${
            node.allowOverlap ? "1" : "0"
          }" data-x="${node.x}" data-y="${node.y}" data-w="${node.w}" data-h="${node.h}" style="${style}">${content}</div>`;
        })
        .join("");

      return `<section data-layout-page="${page.id}" style="position:relative;margin:0 auto 20px;border:1px solid #ddd;width:${page.widthMm * MM_TO_PX}px;height:${page.heightMm * MM_TO_PX}px;">${nodes}</section>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"/></head><body>${pages}</body></html>`;
}

function runtimeValidateByHeuristic(layout: LayoutDocument) {
  const issues: LayoutValidationIssue[] = [];

  for (const page of layout.pages) {
    for (const node of page.nodes) {
      if (node.x + node.w > page.widthMm || node.y + node.h > page.heightMm) {
        issues.push({
          code: "BOUNDS",
          pageId: page.id,
          nodeId: node.id,
          detail: "요소가 페이지 경계를 벗어났습니다.",
          nodeBounds: toBounds(node),
        });
      }

      if (node.type === "text" && node.text) {
        const estimatedW = estimateTextWidthMm(node.text, node.fontSize);
        if (estimatedW > node.w * 1.28) {
          issues.push({
            code: "TEXT_OVERFLOW",
            pageId: page.id,
            nodeId: node.id,
            detail: "텍스트가 영역보다 길어 오버플로우가 예상됩니다.",
            nodeBounds: toBounds(node),
          });
        }
      }
    }

    const textNodes = page.nodes.filter((node) => node.type === "text");
    for (let i = 0; i < textNodes.length; i += 1) {
      const left = textNodes[i];
      const leftBounds = toBounds(left);
      for (let j = i + 1; j < textNodes.length; j += 1) {
        const right = textNodes[j];
        if (shouldIgnoreOverlap(left, right)) continue;
        const rightBounds = toBounds(right);
        if (!intersects(leftBounds, rightBounds)) continue;
        if (!isMeaningfulOverlapMm(leftBounds, rightBounds)) continue;
        issues.push({
          code: "OVERLAP",
          pageId: page.id,
          nodeId: left.id,
          relatedNodeId: right.id,
          detail: "텍스트 요소 간 겹침이 감지되었습니다.",
          nodeBounds: leftBounds,
          relatedNodeBounds: rightBounds,
        });
      }
    }
  }

  return issues;
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

async function runtimeValidateByPlaywright(layout: LayoutDocument) {
  const playwright = await loadPlaywrightModule();
  if (!playwright?.chromium) return null;

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(buildRuntimeHtml(layout), { waitUntil: "domcontentloaded" });

    const issues = (await page.evaluate(() => {
      const discovered: Array<{
        code: "BOUNDS" | "OVERLAP" | "TEXT_OVERFLOW" | "CLIP";
        pageId: string;
        nodeId?: string;
        relatedNodeId?: string;
        detail: string;
        nodeBounds?: { x: number; y: number; w: number; h: number };
        relatedNodeBounds?: { x: number; y: number; w: number; h: number };
      }> = [];

      const parseBounds = (element: HTMLElement) => {
        const x = Number(element.dataset.x ?? 0);
        const y = Number(element.dataset.y ?? 0);
        const w = Number(element.dataset.w ?? 0);
        const h = Number(element.dataset.h ?? 0);
        return {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          w: Number(w.toFixed(2)),
          h: Number(h.toFixed(2)),
        };
      };

      const pageElements = Array.from(
        document.querySelectorAll<HTMLElement>("[data-layout-page]")
      );
      for (const pageEl of pageElements) {
        const pageId = pageEl.dataset.layoutPage || "unknown-page";
        const pageRect = pageEl.getBoundingClientRect();
        const nodes = Array.from(pageEl.querySelectorAll<HTMLElement>("[data-node-id]"));

        for (const node of nodes) {
          const nodeId = node.dataset.nodeId || "unknown-node";
          const nodeRect = node.getBoundingClientRect();
          const nodeType = node.dataset.nodeType;
          const bounds = parseBounds(node);

          if (
            nodeRect.left < pageRect.left ||
            nodeRect.top < pageRect.top ||
            nodeRect.right > pageRect.right ||
            nodeRect.bottom > pageRect.bottom
          ) {
            discovered.push({
              code: "BOUNDS",
              pageId,
              nodeId,
              detail: "요소가 페이지 경계를 벗어났습니다.",
              nodeBounds: bounds,
            });
          }

          if (nodeType === "text") {
            if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) {
              discovered.push({
                code: "TEXT_OVERFLOW",
                pageId,
                nodeId,
                detail: "텍스트가 영역을 벗어납니다.",
                nodeBounds: bounds,
              });
            }
            if (node.offsetWidth < 1 || node.offsetHeight < 1) {
              discovered.push({
                code: "CLIP",
                pageId,
                nodeId,
                detail: "렌더링 결과에서 텍스트 요소가 잘렸습니다.",
                nodeBounds: bounds,
              });
            }
          }
        }

        const textNodes = nodes.filter((node) => node.dataset.nodeType === "text");
        for (let i = 0; i < textNodes.length; i += 1) {
          const left = textNodes[i];
          const leftSkip =
            left.dataset.allowOverlap === "1" ||
            left.dataset.role === "background" ||
            (left.dataset.nodeId || "").includes("-bg-");
          const leftRect = left.getBoundingClientRect();
          const leftBounds = parseBounds(left);
          const leftId = left.dataset.nodeId || "unknown-node";

          for (let j = i + 1; j < textNodes.length; j += 1) {
            const right = textNodes[j];
            const rightSkip =
              right.dataset.allowOverlap === "1" ||
              right.dataset.role === "background" ||
              (right.dataset.nodeId || "").includes("-bg-");
            if (leftSkip || rightSkip) continue;

            const rightRect = right.getBoundingClientRect();
            const overlapX =
              Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
            const overlapY =
              Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
            if (overlapX <= 1.8 || overlapY <= 0.9) continue;

            discovered.push({
              code: "OVERLAP",
              pageId,
              nodeId: leftId,
              relatedNodeId: right.dataset.nodeId || "unknown-node",
              detail: "텍스트 요소 간 겹침이 감지되었습니다.",
              nodeBounds: leftBounds,
              relatedNodeBounds: parseBounds(right),
            });
          }
        }
      }

      return discovered;
    })) as LayoutValidationIssue[];

    return issues;
  } finally {
    await browser.close();
  }
}

export async function validateLayoutRuntime(layout: LayoutDocument) {
  const playwrightIssues = await runtimeValidateByPlaywright(layout);
  if (playwrightIssues) {
    return {
      engine: "playwright" as const,
      issues: playwrightIssues,
    };
  }

  return {
    engine: "heuristic" as const,
    issues: runtimeValidateByHeuristic(layout),
  };
}

export async function validateLayout(
  layout: LayoutDocument
): Promise<LayoutValidationResult> {
  const staticIssues = validateLayoutStatic(layout);
  const runtime = await validateLayoutRuntime(layout);
  const runtimeIssues = runtime.issues;
  return {
    ok: staticIssues.length === 0 && runtimeIssues.length === 0,
    staticIssues,
    runtimeIssues,
    runtimeEngine: runtime.engine,
  };
}
