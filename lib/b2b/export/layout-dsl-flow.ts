import type { LayoutNode, LayoutPage } from "@/lib/b2b/export/layout-types";

export type FlowContext = {
  pages: LayoutPage[];
  cursorY: number;
  margin: number;
  widthMm: number;
  heightMm: number;
};

export function normalizeCompact(text: string) {
  return text.replace(/\s+/g, "").trim();
}

export function maybeAppendUnit(value: string, unit: string | null) {
  if (!unit) return value;
  const valueCompact = normalizeCompact(value).toLowerCase();
  const unitCompact = normalizeCompact(unit).toLowerCase();
  if (valueCompact.includes(unitCompact)) return value;
  return `${value} ${unit}`.trim();
}

export function wrapLine(line: string, maxChars: number) {
  const compact = line.replace(/\s+/g, " ").trim();
  if (!compact) return [];
  if (compact.length <= maxChars) return [compact];
  const chunks: string[] = [];
  let current = "";
  for (const token of compact.split(" ")) {
    if (!token) continue;
    const candidate = current ? `${current} ${token}` : token;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (token.length <= maxChars) {
      current = token;
      continue;
    }
    for (let index = 0; index < token.length; index += maxChars) {
      chunks.push(token.slice(index, index + maxChars));
    }
    current = "";
  }
  if (current) chunks.push(current);
  return chunks;
}

export function addNode(ctx: FlowContext, node: LayoutNode) {
  const page = ctx.pages[ctx.pages.length - 1];
  page.nodes.push(node);
}

export function addPage(ctx: FlowContext) {
  const nextId = ctx.pages.length + 1;
  ctx.pages.push({
    id: `page-${nextId}`,
    widthMm: ctx.widthMm,
    heightMm: ctx.heightMm,
    nodes: [],
  });
  ctx.cursorY = ctx.margin;
}

export function ensurePageSpace(ctx: FlowContext, requiredHeight: number) {
  const maxBottom = ctx.heightMm - ctx.margin;
  if (ctx.cursorY + requiredHeight <= maxBottom) return;
  addPage(ctx);
}
