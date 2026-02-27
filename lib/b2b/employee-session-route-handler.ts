import "server-only";

import type { z } from "zod";
import { B2B_EMPLOYEE_TOKEN_COOKIE } from "@/lib/b2b/employee-token";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import type { B2bEmployeeIdentityInput } from "@/lib/b2b/employee-route-schema";
import { b2bEmployeeIdentityInputSchema } from "@/lib/b2b/employee-route-schema";
import {
  attachB2bEmployeeSessionToken,
  noStoreJson,
  resolveEmployeeSessionLogin,
  resolveEmployeeSessionStatus,
} from "@/lib/b2b/employee-session-route";
import {
  buildDbErrorResponse,
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

const employeeSessionSchema = b2bEmployeeIdentityInputSchema;
const INVALID_INPUT_ERROR =
  "\uC785\uB825\uAC12\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const SESSION_STATUS_ERROR =
  "\uC138\uC158 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const SESSION_LOGIN_ERROR =
  "\uC138\uC158 \uB85C\uADF8\uC778 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export async function runEmployeeSessionStatusRoute() {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) {
    return noStoreJson({ ok: true, authenticated: false });
  }

  const status = await resolveEmployeeSessionStatus(auth.data.employeeId);
  if (!status.authenticated) {
    return noStoreJson({ ok: true, authenticated: false });
  }

  return noStoreJson({
    ok: true,
    authenticated: true,
    employee: status.employee,
    latestReport: status.latestReport,
  });
}

export async function runEmployeeSessionLoginRoute(
  req: Request,
  schema: z.ZodType<B2bEmployeeIdentityInput>,
  invalidInputError: string
) {
  const parsed = await parseRouteBodyWithSchema(req, schema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, invalidInputError);
  }

  const identity = resolveB2bEmployeeIdentity(parsed.data);
  const loginResult = await resolveEmployeeSessionLogin(identity.identityHash);

  if (!loginResult.found) {
    return noStoreJson({
      ok: true,
      found: false,
      message: loginResult.message,
    });
  }

  const response = noStoreJson({
    ok: true,
    found: true,
    employee: loginResult.employee,
    report: loginResult.report,
  });
  attachB2bEmployeeSessionToken(
    response,
    loginResult.token.employeeId,
    loginResult.token.identityHash
  );
  return response;
}

export function runEmployeeSessionDeleteRoute() {
  const response = noStoreJson({ ok: true, cleared: true });
  response.cookies.delete(B2B_EMPLOYEE_TOKEN_COOKIE);
  return response;
}

export async function runEmployeeSessionGetRoute() {
  try {
    return runEmployeeSessionStatusRoute();
  } catch (error) {
    return buildDbErrorResponse(error, SESSION_STATUS_ERROR);
  }
}

export async function runEmployeeSessionPostRoute(req: Request) {
  try {
    return runEmployeeSessionLoginRoute(
      req,
      employeeSessionSchema,
      INVALID_INPUT_ERROR
    );
  } catch (error) {
    return buildDbErrorResponse(error, SESSION_LOGIN_ERROR);
  }
}
