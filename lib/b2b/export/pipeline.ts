import "server-only";

import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import { REPORT_STYLE_CANDIDATES } from "@/lib/b2b/report-design";
import {
  clearGeneratedLayoutArtifacts,
  generateLayoutFromPayload,
  persistGeneratedLayout,
  pickStylePreset,
} from "@/lib/b2b/export/layout-dsl";
import type {
  LayoutDocument,
  LayoutIntent,
  PageSizeKey,
  StylePreset,
} from "@/lib/b2b/export/layout-types";
import { renderLayoutToPptxBuffer } from "@/lib/b2b/export/pptx";
import { validateLayout } from "@/lib/b2b/export/validation";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";

export type AutofixStage = "base" | "shorten" | "compact" | "fallback";

export type ValidationAuditEntry = {
  stylePreset: StylePreset;
  stage: AutofixStage;
  ok: boolean;
  staticIssueCount: number;
  runtimeIssueCount: number;
  runtimeEngine: string;
  blockingIssueCount: number;
  issues: LayoutValidationIssue[];
};

export type ExportAudit = {
  generatedAt: string;
  intent: LayoutIntent;
  pageSize: PageSizeKey;
  variantIndex: number;
  stylePresetCandidates: StylePreset[];
  selectedStylePreset: StylePreset;
  validation: ValidationAuditEntry[];
  selectedStage: AutofixStage | null;
  pageCount: number;
};

type PipelineInput = {
  payload: B2bReportPayload;
  intent: LayoutIntent;
  pageSize: PageSizeKey;
  variantIndex: number;
  stylePreset?: StylePreset;
};

type ExportPipelineInput = {
  payload: B2bReportPayload;
  pageSize: PageSizeKey;
  variantIndex: number;
  stylePreset?: StylePreset;
  layoutOverride?: LayoutDocument | null;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function shortenText(text: string | null | undefined, max = 90) {
  if (!text) return text ?? null;
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function shortenPayloadText(payload: B2bReportPayload) {
  const next = deepClone(payload);
  next.pharmacist.note = shortenText(next.pharmacist.note, 70);
  next.pharmacist.recommendations = shortenText(next.pharmacist.recommendations, 70);
  next.pharmacist.cautions = shortenText(next.pharmacist.cautions, 70);
  return next;
}

function resolveStylePresetCandidates(variantIndex: number): StylePreset[] {
  const base = pickStylePreset(variantIndex);
  const all = [...REPORT_STYLE_CANDIDATES] as StylePreset[];
  return [base, ...all.filter((preset) => preset !== base)].slice(0, 3);
}

function buildPptxFilename(input: {
  docTitle: string;
  pageSize: PageSizeKey;
  variantIndex: number;
  pageCount: number;
}) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${yyyy}${mm}${dd}`;
  const safeTitle = input.docTitle
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${safeTitle}_${input.pageSize}_${today}_v${input.variantIndex}_${input.pageCount}p.pptx`;
}

async function runValidation(
  stage: AutofixStage,
  stylePreset: StylePreset,
  layout: LayoutDocument
) {
  const result = await validateLayout(layout);
  const issues = [...result.staticIssues, ...result.runtimeIssues];
  const blockingIssueCount = issues.filter((issue) => issue.code !== "TEXT_OVERFLOW").length;
  return {
    result,
    audit: {
      stylePreset,
      stage,
      ok: result.ok,
      staticIssueCount: result.staticIssues.length,
      runtimeIssueCount: result.runtimeIssues.length,
      runtimeEngine: result.runtimeEngine,
      blockingIssueCount,
      issues,
    } satisfies ValidationAuditEntry,
  };
}

function canPromoteAttempt(validation: Awaited<ReturnType<typeof runValidation>>) {
  if (validation.result.ok) return true;
  return validation.audit.blockingIssueCount === 0;
}

export async function runB2bLayoutPipeline(input: PipelineInput) {
  const stylePresetCandidates = resolveStylePresetCandidates(input.variantIndex);
  const preferredStylePreset =
    input.stylePreset && stylePresetCandidates.includes(input.stylePreset)
      ? input.stylePreset
      : stylePresetCandidates[0];
  const stylePresetOrder = [
    preferredStylePreset,
    ...stylePresetCandidates.filter((preset) => preset !== preferredStylePreset),
  ];

  const basePayload = deepClone(input.payload);
  const shortenedPayload = shortenPayloadText(basePayload);
  const stageSpecs: Array<{
    stage: AutofixStage;
    payload: B2bReportPayload;
    compact: boolean;
    templateMode: "base" | "fallback";
  }> = [
    { stage: "base", payload: basePayload, compact: false, templateMode: "base" },
    { stage: "shorten", payload: shortenedPayload, compact: false, templateMode: "base" },
    { stage: "compact", payload: shortenedPayload, compact: true, templateMode: "base" },
    { stage: "fallback", payload: shortenedPayload, compact: true, templateMode: "fallback" },
  ];

  const attempts: Array<{
    stage: AutofixStage;
    stylePreset: StylePreset;
    layout: LayoutDocument;
    validation: Awaited<ReturnType<typeof runValidation>>;
  }> = [];
  let bestNonBlockingAttempt:
    | {
        stage: AutofixStage;
        stylePreset: StylePreset;
        layout: LayoutDocument;
        validation: Awaited<ReturnType<typeof runValidation>>;
        issueScore: number;
      }
    | null = null;
  for (const stylePreset of stylePresetOrder) {
    for (const spec of stageSpecs) {
      const layout = generateLayoutFromPayload({
        payload: spec.payload,
        intent: input.intent,
        pageSize: input.pageSize,
        variantIndex: input.variantIndex,
        stylePreset,
        compact: spec.compact,
        templateMode: spec.templateMode,
      });
      const validation = await runValidation(spec.stage, stylePreset, layout);
      attempts.push({ stage: spec.stage, stylePreset, layout, validation });
      if (validation.result.ok) {
        const audit: ExportAudit = {
          generatedAt: new Date().toISOString(),
          intent: input.intent,
          pageSize: input.pageSize,
          variantIndex: input.variantIndex,
          stylePresetCandidates,
          selectedStylePreset: stylePreset,
          validation: attempts.map((attempt) => attempt.validation.audit),
          selectedStage: spec.stage,
          pageCount: layout.pages.length,
        };

        return {
          ok: true as const,
          layout,
          audit,
          selectedStage: spec.stage,
        };
      }

      if (!canPromoteAttempt(validation)) continue;

      const issueScore =
        validation.audit.staticIssueCount + validation.audit.runtimeIssueCount * 2;
      if (
        !bestNonBlockingAttempt ||
        issueScore < bestNonBlockingAttempt.issueScore
      ) {
        bestNonBlockingAttempt = {
          stage: spec.stage,
          stylePreset,
          layout,
          validation,
          issueScore,
        };
      }
    }
  }

  if (bestNonBlockingAttempt) {
    const audit: ExportAudit = {
      generatedAt: new Date().toISOString(),
      intent: input.intent,
      pageSize: input.pageSize,
      variantIndex: input.variantIndex,
      stylePresetCandidates,
      selectedStylePreset: bestNonBlockingAttempt.stylePreset,
      validation: attempts.map((attempt) => attempt.validation.audit),
      selectedStage: bestNonBlockingAttempt.stage,
      pageCount: bestNonBlockingAttempt.layout.pages.length,
    };

    return {
      ok: true as const,
      layout: bestNonBlockingAttempt.layout,
      audit,
      selectedStage: bestNonBlockingAttempt.stage,
    };
  }

  const audit: ExportAudit = {
    generatedAt: new Date().toISOString(),
    intent: input.intent,
    pageSize: input.pageSize,
    variantIndex: input.variantIndex,
    stylePresetCandidates,
    selectedStylePreset: preferredStylePreset,
    validation: attempts.map((attempt) => attempt.validation.audit),
    selectedStage: null,
    pageCount: attempts.at(-1)?.layout.pages.length ?? 0,
  };

  return {
    ok: false as const,
    audit,
    issues: audit.validation.flatMap((entry) => entry.issues),
  };
}

export async function runB2bExportPipeline(input: ExportPipelineInput) {
  clearGeneratedLayoutArtifacts();

  if (input.layoutOverride) {
    const overrideLayout = deepClone(input.layoutOverride);
    const stylePresetCandidates = resolveStylePresetCandidates(input.variantIndex);
    const fallbackPreset =
      input.stylePreset && stylePresetCandidates.includes(input.stylePreset)
        ? input.stylePreset
        : stylePresetCandidates[0];
    const selectedStylePreset = stylePresetCandidates.includes(overrideLayout.stylePreset)
      ? overrideLayout.stylePreset
      : fallbackPreset;
    const validation = await runValidation("base", selectedStylePreset, overrideLayout);
    if (canPromoteAttempt(validation)) {
      persistGeneratedLayout(overrideLayout);
      const pptxBuffer = await renderLayoutToPptxBuffer(overrideLayout);
      const filename = buildPptxFilename({
        docTitle: overrideLayout.docTitle,
        pageSize: input.pageSize,
        variantIndex: input.variantIndex,
        pageCount: overrideLayout.pages.length,
      });
      const audit: ExportAudit = {
        generatedAt: new Date().toISOString(),
        intent: "export",
        pageSize: input.pageSize,
        variantIndex: input.variantIndex,
        stylePresetCandidates,
        selectedStylePreset,
        validation: [validation.audit],
        selectedStage: "base",
        pageCount: overrideLayout.pages.length,
      };

      return {
        ok: true as const,
        layout: overrideLayout,
        filename,
        pptxBuffer,
        audit,
      };
    }
  }

  const layoutResult = await runB2bLayoutPipeline({
    payload: input.payload,
    intent: "export",
    pageSize: input.pageSize,
    variantIndex: input.variantIndex,
    stylePreset: input.stylePreset,
  });
  if (!layoutResult.ok) {
    return layoutResult;
  }

  persistGeneratedLayout(layoutResult.layout);
  const pptxBuffer = await renderLayoutToPptxBuffer(layoutResult.layout);
  const filename = buildPptxFilename({
    docTitle: layoutResult.layout.docTitle,
    pageSize: input.pageSize,
    variantIndex: input.variantIndex,
    pageCount: layoutResult.layout.pages.length,
  });

  return {
    ok: true as const,
    layout: layoutResult.layout,
    filename,
    pptxBuffer,
    audit: layoutResult.audit,
  };
}
