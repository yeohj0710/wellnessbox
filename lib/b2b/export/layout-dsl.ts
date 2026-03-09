import "server-only";

import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import {
  PAGE_SIZE_MM,
  type LayoutDocument,
  type LayoutIntent,
  type LayoutPage,
  type PageSizeKey,
  type StylePreset,
} from "@/lib/b2b/export/layout-types";
import {
  STYLE_COLORS,
  pickStylePreset as pickStylePresetFromConfig,
  type LayoutStyleColorTokens,
} from "@/lib/b2b/export/layout-dsl-config";
import {
  addPage,
  addNode,
  ensurePageSpace,
  type FlowContext,
  wrapLine,
} from "@/lib/b2b/export/layout-dsl-flow";
import {
  buildGuideLines,
  buildHealthLines,
  buildMedicationLines,
  buildPharmacistAndAiLines,
  buildSummaryLines,
  buildSurveyLines,
  buildTrendLines,
  compactText,
} from "@/lib/b2b/export/layout-dsl-section-lines";
import {
  clearGeneratedLayoutArtifacts as clearGeneratedLayoutArtifactsFromFile,
  persistGeneratedLayout as persistGeneratedLayoutFromFile,
} from "@/lib/b2b/export/layout-dsl-artifacts";

type TemplateMode = "base" | "fallback";
export const LAYOUT_TEMPLATE_VERSION = "2026-02-clean-v1";

type SectionInput = {
  ctx: FlowContext;
  sectionId: string;
  title: string;
  lines: string[];
  colors: LayoutStyleColorTokens;
  compact: boolean;
  maxChars: number;
};

function addHeader(input: {
  ctx: FlowContext;
  payload: B2bReportPayload;
  colors: LayoutStyleColorTokens;
  compact: boolean;
}) {
  const { ctx, payload, colors, compact } = input;
  const x = ctx.margin;
  const y = ctx.margin;
  const w = ctx.widthMm - ctx.margin * 2;
  const h = compact ? 24 : 28;

  addNode(ctx, {
    id: `header-bg-${ctx.pages.length}`,
    type: "rect",
    role: "background",
    allowOverlap: true,
    x,
    y,
    w,
    h,
    fill: colors.accentSoft,
  });

  addNode(ctx, {
    id: `header-title-${ctx.pages.length}`,
    type: "text",
    role: "content",
    x: x + 4,
    y: y + 3.2,
    w: w - 8,
    h: 7,
    text: "웰니스박스 임직원 건강 리포트",
    fontSize: compact ? 15 : 16,
    bold: true,
    color: colors.accent,
  });

  const subY = y + (compact ? 10.2 : 11);
  const subH = compact ? 4.6 : 5.2;
  const sub2Y = subY + subH + (compact ? 0.9 : 1.1);
  const sub2H = compact ? 4.3 : 4.8;

  addNode(ctx, {
    id: `header-sub-${ctx.pages.length}`,
    type: "text",
    role: "content",
    x: x + 4,
    y: subY,
    w: w - 8,
    h: subH,
    text: `대상자 ${payload.meta.employeeName} | 기간 ${payload.meta.periodKey} | 생성 ${new Date(
      payload.meta.generatedAt
    ).toLocaleString("ko-KR")}`,
    fontSize: compact ? 9.2 : 9.8,
    color: colors.text,
  });

  addNode(ctx, {
    id: `header-sub-2-${ctx.pages.length}`,
    type: "text",
    role: "content",
    x: x + 4,
    y: sub2Y,
    w: w - 8,
    h: sub2H,
    text: `생년월일 ${payload.meta.birthDateMasked} | 연락처 ${payload.meta.phoneMasked} | 리포트 버전 v${payload.meta.variantIndex}`,
    fontSize: compact ? 8.7 : 9.1,
    color: colors.muted,
  });

  ctx.cursorY = y + h + 4;
}

function addSection(input: SectionInput) {
  addSectionPaginated(input);
}

function addSectionPaginated(input: SectionInput) {
  const { ctx, sectionId, title, lines, colors, compact, maxChars } = input;
  const wrapped = lines.flatMap((line) => wrapLine(line, maxChars));
  const titleHeight = compact ? 6.8 : 7.2;
  const lineHeight = compact ? 4.9 : 5.2;
  const lineStep = compact ? 5.4 : 5.8;
  const paddingY = compact ? 3.2 : 3.7;
  const safeLines = wrapped.length > 0 ? wrapped : ["표시할 데이터가 없습니다."];
  const minLineCount = 1;
  const minBlockHeight = paddingY * 2 + titleHeight + minLineCount * lineStep + 0.4;
  const pageBottom = () => ctx.heightMm - ctx.margin;
  const maxLinesForCurrentPage = () => {
    const availableHeight = pageBottom() - ctx.cursorY;
    const contentHeight = availableHeight - (paddingY * 2 + titleHeight + 0.4);
    if (contentHeight <= 0) return 0;
    return Math.floor(contentHeight / lineStep);
  };

  const x = ctx.margin;
  const w = ctx.widthMm - ctx.margin * 2;
  const contentX = x + 4;
  const contentW = w - 8;
  let lineCursor = 0;

  while (lineCursor < safeLines.length) {
    ensurePageSpace(ctx, minBlockHeight + 3.6);
    let linesPerChunk = maxLinesForCurrentPage();
    if (linesPerChunk < minLineCount) {
      addPage(ctx);
      linesPerChunk = maxLinesForCurrentPage();
    }
    if (linesPerChunk < minLineCount) break;

    const chunkLines = safeLines.slice(lineCursor, lineCursor + linesPerChunk);
    const y = ctx.cursorY;
    const blockHeight = paddingY * 2 + titleHeight + chunkLines.length * lineStep + 0.4;
    const blockToken = `${ctx.pages.length}-${lineCursor + 1}`;

    addNode(ctx, {
      id: `${sectionId}-bg-${blockToken}`,
      type: "rect",
      role: "background",
      allowOverlap: true,
      x,
      y,
      w,
      h: blockHeight,
      fill: colors.card,
    });

    addNode(ctx, {
      id: `${sectionId}-title-${blockToken}`,
      type: "text",
      role: "content",
      x: contentX,
      y: y + paddingY,
      w: contentW,
      h: titleHeight,
      text: title,
      fontSize: compact ? 11 : 11.4,
      bold: true,
      color: colors.accent,
    });

    chunkLines.forEach((line, index) => {
      addNode(ctx, {
        id: `${sectionId}-line-${lineCursor + index + 1}-${ctx.pages.length}`,
        type: "text",
        role: "line",
        x: contentX,
        y: y + paddingY + titleHeight + 1 + index * lineStep,
        w: contentW,
        h: lineHeight,
        text: line,
        fontSize: compact ? 9.1 : 9.5,
        color: colors.text,
      });
    });

    lineCursor += chunkLines.length;
    ctx.cursorY = y + blockHeight + 3.6;
  }
}

export function pickStylePreset(variantIndex: number) {
  return pickStylePresetFromConfig(variantIndex);
}

export function generateLayoutFromPayload(input: {
  payload: B2bReportPayload;
  intent: LayoutIntent;
  pageSize: PageSizeKey;
  variantIndex: number;
  stylePreset: StylePreset;
  compact?: boolean;
  templateMode?: TemplateMode;
}) {
  const { payload } = input;
  const pageSizeMm = PAGE_SIZE_MM[input.pageSize];
  const colors = STYLE_COLORS[input.stylePreset];
  const compact = input.compact === true;
  const margin = input.templateMode === "fallback" ? 11 : 12;
  const maxChars = input.templateMode === "fallback" ? 46 : compact ? 54 : 60;

  const pages: LayoutPage[] = [
    {
      id: "page-1",
      widthMm: pageSizeMm.width,
      heightMm: pageSizeMm.height,
      nodes: [],
    },
  ];
  const ctx: FlowContext = {
    pages,
    cursorY: margin,
    margin,
    widthMm: pageSizeMm.width,
    heightMm: pageSizeMm.height,
  };

  addHeader({ ctx, payload, colors, compact });

  addSection({
    ctx,
    sectionId: "summary",
    title: "종합 점수 및 핵심 이슈",
    lines: buildSummaryLines(payload),
    colors,
    compact,
    maxChars,
  });
  addSection({
    ctx,
    sectionId: "top-issues",
    title: "핵심 이슈 TOP3",
    lines:
      payload.analysis.summary.topIssues.length > 0
        ? payload.analysis.summary.topIssues
            .slice(0, 3)
            .map((issue, index) => `${index + 1}. ${issue.title} (${Math.round(issue.score)}점)`)
        : ["핵심 이슈가 아직 계산되지 않았습니다."],
    colors,
    compact,
    maxChars,
  });
  addSection({
    ctx,
    sectionId: "health",
    title: "건강검진 지표 요약",
    lines: buildHealthLines(payload),
    colors,
    compact,
    maxChars,
  });
  addSection({
    ctx,
    sectionId: "medication",
    title: "복약 연동 요약",
    lines: buildMedicationLines(payload),
    colors,
    compact,
    maxChars,
  });
  addSection({
    ctx,
    sectionId: "survey",
    title: "설문 점수 요약",
    lines: buildSurveyLines(payload),
    colors,
    compact,
    maxChars,
  });
  addSection({
    ctx,
    sectionId: "guide",
    title: "이번 달 실천 가이드",
    lines: buildGuideLines(payload),
    colors,
    compact,
    maxChars,
  });
  addSection({
    ctx,
    sectionId: "pharmacist-ai",
    title: "약사 코멘트 및 AI 종합평가",
    lines: buildPharmacistAndAiLines(payload).map((line) => compactText(line, 150)),
    colors,
    compact,
    maxChars,
  });
  addSection({
    ctx,
    sectionId: "trend",
    title: "월별 추이",
    lines: buildTrendLines(payload),
    colors,
    compact,
    maxChars,
  });

  const layout: LayoutDocument = {
    docTitle: `임직원건강리포트_${payload.meta.employeeName}_${payload.meta.periodKey}`,
    pageSize: input.pageSize,
    pageSizeMm,
    intent: input.intent,
    variantIndex: input.variantIndex,
    stylePreset: input.stylePreset,
    layoutVersion: LAYOUT_TEMPLATE_VERSION,
    pages: ctx.pages,
  };

  return layout;
}

export function persistGeneratedLayout(layout: LayoutDocument) {
  return persistGeneratedLayoutFromFile(layout);
}

export function clearGeneratedLayoutArtifacts(existingGeneratedDir?: string) {
  return clearGeneratedLayoutArtifactsFromFile(existingGeneratedDir);
}
