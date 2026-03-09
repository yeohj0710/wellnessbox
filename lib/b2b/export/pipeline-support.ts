import "server-only";

import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import { REPORT_STYLE_CANDIDATES } from "@/lib/b2b/report-design";
import { pickStylePreset } from "@/lib/b2b/export/layout-dsl";
import type { PageSizeKey, StylePreset } from "@/lib/b2b/export/layout-types";

export function cloneExportPayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function shortenText(text: string | null | undefined, max = 90) {
  if (!text) return text ?? null;
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}

export function shortenExportPayloadText(payload: B2bReportPayload) {
  const next = cloneExportPayload(payload);
  next.pharmacist.note = shortenText(next.pharmacist.note, 70);
  next.pharmacist.recommendations = shortenText(next.pharmacist.recommendations, 70);
  next.pharmacist.cautions = shortenText(next.pharmacist.cautions, 70);
  return next;
}

export function resolveExportStylePresetCandidates(
  variantIndex: number
): StylePreset[] {
  const base = pickStylePreset(variantIndex);
  const all = [...REPORT_STYLE_CANDIDATES] as StylePreset[];
  return [base, ...all.filter((preset) => preset !== base)].slice(0, 3);
}

export function buildExportPptxFilename(input: {
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
