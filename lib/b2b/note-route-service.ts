import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { periodKeyToCycle } from "@/lib/b2b/period";

type PharmacistNoteRecord = {
  id: string;
  note: string | null;
  recommendations: string | null;
  cautions: string | null;
  createdByAdminTag: string | null;
  periodKey: string | null;
  reportCycle: number | null;
  updatedAt: Date;
};

function serializeAdminPharmacistNote(
  note: PharmacistNoteRecord | null | undefined
) {
  if (!note) return null;
  return {
    id: note.id,
    note: note.note,
    recommendations: note.recommendations,
    cautions: note.cautions,
    createdByAdminTag: note.createdByAdminTag,
    periodKey: note.periodKey ?? null,
    reportCycle: note.reportCycle ?? null,
    updatedAt: note.updatedAt.toISOString(),
  };
}

export async function runAdminPharmacistNoteLookup(input: {
  employeeId: string;
  periodKey: string | null;
}) {
  const latest = await db.b2bPharmacistNote.findFirst({
    where: {
      employeeId: input.employeeId,
      ...(input.periodKey ? { periodKey: input.periodKey } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    note: serializeAdminPharmacistNote(latest as PharmacistNoteRecord | null),
  };
}

export async function runAdminPharmacistNoteUpsert(input: {
  employeeId: string;
  periodKey: string;
  actorTag?: string;
  note?: string | null;
  recommendations?: string | null;
  cautions?: string | null;
}) {
  const reportCycle = periodKeyToCycle(input.periodKey);

  const latest = await db.b2bPharmacistNote.findFirst({
    where: { employeeId: input.employeeId, periodKey: input.periodKey },
    orderBy: { updatedAt: "desc" },
  });

  const resolvedActorTag =
    input.actorTag?.trim() ||
    latest?.createdByAdminTag?.trim() ||
    "admin";

  const note = latest
    ? await db.b2bPharmacistNote.update({
        where: { id: latest.id },
        data: {
          note: input.note ?? null,
          recommendations: input.recommendations ?? null,
          cautions: input.cautions ?? null,
          createdByAdminTag: resolvedActorTag,
          periodKey: input.periodKey,
          reportCycle: reportCycle ?? null,
        },
      })
    : await db.b2bPharmacistNote.create({
        data: {
          employeeId: input.employeeId,
          note: input.note ?? null,
          recommendations: input.recommendations ?? null,
          cautions: input.cautions ?? null,
          createdByAdminTag: resolvedActorTag,
          periodKey: input.periodKey,
          reportCycle: reportCycle ?? null,
        },
      });

  await logB2bAdminAction({
    employeeId: input.employeeId,
    action: "pharmacist_note_upsert",
    actorTag: resolvedActorTag,
    payload: { noteId: note.id, periodKey: input.periodKey },
  });

  return {
    id: note.id,
    periodKey: note.periodKey ?? input.periodKey,
    reportCycle: note.reportCycle ?? null,
    updatedAt: note.updatedAt.toISOString(),
  };
}
