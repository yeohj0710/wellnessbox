import "server-only";

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import type { B2bReportPayload } from "@/lib/b2b/report-payload";

export const PAGE_SIZE_MM = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZE_MM;
export type LayoutIntent = "preview" | "export";
export type StylePreset = "fresh" | "calm" | "focus";

export type LayoutNode = {
  id: string;
  type: "text" | "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  bold?: boolean;
  color?: string;
  fill?: string;
};

export type LayoutPage = {
  id: string;
  widthMm: number;
  heightMm: number;
  nodes: LayoutNode[];
};

export type LayoutDocument = {
  docTitle: string;
  pageSize: PageSizeKey;
  pageSizeMm: { width: number; height: number };
  intent: LayoutIntent;
  variantIndex: number;
  stylePreset: StylePreset;
  pages: LayoutPage[];
};

const STYLE_PRESET_CANDIDATES: StylePreset[] = ["fresh", "calm", "focus"];

const STYLE_COLORS: Record<StylePreset, { accent: string; accentSoft: string; text: string }> = {
  fresh: { accent: "2F80ED", accentSoft: "EAF3FF", text: "111827" },
  calm: { accent: "0F766E", accentSoft: "E8F7F5", text: "111827" },
  focus: { accent: "B45309", accentSoft: "FFF4E6", text: "111827" },
};

export function pickStylePreset(variantIndex: number) {
  return STYLE_PRESET_CANDIDATES[Math.abs(variantIndex) % STYLE_PRESET_CANDIDATES.length];
}

function metricLine(metric: B2bReportPayload["health"]["metrics"][number]) {
  const unit = metric.unit ? ` ${metric.unit}` : "";
  return `${metric.metric}: ${metric.value}${unit}`;
}

function medicationLine(
  medication: B2bReportPayload["health"]["medications"][number]
) {
  const datePart = medication.date ? ` (${medication.date})` : "";
  const hospitalPart = medication.hospitalName ? ` - ${medication.hospitalName}` : "";
  return `${medication.medicationName}${datePart}${hospitalPart}`;
}

function sectionSummaryLines(payload: B2bReportPayload) {
  const lines: string[] = [];
  const sectionCount = payload.survey.selectedSections.length;
  lines.push(`설문 선택 섹션: ${sectionCount}개`);
  if (sectionCount > 0) {
    lines.push(`섹션 키: ${payload.survey.selectedSections.join(", ")}`);
  }
  if (payload.analysis.version != null) {
    lines.push(`분석 결과 버전: v${payload.analysis.version}`);
  } else {
    lines.push("분석 결과: 미업로드");
  }
  if (payload.pharmacist.note) {
    lines.push(`약사 코멘트: ${payload.pharmacist.note}`);
  }
  return lines;
}

function compactText(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
}

export function generateLayoutFromPayload(input: {
  payload: B2bReportPayload;
  intent: LayoutIntent;
  pageSize: PageSizeKey;
  variantIndex: number;
  stylePreset: StylePreset;
  compact?: boolean;
  templateMode?: "base" | "fallback";
}) {
  const { payload } = input;
  const pageSizeMm = PAGE_SIZE_MM[input.pageSize];
  const colors = STYLE_COLORS[input.stylePreset];
  const templateMode = input.templateMode ?? "base";
  const compact = !!input.compact;
  const docTitle = `임직원 건강 레포트_${payload.meta.employeeName}`;

  const headerHeight = templateMode === "fallback" ? 24 : 28;
  const bodyStartY = headerHeight + 10;
  const lineStep = compact ? 5.2 : 6;
  const fontSizeBase = compact ? 11 : 12;

  const metrics = payload.health.metrics
    .slice(0, compact ? 6 : 8)
    .map((item) => compactText(metricLine(item), compact ? 70 : 90));
  const medications = payload.health.medications
    .slice(0, 3)
    .map((item) => compactText(medicationLine(item), compact ? 70 : 90));
  const summaryLines = sectionSummaryLines(payload).map((line) =>
    compactText(line, compact ? 70 : 90)
  );

  const leftBlockWidth = templateMode === "fallback" ? 190 : 92;
  const rightBlockWidth = templateMode === "fallback" ? 0 : 92;

  const pageNodes: LayoutNode[] = [
    {
      id: "header-bg",
      type: "rect",
      x: 10,
      y: 10,
      w: pageSizeMm.width - 20,
      h: headerHeight,
      fill: colors.accentSoft,
    },
    {
      id: "header-title",
      type: "text",
      x: 14,
      y: 14,
      w: pageSizeMm.width - 28,
      h: 8,
      text: "웰니스박스 임직원 개인 건강 레포트",
      fontSize: 16,
      bold: true,
      color: colors.accent,
    },
    {
      id: "header-sub",
      type: "text",
      x: 14,
      y: 22,
      w: pageSizeMm.width - 28,
      h: 6,
      text: `대상자: ${payload.meta.employeeName} | 생년월일: ${payload.meta.birthDateMasked} | 연락처: ${payload.meta.phoneMasked}`,
      fontSize: 10,
      color: colors.text,
    },
  ];

  if (templateMode === "fallback") {
    pageNodes.push(
      {
        id: "metrics-title-full",
        type: "text",
        x: 12,
        y: bodyStartY,
        w: leftBlockWidth,
        h: 6,
        text: "핵심 지표",
        fontSize: fontSizeBase + 1,
        bold: true,
        color: colors.accent,
      },
      ...metrics.map((line, index) => ({
        id: `metrics-line-full-${index + 1}`,
        type: "text" as const,
        x: 14,
        y: bodyStartY + 8 + index * lineStep,
        w: leftBlockWidth - 4,
        h: lineStep,
        text: line,
        fontSize: fontSizeBase,
        color: colors.text,
      })),
      {
        id: "medication-title-full",
        type: "text",
        x: 12,
        y: bodyStartY + 60,
        w: leftBlockWidth,
        h: 6,
        text: "최근 복약(최신 3건)",
        fontSize: fontSizeBase + 1,
        bold: true,
        color: colors.accent,
      },
      ...medications.map((line, index) => ({
        id: `medication-line-full-${index + 1}`,
        type: "text" as const,
        x: 14,
        y: bodyStartY + 68 + index * lineStep,
        w: leftBlockWidth - 4,
        h: lineStep,
        text: line,
        fontSize: fontSizeBase,
        color: colors.text,
      })),
      {
        id: "summary-title-full",
        type: "text",
        x: 12,
        y: bodyStartY + 98,
        w: leftBlockWidth,
        h: 6,
        text: "설문/분석/상담 요약",
        fontSize: fontSizeBase + 1,
        bold: true,
        color: colors.accent,
      },
      ...summaryLines.map((line, index) => ({
        id: `summary-line-full-${index + 1}`,
        type: "text" as const,
        x: 14,
        y: bodyStartY + 106 + index * lineStep,
        w: leftBlockWidth - 4,
        h: lineStep,
        text: line,
        fontSize: fontSizeBase,
        color: colors.text,
      }))
    );
  } else {
    pageNodes.push(
      {
        id: "metrics-title",
        type: "text",
        x: 12,
        y: bodyStartY,
        w: leftBlockWidth,
        h: 6,
        text: "핵심 지표",
        fontSize: fontSizeBase + 1,
        bold: true,
        color: colors.accent,
      },
      ...metrics.map((line, index) => ({
        id: `metrics-line-${index + 1}`,
        type: "text" as const,
        x: 14,
        y: bodyStartY + 8 + index * lineStep,
        w: leftBlockWidth - 4,
        h: lineStep,
        text: line,
        fontSize: fontSizeBase,
        color: colors.text,
      })),
      {
        id: "medication-title",
        type: "text",
        x: 12,
        y: bodyStartY + 68,
        w: leftBlockWidth,
        h: 6,
        text: "최근 복약(최신 3건)",
        fontSize: fontSizeBase + 1,
        bold: true,
        color: colors.accent,
      },
      ...medications.map((line, index) => ({
        id: `medication-line-${index + 1}`,
        type: "text" as const,
        x: 14,
        y: bodyStartY + 76 + index * lineStep,
        w: leftBlockWidth - 4,
        h: lineStep,
        text: line,
        fontSize: fontSizeBase,
        color: colors.text,
      })),
      {
        id: "summary-title",
        type: "text",
        x: 108,
        y: bodyStartY,
        w: rightBlockWidth,
        h: 6,
        text: "설문/분석/상담 요약",
        fontSize: fontSizeBase + 1,
        bold: true,
        color: colors.accent,
      },
      ...summaryLines.map((line, index) => ({
        id: `summary-line-${index + 1}`,
        type: "text" as const,
        x: 110,
        y: bodyStartY + 8 + index * lineStep,
        w: rightBlockWidth - 4,
        h: lineStep,
        text: line,
        fontSize: fontSizeBase,
        color: colors.text,
      }))
    );
  }

  const layout: LayoutDocument = {
    docTitle,
    pageSize: input.pageSize,
    pageSizeMm,
    intent: input.intent,
    variantIndex: input.variantIndex,
    stylePreset: input.stylePreset,
    pages: [
      {
        id: "page-1",
        widthMm: pageSizeMm.width,
        heightMm: pageSizeMm.height,
        nodes: pageNodes,
      },
    ],
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
