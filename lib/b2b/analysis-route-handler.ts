import {
  buildExternalPayloadUpsertMutation,
  buildRecomputeMutation,
  loadAdminAnalysisLookup,
  runAdminAnalysisMutation,
  serializeAnalysisMutationResult,
} from "@/lib/b2b/analysis-route-service";
import {
  adminAnalysisPostSchema,
  adminAnalysisPutSchema,
} from "@/lib/b2b/analysis-route-schema";
import {
  requireAdminExistingEmployeeId,
  type B2bEmployeeRouteContext,
} from "@/lib/b2b/admin-employee-route";
import {
  buildDbErrorResponse,
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { noStoreJson } from "@/lib/server/no-store";

const INVALID_INPUT_ERROR = "입력 형식을 확인해 주세요.";
const ANALYSIS_GET_ERROR = "분석 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const ANALYSIS_SAVE_ERROR = "분석 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const ANALYSIS_RECOMPUTE_ERROR =
  "분석 재생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

async function runWithAdminEmployee(
  ctx: B2bEmployeeRouteContext,
  fallbackError: string,
  handler: (employeeId: string) => Promise<Response>
) {
  try {
    const authEmployee = await requireAdminExistingEmployeeId(ctx);
    if (!authEmployee.ok) return authEmployee.response;
    return handler(authEmployee.employeeId);
  } catch (error) {
    return buildDbErrorResponse(error, fallbackError);
  }
}

export async function handleAdminAnalysisGet(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  return runWithAdminEmployee(ctx, ANALYSIS_GET_ERROR, async (employeeId) => {
    const periodKey = new URL(req.url).searchParams.get("period");
    const lookup = await loadAdminAnalysisLookup(employeeId, periodKey);

    return noStoreJson({
      ok: true,
      analysis: lookup.analysis,
      periodKey: lookup.periodKey,
      availablePeriods: lookup.availablePeriods,
    });
  });
}

export async function handleAdminAnalysisPut(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  return runWithAdminEmployee(ctx, ANALYSIS_SAVE_ERROR, async (employeeId) => {
    const parsed = await parseRouteBodyWithSchema(req, adminAnalysisPutSchema, null);
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error, INVALID_INPUT_ERROR);
    }

    const mutationResult = await runAdminAnalysisMutation(
      buildExternalPayloadUpsertMutation({
        employeeId,
        periodKey: parsed.data.periodKey,
        generateAiEvaluation: parsed.data.generateAiEvaluation,
        payload: parsed.data.payload,
      })
    );

    return noStoreJson(serializeAnalysisMutationResult(mutationResult));
  });
}

export async function handleAdminAnalysisPost(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  return runWithAdminEmployee(ctx, ANALYSIS_RECOMPUTE_ERROR, async (employeeId) => {
    const parsed = await parseRouteBodyWithSchema(req, adminAnalysisPostSchema, {});
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error, INVALID_INPUT_ERROR);
    }

    const mutationResult = await runAdminAnalysisMutation(
      buildRecomputeMutation({
        employeeId,
        periodKey: parsed.data.periodKey,
        generateAiEvaluation: parsed.data.generateAiEvaluation,
        forceAiRegenerate: parsed.data.forceAiRegenerate,
        externalAnalysisPayload: parsed.data.externalAnalysisPayload,
        replaceLatestPeriodEntry: parsed.data.replaceLatestPeriodEntry,
      })
    );

    return noStoreJson(serializeAnalysisMutationResult(mutationResult));
  });
}
