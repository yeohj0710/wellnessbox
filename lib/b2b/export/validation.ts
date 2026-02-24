import "server-only";

import type { LayoutDocument, LayoutNode } from "@/lib/b2b/export/layout-dsl";

const MM_TO_PX = 3.7795275591;

export type LayoutValidationIssue = {
  code: "BOUNDS" | "OVERLAP" | "TEXT_OVERFLOW";
  pageId: string;
  nodeId?: string;
  detail: string;
};

export type LayoutValidationResult = {
  ok: boolean;
  staticIssues: LayoutValidationIssue[];
  runtimeIssues: LayoutValidationIssue[];
  runtimeEngine: "playwright" | "heuristic";
};

function intersects(a: LayoutNode, b: LayoutNode) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function estimateTextWidthMm(text: string, fontSize = 12) {
  const averageCharWidthMm = Math.max(1.8, fontSize * 0.16);
  return text.length * averageCharWidthMm;
}

function estimateTextHeightMm(fontSize = 12) {
  return Math.max(4, fontSize * 0.42);
}

export function validateLayoutStatic(layout: LayoutDocument) {
  const issues: LayoutValidationIssue[] = [];

  for (const page of layout.pages) {
    for (const node of page.nodes) {
      if (node.w <= 0 || node.h <= 0) {
        issues.push({
          code: "BOUNDS",
          pageId: page.id,
          nodeId: node.id,
          detail: "노드 크기는 0보다 커야 합니다.",
        });
      }
      if (node.x < 0 || node.y < 0) {
        issues.push({
          code: "BOUNDS",
          pageId: page.id,
          nodeId: node.id,
          detail: "노드 좌표는 음수일 수 없습니다.",
        });
      }
      if (node.x + node.w > page.widthMm || node.y + node.h > page.heightMm) {
        issues.push({
          code: "BOUNDS",
          pageId: page.id,
          nodeId: node.id,
          detail: "노드가 페이지 경계를 벗어났습니다.",
        });
      }
      if (node.type === "text" && node.text) {
        const estimatedW = estimateTextWidthMm(node.text, node.fontSize);
        const estimatedH = estimateTextHeightMm(node.fontSize);
        if (estimatedW > node.w * 1.2 || estimatedH > node.h * 1.2) {
          issues.push({
            code: "TEXT_OVERFLOW",
            pageId: page.id,
            nodeId: node.id,
            detail: "텍스트 길이가 노드 영역 대비 과도합니다.",
          });
        }
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
              ? `font-size:${(node.fontSize ?? 12) * 1.2}px;line-height:1.2;font-family:'Noto Sans KR',sans-serif;color:#${node.color || "111827"};font-weight:${node.bold ? 700 : 400}`
              : "",
          ]
            .filter(Boolean)
            .join(";");

          const content = node.type === "text" ? node.text ?? "" : "";
          return `<div data-page-id="${page.id}" data-node-id="${node.id}" data-node-type="${node.type}" style="${style}">${content}</div>`;
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
    for (let i = 0; i < page.nodes.length; i += 1) {
      const node = page.nodes[i];
      if (node.x + node.w > page.widthMm || node.y + node.h > page.heightMm) {
        issues.push({
          code: "BOUNDS",
          pageId: page.id,
          nodeId: node.id,
          detail: "노드가 페이지 밖으로 나갑니다.",
        });
      }
      if (node.type === "text" && node.text) {
        const estimatedW = estimateTextWidthMm(node.text, node.fontSize);
        if (estimatedW > node.w) {
          issues.push({
            code: "TEXT_OVERFLOW",
            pageId: page.id,
            nodeId: node.id,
            detail: "텍스트 오버플로우가 예상됩니다.",
          });
        }
      }
      for (let j = i + 1; j < page.nodes.length; j += 1) {
        const other = page.nodes[j];
        if (intersects(node, other)) {
          issues.push({
            code: "OVERLAP",
            pageId: page.id,
            nodeId: `${node.id}|${other.id}`,
            detail: "노드가 서로 겹칩니다.",
          });
        }
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
      const pageElements = Array.from(
        document.querySelectorAll<HTMLElement>("[data-layout-page]")
      );
      const discovered: Array<{
        code: "BOUNDS" | "OVERLAP" | "TEXT_OVERFLOW";
        pageId: string;
        nodeId?: string;
        detail: string;
      }> = [];

      for (const pageEl of pageElements) {
        const pageId = pageEl.dataset.layoutPage || "unknown-page";
        const pageRect = pageEl.getBoundingClientRect();
        const nodes = Array.from(
          pageEl.querySelectorAll<HTMLElement>("[data-node-id]")
        );

        for (let i = 0; i < nodes.length; i += 1) {
          const node = nodes[i];
          const nodeId = node.dataset.nodeId || "unknown-node";
          const rect = node.getBoundingClientRect();

          if (
            rect.left < pageRect.left ||
            rect.top < pageRect.top ||
            rect.right > pageRect.right ||
            rect.bottom > pageRect.bottom
          ) {
            discovered.push({
              code: "BOUNDS",
              pageId,
              nodeId,
              detail: "노드가 페이지 경계 밖으로 배치되었습니다.",
            });
          }

          const isTextNode = node.dataset.nodeType === "text";
          if (isTextNode) {
            if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) {
              discovered.push({
                code: "TEXT_OVERFLOW",
                pageId,
                nodeId,
                detail: "텍스트가 노드 영역을 넘쳤습니다.",
              });
            }
          }

          for (let j = i + 1; j < nodes.length; j += 1) {
            const other = nodes[j];
            const otherRect = other.getBoundingClientRect();
            const overlapX =
              Math.min(rect.right, otherRect.right) - Math.max(rect.left, otherRect.left);
            const overlapY =
              Math.min(rect.bottom, otherRect.bottom) - Math.max(rect.top, otherRect.top);
            if (overlapX > 1 && overlapY > 1) {
              discovered.push({
                code: "OVERLAP",
                pageId,
                nodeId: `${nodeId}|${other.dataset.nodeId || "unknown-node"}`,
                detail: "노드가 겹칩니다.",
              });
            }
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

export async function validateLayout(layout: LayoutDocument): Promise<LayoutValidationResult> {
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
