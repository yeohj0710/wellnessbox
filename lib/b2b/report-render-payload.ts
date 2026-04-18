import "server-only";

import db from "@/lib/db";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";

function toRenderPayload(raw: unknown): ReportSummaryPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ReportSummaryPayload;
}

function toNullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function resolveReportPayloadWithLatestNote(input: {
  employeeId: string;
  periodKey?: string | null;
  rawPayload: unknown;
}) {
  const payload = toRenderPayload(input.rawPayload);
  if (!payload) return null;

  const latestNote = await db.b2bPharmacistNote.findFirst({
    where: {
      employeeId: input.employeeId,
      ...(input.periodKey ? { periodKey: input.periodKey } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      note: true,
      recommendations: true,
      cautions: true,
    },
  });

  if (!latestNote) return payload;

  const latestNoteText = toNullableText(latestNote.note);
  const currentSummary = toNullableText(payload.pharmacist?.summary);
  const currentAddendumSummary = toNullableText(
    payload.reportAddendum?.consultationSummary
  );
  const resolvedSummary = latestNoteText ?? currentSummary;
  const resolvedAddendumSummary =
    currentAddendumSummary ?? latestNoteText ?? currentSummary;

  return {
    ...payload,
    pharmacist: {
      ...payload.pharmacist,
      note: latestNoteText,
      summary: resolvedSummary,
      recommendations: latestNote.recommendations ?? null,
      cautions: latestNote.cautions ?? null,
    },
    reportAddendum: {
      ...payload.reportAddendum,
      consultationSummary: resolvedAddendumSummary,
    },
  } satisfies ReportSummaryPayload;
}
