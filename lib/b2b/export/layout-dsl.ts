import "server-only";

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import {
  PAGE_SIZE_MM,
  type LayoutDocument,
  type LayoutIntent,
  type LayoutNode,
  type LayoutPage,
  type PageSizeKey,
  type StylePreset,
} from "@/lib/b2b/export/layout-types";

type TemplateMode = "base" | "fallback";

const STYLE_PRESET_CANDIDATES: StylePreset[] = ["fresh", "calm", "focus"];

const STYLE_COLORS: Record<
  StylePreset,
  {
    accent: string;
    accentSoft: string;
    text: string;
    muted: string;
    card: string;
    cardBorder: string;
    danger: string;
  }
> = {
  fresh: {
    accent: "1D4ED8",
    accentSoft: "EAF2FF",
    text: "0F172A",
    muted: "475569",
    card: "F8FAFC",
    cardBorder: "D8E5FF",
    danger: "B91C1C",
  },
  calm: {
    accent: "0F766E",
    accentSoft: "E6F6F4",
    text: "0F172A",
    muted: "475569",
    card: "F8FAFC",
    cardBorder: "BEE7DF",
    danger: "B91C1C",
  },
  focus: {
    accent: "9A3412",
    accentSoft: "FFF3E8",
    text: "0F172A",
    muted: "475569",
    card: "FFFBF5",
    cardBorder: "F7D7B5",
    danger: "B91C1C",
  },
};

type FlowContext = {
  pages: LayoutPage[];
  cursorY: number;
  margin: number;
  widthMm: number;
  heightMm: number;
};

type SectionInput = {
  ctx: FlowContext;
  sectionId: string;
  title: string;
  lines: string[];
  colors: (typeof STYLE_COLORS)[StylePreset];
  compact: boolean;
  maxChars: number;
};

function compactText(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
}

function normalizeCompact(text: string) {
  return text.replace(/\s+/g, "").trim();
}

function maybeAppendUnit(value: string, unit: string | null) {
  if (!unit) return value;
  const valueCompact = normalizeCompact(value).toLowerCase();
  const unitCompact = normalizeCompact(unit).toLowerCase();
  if (valueCompact.includes(unitCompact)) return value;
  return `${value} ${unit}`.trim();
}

function wrapLine(line: string, maxChars: number) {
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

function addNode(ctx: FlowContext, node: LayoutNode) {
  const page = ctx.pages[ctx.pages.length - 1];
  page.nodes.push(node);
}

function addPage(ctx: FlowContext) {
  const nextId = ctx.pages.length + 1;
  ctx.pages.push({
    id: `page-${nextId}`,
    widthMm: ctx.widthMm,
    heightMm: ctx.heightMm,
    nodes: [],
  });
  ctx.cursorY = ctx.margin;
}

function ensurePageSpace(ctx: FlowContext, requiredHeight: number) {
  const maxBottom = ctx.heightMm - ctx.margin;
  if (ctx.cursorY + requiredHeight <= maxBottom) return;
  addPage(ctx);
}

function addHeader(input: {
  ctx: FlowContext;
  payload: B2bReportPayload;
  colors: (typeof STYLE_COLORS)[StylePreset];
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

  addNode(ctx, {
    id: `header-sub-${ctx.pages.length}`,
    type: "text",
    role: "content",
    x: x + 4,
    y: y + 11,
    w: w - 8,
    h: 8,
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
    y: y + 16.4,
    w: w - 8,
    h: 7,
    text: `생년월일 ${payload.meta.birthDateMasked} | 연락처 ${payload.meta.phoneMasked} | 리포트 버전 v${payload.meta.variantIndex}`,
    fontSize: compact ? 8.7 : 9.1,
    color: colors.muted,
  });

  ctx.cursorY = y + h + 4;
}

function addSection(input: SectionInput) {
  const { ctx, sectionId, title, lines, colors, compact, maxChars } = input;
  const wrapped = lines.flatMap((line) => wrapLine(line, maxChars));
  const titleHeight = compact ? 6.8 : 7.2;
  const lineHeight = compact ? 4.9 : 5.2;
  const lineStep = compact ? 5.4 : 5.8;
  const paddingY = compact ? 3.2 : 3.7;
  const safeLines = wrapped.length > 0 ? wrapped : ["표시할 데이터가 없습니다."];
  const blockHeight = paddingY * 2 + titleHeight + safeLines.length * lineStep + 0.4;

  ensurePageSpace(ctx, blockHeight + 3.6);

  const x = ctx.margin;
  const y = ctx.cursorY;
  const w = ctx.widthMm - ctx.margin * 2;
  const contentX = x + 4;
  const contentW = w - 8;

  addNode(ctx, {
    id: `${sectionId}-bg-${ctx.pages.length}`,
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
    id: `${sectionId}-title-${ctx.pages.length}`,
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

  safeLines.forEach((line, index) => {
    addNode(ctx, {
      id: `${sectionId}-line-${index + 1}-${ctx.pages.length}`,
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

  ctx.cursorY = y + blockHeight + 3.6;
}

function buildSummaryLines(payload: B2bReportPayload) {
  const lines = [
    `종합 점수 ${Math.round(payload.analysis.summary.overallScore)}점`,
    `설문 ${Math.round(payload.analysis.summary.surveyScore)}점 / 검진 ${Math.round(
      payload.analysis.summary.healthScore
    )}점 / 복약 ${Math.round(payload.analysis.summary.medicationScore)}점`,
    `리스크 레벨: ${payload.analysis.summary.riskLevel}`,
  ];
  if (payload.analysis.summary.topIssues.length > 0) {
    lines.push(
      `상위 이슈 TOP3: ${payload.analysis.summary.topIssues
        .slice(0, 3)
        .map((item) => `${item.title}(${Math.round(item.score)}점)`)
        .join(", ")}`
    );
  }
  return lines;
}

function buildHealthLines(payload: B2bReportPayload) {
  const lines = [
    `건강검진 연동 시각: ${
      payload.health.fetchedAt
        ? new Date(payload.health.fetchedAt).toLocaleString("ko-KR")
        : "없음"
    }`,
    ...payload.health.coreMetrics.slice(0, 7).map((metric) => {
      const value = maybeAppendUnit(metric.value, metric.unit);
      return `${metric.label}: ${value} (${metric.status})`;
    }),
  ];
  if (payload.health.riskFlags.length > 0) {
    lines.push(
      `이상/주의 플래그: ${payload.health.riskFlags
        .slice(0, 4)
        .map((item) => `${item.label}(${item.severity})`)
        .join(", ")}`
    );
  }
  return lines;
}

function buildMedicationLines(payload: B2bReportPayload) {
  const base = [`복약 상태: ${payload.health.medicationStatus.type}`];
  if (payload.health.medicationStatus.message) {
    base.push(payload.health.medicationStatus.message);
  }
  if (payload.health.medications.length === 0) {
    base.push("최근 복약 데이터가 없습니다.");
    return base;
  }
  return [
    ...base,
    ...payload.health.medications.slice(0, 3).map((item) => {
      const dateText = item.date ? ` / ${item.date}` : "";
      const dayText = item.dosageDay ? ` / ${item.dosageDay}` : "";
      const hospText = item.hospitalName ? ` / ${item.hospitalName}` : "";
      return `${item.medicationName}${dateText}${dayText}${hospText}`;
    }),
  ];
}

function buildSurveyLines(payload: B2bReportPayload) {
  const lines = [
    payload.survey.templateVersion
      ? `설문 템플릿 버전: v${payload.survey.templateVersion}`
      : "설문 템플릿 버전: 미지정",
    `선택 섹션: ${payload.survey.selectedSections.join(", ") || "없음"}`,
    `설문 종합 점수: ${Math.round(payload.survey.overallScore)}점`,
    `응답 수: ${payload.survey.answers.length}개`,
  ];
  lines.push(
    ...payload.survey.sectionScores
      .slice(0, 6)
      .map(
        (section) =>
          `${section.sectionTitle}: ${Math.round(section.score)}점 (${section.answeredCount}/${section.questionCount})`
      )
  );
  return lines;
}

function buildPharmacistAndAiLines(payload: B2bReportPayload) {
  const lines = [
    `약사 요약: ${payload.pharmacist.summary || payload.pharmacist.note || "입력 없음"}`,
    `권장: ${payload.pharmacist.recommendations || "입력 없음"}`,
    `주의: ${payload.pharmacist.cautions || "입력 없음"}`,
  ];
  if (payload.analysis.aiEvaluation) {
    lines.push(`AI 종합평가: ${payload.analysis.aiEvaluation.summary}`);
    lines.push(`한 달 실천 가이드: ${payload.analysis.aiEvaluation.monthlyGuide}`);
    lines.push(
      ...payload.analysis.aiEvaluation.actionItems
        .slice(0, 2)
        .map((item) => `실천 항목: ${item}`)
    );
  }
  return lines;
}

function buildTrendLines(payload: B2bReportPayload) {
  if (payload.analysis.trend.months.length === 0) {
    return ["월별 추이 데이터가 없습니다."];
  }
  return payload.analysis.trend.months.map(
    (month) =>
      `${month.periodKey}: 종합 ${Math.round(month.overallScore)} / 설문 ${Math.round(
        month.surveyScore
      )} / 검진 ${Math.round(month.healthScore)}`
  );
}

export function pickStylePreset(variantIndex: number) {
  return STYLE_PRESET_CANDIDATES[Math.abs(variantIndex) % STYLE_PRESET_CANDIDATES.length];
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
    title: "복약 연동 요약 (최신 3건)",
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
    pages: ctx.pages,
  };

  return layout;
}

export function persistGeneratedLayout(layout: LayoutDocument) {
  const generatedDir = path.join(process.cwd(), "src", "generated");
  mkdirSync(generatedDir, { recursive: true });

  clearGeneratedLayoutArtifacts(generatedDir);

  const outputPath = path.join(generatedDir, "layout.json");
  writeFileSync(outputPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");
  return outputPath;
}

export function clearGeneratedLayoutArtifacts(existingGeneratedDir?: string) {
  const generatedDir =
    existingGeneratedDir ?? path.join(process.cwd(), "src", "generated");
  mkdirSync(generatedDir, { recursive: true });
  for (const entry of readdirSync(generatedDir)) {
    if (entry.startsWith("layout.")) {
      rmSync(path.join(generatedDir, entry), { force: true });
    }
  }
}
