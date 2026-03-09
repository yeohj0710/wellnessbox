import "server-only";

import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import {
  clearGeneratedLayoutArtifacts,
  generateLayoutFromPayload,
  persistGeneratedLayout,
} from "@/lib/b2b/export/layout-dsl";
import type {
  LayoutDocument,
  LayoutIntent,
  PageSizeKey,
  StylePreset,
} from "@/lib/b2b/export/layout-types";
import {
  buildExportPptxFilename,
  cloneExportPayload,
  resolveExportStylePresetCandidates,
  shortenExportPayloadText,
} from "@/lib/b2b/export/pipeline-support";
import { renderLayoutToPptxBuffer } from "@/lib/b2b/export/pptx";
import { validateLayout } from "@/lib/b2b/export/validation";
import { dedupeLayoutValidationIssues } from "@/lib/b2b/export/validation-issues";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";

export type AutofixStage = "base" | "shorten" | "compact" | "fallback";

export type ValidationAuditEntry = {
  stylePreset: StylePreset;
  stage: AutofixStage;
  ok: boolean;
  staticIssueCount: number;
  runtimeIssueCount: number;
  mergedIssueCount: number;
  dedupedIssueCount: number;
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

async function runValidation(
  stage: AutofixStage,
  stylePreset: StylePreset,
  layout: LayoutDocument
) {
  const result = await validateLayout(layout);
  const mergedIssues = [...result.staticIssues, ...result.runtimeIssues];
  const issues = dedupeLayoutValidationIssues(mergedIssues);
  const blockingIssueCount = issues.filter((issue) => issue.code !== "TEXT_OVERFLOW").length;
  return {
    result,
    audit: {
      stylePreset,
      stage,
      ok: result.ok,
      staticIssueCount: result.staticIssues.length,
      runtimeIssueCount: result.runtimeIssues.length,
      mergedIssueCount: mergedIssues.length,
      dedupedIssueCount: issues.length,
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
  const stylePresetCandidates = resolveExportStylePresetCandidates(input.variantIndex);
  const preferredStylePreset =
    input.stylePreset && stylePresetCandidates.includes(input.stylePreset)
      ? input.stylePreset
      : stylePresetCandidates[0];
  const stylePresetOrder = [
    preferredStylePreset,
    ...stylePresetCandidates.filter((preset) => preset !== preferredStylePreset),
  ];

  const basePayload = cloneExportPayload(input.payload);
  const shortenedPayload = shortenExportPayloadText(basePayload);
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
        validation.audit.dedupedIssueCount + validation.audit.blockingIssueCount * 2;
      if (!bestNonBlockingAttempt || issueScore < bestNonBlockingAttempt.issueScore) {
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
    const overrideLayout = cloneExportPayload(input.layoutOverride);
    const stylePresetCandidates = resolveExportStylePresetCandidates(input.variantIndex);
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
      const filename = buildExportPptxFilename({
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
  const filename = buildExportPptxFilename({
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
