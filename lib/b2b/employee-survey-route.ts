import "server-only";

import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
  runWithDbRouteError,
} from "@/lib/b2b/route-helpers";
import { employeeSurveyPutSchema } from "@/lib/b2b/survey-route-schema";
import {
  runEmployeeSurveyLookup,
  runEmployeeSurveyUpsert,
  SurveyRouteInputError,
} from "@/lib/b2b/survey-route-service";
import { noStoreJson } from "@/lib/server/no-store";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

const EMPLOYEE_SURVEY_GET_ERROR =
  "설문 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const EMPLOYEE_SURVEY_PUT_ERROR =
  "설문 데이터 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const EMPLOYEE_SURVEY_INVALID_INPUT_ERROR =
  "설문 저장 요청 형식을 확인해 주세요.";

export async function runB2bEmployeeSurveyGetRoute(req: Request) {
  return runWithDbRouteError(EMPLOYEE_SURVEY_GET_ERROR, async () => {
    const auth = await requireB2bEmployeeToken();
    if (!auth.ok) return auth.response;

    const requestedPeriod = new URL(req.url).searchParams.get("period");
    const currentPeriodKey = resolveCurrentPeriodKey();
    let source: "current" | "latest" | "requested" =
      requestedPeriod ? "requested" : "current";

    let payload = await runEmployeeSurveyLookup({
      employeeId: auth.data.employeeId,
      periodKey: requestedPeriod ?? currentPeriodKey,
    });

    if (!requestedPeriod && !payload.response) {
      payload = await runEmployeeSurveyLookup({
        employeeId: auth.data.employeeId,
        periodKey: null,
      });
      source = "latest";
    }

    return noStoreJson({
      ok: true,
      ...payload,
      source,
      currentPeriodKey,
    });
  });
}

export async function runB2bEmployeeSurveyPutRoute(req: Request) {
  return runWithDbRouteError(EMPLOYEE_SURVEY_PUT_ERROR, async () => {
    const auth = await requireB2bEmployeeToken();
    if (!auth.ok) return auth.response;

    const parsed = await parseRouteBodyWithSchema(req, employeeSurveyPutSchema, null);
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error, EMPLOYEE_SURVEY_INVALID_INPUT_ERROR);
    }

    try {
      const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
      const response = await runEmployeeSurveyUpsert({
        employeeId: auth.data.employeeId,
        periodKey,
        selectedSections: parsed.data.selectedSections,
        answers: parsed.data.answers as Record<string, unknown>,
        finalize: parsed.data.finalize === true,
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
  });
}
