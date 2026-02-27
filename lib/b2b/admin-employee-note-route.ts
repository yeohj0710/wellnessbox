import "server-only";

import {
  requireAdminExistingEmployeeId,
  type B2bEmployeeRouteContext,
} from "@/lib/b2b/admin-employee-route";
import {
  runAdminPharmacistNoteLookup,
  runAdminPharmacistNoteUpsert,
} from "@/lib/b2b/note-route-service";
import { adminPharmacistNotePutSchema } from "@/lib/b2b/note-route-schema";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { noStoreJson } from "@/lib/server/no-store";

export const ADMIN_NOTE_INVALID_INPUT_ERROR =
  "\uC785\uB825 \uD615\uC2DD\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";

export async function runAdminEmployeeNoteGetRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const periodKey = new URL(req.url).searchParams.get("period");
  const payload = await runAdminPharmacistNoteLookup({
    employeeId: authEmployee.employeeId,
    periodKey,
  });

  return noStoreJson({
    ok: true,
    ...payload,
  });
}

export async function runAdminEmployeeNotePutRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(
    req,
    adminPharmacistNotePutSchema,
    null
  );
  if (!parsed.success) {
    return buildValidationErrorResponse(
      parsed.error,
      ADMIN_NOTE_INVALID_INPUT_ERROR
    );
  }

  const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
  const note = await runAdminPharmacistNoteUpsert({
    employeeId: authEmployee.employeeId,
    periodKey,
    actorTag: parsed.data.actorTag,
    note: parsed.data.note,
    recommendations: parsed.data.recommendations,
    cautions: parsed.data.cautions,
  });

  return noStoreJson({
    ok: true,
    note,
  });
}
