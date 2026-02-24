import "server-only";

import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import {
  clearGeneratedLayoutArtifacts,
  generateLayoutFromPayload,
  persistGeneratedLayout,
  pickStylePreset,
  type LayoutDocument,
  type PageSizeKey,
  type StylePreset,
} from "@/lib/b2b/export/layout-dsl";
import { renderLayoutToPptxBuffer } from "@/lib/b2b/export/pptx";
import { validateLayout, type LayoutValidationIssue } from "@/lib/b2b/export/validation";

type AutofixStage = "base" | "shorten" | "compact" | "fallback";

type ValidationAuditEntry = {
  stage: AutofixStage;
  ok: boolean;
  staticIssueCount: number;
  runtimeIssueCount: number;
  runtimeEngine: string;
  issues: LayoutValidationIssue[];
};

export type ExportAudit = {
  generatedAt: string;
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
  pageSize: PageSizeKey;
  variantIndex: number;
  stylePreset?: StylePreset;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function shortenPayloadText(payload: B2bReportPayload) {
  const next = deepClone(payload);

  const shorten = (text: string | null | undefined, max = 90) => {
    if (!text) return text ?? null;
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1))}…`;
  };

  next.pharmacist.note = shorten(next.pharmacist.note, 70);
  next.pharmacist.recommendations = shorten(next.pharmacist.recommendations, 70);
  next.pharmacist.cautions = shorten(next.pharmacist.cautions, 70);
  return next;
}

function resolveStylePresetCandidates(variantIndex: number): StylePreset[] {
  const base = pickStylePreset(variantIndex);
  const candidates: StylePreset[] = [base];
  const all: StylePreset[] = ["fresh", "calm", "focus"];
  for (const preset of all) {
    if (!candidates.includes(preset)) candidates.push(preset);
  }
  return candidates.slice(0, 3);
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

async function runValidation(stage: AutofixStage, layout: LayoutDocument) {
  const result = await validateLayout(layout);
  const issues = [...result.staticIssues, ...result.runtimeIssues];
  return {
    result,
    audit: {
      stage,
      ok: result.ok,
      staticIssueCount: result.staticIssues.length,
      runtimeIssueCount: result.runtimeIssues.length,
      runtimeEngine: result.runtimeEngine,
      issues,
    } satisfies ValidationAuditEntry,
  };
}

export async function runB2bExportPipeline(input: PipelineInput) {
  clearGeneratedLayoutArtifacts();

  const stylePresetCandidates = resolveStylePresetCandidates(input.variantIndex);
  const selectedStylePreset = input.stylePreset ?? stylePresetCandidates[0];

  const basePayload = deepClone(input.payload);
  const shortenedPayload = shortenPayloadText(basePayload);

  const attempts: Array<{
    stage: AutofixStage;
    layout: LayoutDocument;
    validation: Awaited<ReturnType<typeof runValidation>>;
  }> = [];

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

  for (const spec of stageSpecs) {
    const layout = generateLayoutFromPayload({
      payload: spec.payload,
      intent: "export",
      pageSize: input.pageSize,
      variantIndex: input.variantIndex,
      stylePreset: selectedStylePreset,
      compact: spec.compact,
      templateMode: spec.templateMode,
    });
    const validation = await runValidation(spec.stage, layout);
    attempts.push({ stage: spec.stage, layout, validation });
    if (validation.result.ok) {
      persistGeneratedLayout(layout);
      const pptxBuffer = await renderLayoutToPptxBuffer(layout);
      const filename = buildPptxFilename({
        docTitle: layout.docTitle,
        pageSize: input.pageSize,
        variantIndex: input.variantIndex,
        pageCount: layout.pages.length,
      });
      const audit: ExportAudit = {
        generatedAt: new Date().toISOString(),
        pageSize: input.pageSize,
        variantIndex: input.variantIndex,
        stylePresetCandidates,
        selectedStylePreset,
        validation: attempts.map((attempt) => attempt.validation.audit),
        selectedStage: spec.stage,
        pageCount: layout.pages.length,
      };
      return {
        ok: true as const,
        layout,
        filename,
        pptxBuffer,
        audit,
      };
    }
  }

  const audit: ExportAudit = {
    generatedAt: new Date().toISOString(),
    pageSize: input.pageSize,
    variantIndex: input.variantIndex,
    stylePresetCandidates,
    selectedStylePreset,
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
