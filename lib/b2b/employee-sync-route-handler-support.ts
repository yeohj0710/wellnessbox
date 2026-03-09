import { z } from "zod";
import { B2bEmployeeIdentityValidationError } from "@/lib/b2b/identity";
import { b2bEmployeeIdentityInputSchema } from "@/lib/b2b/employee-route-schema";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";
import {
  buildDbPoolBusySyncResponse,
  describeEmployeeSyncError,
  EMPLOYEE_SYNC_EXECUTE_FAILED_ERROR,
} from "@/lib/b2b/employee-sync-route-failure-support";
import { noStoreJson } from "@/lib/server/no-store";
import { resolveDbRouteError } from "@/lib/server/db-error";

export const employeeSyncRequestSchema = b2bEmployeeIdentityInputSchema.extend({
  forceRefresh: z.boolean().optional(),
  periodKey: z.string().regex(B2B_PERIOD_KEY_REGEX).optional(),
  generateAiEvaluation: z.boolean().optional(),
});

export type EmployeeSyncPayload = z.infer<typeof employeeSyncRequestSchema>;

export const EMPLOYEE_SYNC_INPUT_INVALID_ERROR = "입력값을 확인해 주세요.";

export function buildEmployeeSyncDedupKey(input: {
  appUserId: string;
  guest: boolean;
  payload: EmployeeSyncPayload;
}) {
  return [
    input.appUserId,
    input.guest ? "guest" : "member",
    input.payload.name.trim(),
    input.payload.birthDate.trim(),
    input.payload.phone.trim(),
    input.payload.periodKey?.trim() || "-",
    input.payload.forceRefresh === true ? "force" : "normal",
    input.payload.generateAiEvaluation === true ? "ai" : "no-ai",
  ].join("|");
}

export function buildEmployeeSyncValidationErrorResponse(body: unknown) {
  const parsed = employeeSyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: noStoreJson(
        {
          ok: false,
          error: parsed.error.issues[0]?.message || EMPLOYEE_SYNC_INPUT_INVALID_ERROR,
        },
        400
      ),
    };
  }

  return {
    ok: true as const,
    payload: parsed.data,
  };
}

export function buildEmployeeSyncRouteFailureResponse(input: {
  error: unknown;
  appUserId: string;
  guest: boolean;
}) {
  if (input.error instanceof B2bEmployeeIdentityValidationError) {
    return noStoreJson(
      {
        ok: false,
        code: input.error.code,
        error: EMPLOYEE_SYNC_INPUT_INVALID_ERROR,
      },
      400
    );
  }

  const dbError = resolveDbRouteError(
    input.error,
    EMPLOYEE_SYNC_EXECUTE_FAILED_ERROR
  );
  const details = describeEmployeeSyncError(input.error);
  console.error("[b2b][employee-sync] route handler failed", {
    appUserId: input.appUserId,
    guest: input.guest,
    errorName: details.name,
    errorCode: details.code,
    errorMessage: details.message,
    mappedCode: dbError.code,
    mappedStatus: dbError.status,
  });

  if (dbError.code === "DB_POOL_TIMEOUT") {
    return buildDbPoolBusySyncResponse(dbError.message);
  }

  return noStoreJson(
    { ok: false, code: dbError.code, error: dbError.message },
    dbError.status
  );
}
