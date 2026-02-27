import "server-only";

import type { LayoutNode } from "@/lib/b2b/export/layout-types";
import type {
  LayoutNodeBounds,
  LayoutValidationIssue,
} from "@/lib/b2b/export/validation-types";

export const MM_TO_PX = 3.7795275591;

export function toBounds(node: LayoutNode): LayoutNodeBounds {
  return {
    x: Number(node.x.toFixed(2)),
    y: Number(node.y.toFixed(2)),
    w: Number(node.w.toFixed(2)),
    h: Number(node.h.toFixed(2)),
  };
}

export function intersects(a: LayoutNodeBounds, b: LayoutNodeBounds) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function overlapMetrics(a: LayoutNodeBounds, b: LayoutNodeBounds) {
  const overlapW = Math.max(
    0,
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  );
  const overlapH = Math.max(
    0,
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  );
  return {
    overlapW,
    overlapH,
    overlapArea: overlapW * overlapH,
  };
}

export function isMeaningfulOverlapMm(a: LayoutNodeBounds, b: LayoutNodeBounds) {
  const { overlapW, overlapH, overlapArea } = overlapMetrics(a, b);
  return overlapW > 0.4 && overlapH > 0.3 && overlapArea > 0.35;
}

export function estimateTextWidthMm(text: string, fontSize = 12) {
  const averageCharWidthMm = Math.max(1.8, fontSize * 0.16);
  return text.length * averageCharWidthMm;
}

export function estimateTextHeightMm(fontSize = 12) {
  return Math.max(4, fontSize * 0.42);
}

function isBackgroundLike(node: LayoutNode) {
  if (node.allowOverlap) return true;
  if (node.role === "background") return true;
  if (node.id.includes("-bg-")) return true;
  return false;
}

export function shouldIgnoreOverlap(left: LayoutNode, right: LayoutNode) {
  return isBackgroundLike(left) || isBackgroundLike(right);
}

export function buildBoundsIssue(input: {
  pageId: string;
  node: LayoutNode;
  detail: string;
}): LayoutValidationIssue {
  return {
    code: "BOUNDS",
    pageId: input.pageId,
    nodeId: input.node.id,
    detail: input.detail,
    nodeBounds: toBounds(input.node),
  };
}
