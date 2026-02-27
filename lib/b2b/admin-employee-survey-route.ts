import "server-only";

import {
  requireAdminExistingEmployeeId,
  type B2bEmployeeRouteContext,
} from "@/lib/b2b/admin-employee-route";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { adminSurveyPutSchema } from "@/lib/b2b/survey-route-schema";
import {
  runAdminSurveyLookup,
  runAdminSurveyUpsert,
  SurveyRouteInputError,
} from "@/lib/b2b/survey-route-service";
import { noStoreJson } from "@/lib/server/no-store";

export const ADMIN_SURVEY_INVALID_INPUT_ERROR =
  "\uC785\uB825 \uD615\uC2DD\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";

export async function runAdminEmployeeSurveyGetRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const periodKey = new URL(req.url).searchParams.get("period");
  const payload = await runAdminSurveyLookup({
    employeeId: authEmployee.employeeId,
    periodKey,
  });

  return noStoreJson({
    ok: true,
    ...payload,
  });
}

export async function runAdminEmployeeSurveyPutRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, adminSurveyPutSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(
      parsed.error,
      ADMIN_SURVEY_INVALID_INPUT_ERROR
    );
  }

  try {
    const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
    const response = await runAdminSurveyUpsert({
      employeeId: authEmployee.employeeId,
      periodKey,
      selectedSections: parsed.data.selectedSections,
      answers: parsed.data.answers as Record<string, unknown>,
    });

    return noStoreJson({
      ok: true,
      response,
    });
  } catch (error) {
    if (error instanceof SurveyRouteInputError) {
      return noStoreJson({ ok: false, error: error.message }, error.status);
    }
    throw error;
  }
}
