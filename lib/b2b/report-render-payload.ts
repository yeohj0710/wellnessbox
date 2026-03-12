import "server-only";

import db from "@/lib/db";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";

function toRenderPayload(raw: unknown): ReportSummaryPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ReportSummaryPayload;
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

  return {
    ...payload,
    pharmacist: {
      ...payload.pharmacist,
      note: latestNote.note ?? null,
      summary: latestNote.note ?? null,
      recommendations: latestNote.recommendations ?? null,
      cautions: latestNote.cautions ?? null,
    },
  } satisfies ReportSummaryPayload;
}
