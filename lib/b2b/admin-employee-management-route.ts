import "server-only";

import { z } from "zod";
import db from "@/lib/db";
import {
  requireAdminExistingEmployeeId,
  type B2bEmployeeRouteContext,
} from "@/lib/b2b/admin-employee-route";
import { ADMIN_EMPLOYEE_RECORD_TYPES } from "@/lib/b2b/admin-employee-management-contract";
import {
  APP_USER_REQUIRED_ERROR,
  clearHyphenCachesForEmployee,
  deleteEmployeeRecord,
  deleteEmployeeWithAudit,
  resetAllB2bDataForEmployee,
  resetPeriodDataForEmployee,
} from "@/lib/b2b/admin-employee-management-route-ops";
import {
  employeeDeleteTargetSelect,
  employeeOpsTargetSelect,
  managedEmployeeSelect,
  resolveEmployeeCreatePlan,
  resolveEmployeePatchUpdate,
} from "@/lib/b2b/admin-employee-management-route-employee";
import { loadAdminEmployeeOpsPayload } from "@/lib/b2b/admin-employee-management-route-get";
import { serializeEmployeeRow } from "@/lib/b2b/admin-employee-management-route-response";
import { b2bEmployeeIdentityInputSchema } from "@/lib/b2b/employee-route-schema";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";
import {
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { noStoreJson } from "@/lib/server/no-store";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { requireAdminSession } from "@/lib/server/route-auth";

const EMPLOYEE_NOT_FOUND_ERROR = "직원 정보를 찾을 수 없습니다.";
const INPUT_INVALID_ERROR = "입력 형식을 확인해 주세요.";
const APP_USER_NOT_FOUND_ERROR = "연결할 사용자(AppUser)를 찾을 수 없습니다.";
const EMPLOYEE_DUPLICATE_ERROR =
  "동일한 이름/생년월일/전화 조합의 직원이 이미 존재합니다.";
const EMPLOYEE_DELETE_CONFIRM_ERROR =
  "직원 삭제 확인 문구가 일치하지 않습니다. 직원명을 정확히 입력해 주세요.";
const PERIOD_INVALID_ERROR = "기간은 YYYY-MM 형식으로 입력해 주세요.";

const nullableAppUserIdSchema = z
  .union([z.string().trim().min(1).max(80), z.literal(""), z.null()])
  .optional();

const providerSchema = z.string().trim().min(1).max(80);

const createEmployeeSchema = b2bEmployeeIdentityInputSchema.extend({
  appUserId: nullableAppUserIdSchema,
  linkedProvider: providerSchema.optional(),
});

const patchEmployeeSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    birthDate: z.string().trim().regex(/^\d{8}$/).optional(),
    phone: z.string().trim().regex(/^\d{10,11}$/).optional(),
    appUserId: nullableAppUserIdSchema,
    linkedProvider: providerSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.birthDate !== undefined ||
      value.phone !== undefined ||
      value.appUserId !== undefined ||
      value.linkedProvider !== undefined,
    {
      message: "수정할 항목이 없습니다.",
    }
  );

const deleteEmployeeSchema = z.object({
  confirmName: z.string().trim().min(1).max(60),
});

const recordTypeSchema = z.enum(ADMIN_EMPLOYEE_RECORD_TYPES);

const employeeOpsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reset_all_b2b_data"),
    includeAccessLogs: z.boolean().optional(),
    includeAdminLogs: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("reset_period_data"),
    periodKey: z
      .string()
      .trim()
      .regex(B2B_PERIOD_KEY_REGEX, PERIOD_INVALID_ERROR),
  }),
  z.object({
    action: z.literal("clear_hyphen_cache"),
    clearLink: z.boolean().optional(),
    clearFetchCache: z.boolean().optional(),
    clearFetchAttempts: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("delete_record"),
    recordType: recordTypeSchema,
    recordId: z.string().trim().min(1),
  }),
]);

async function loadEmployeeForOps(employeeId: string) {
  const payload = await loadAdminEmployeeOpsPayload(employeeId);
  if (!payload) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }
  return noStoreJson(payload);
}

export async function runAdminEmployeeOpsGetRoute(
  _req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;
  return loadEmployeeForOps(authEmployee.employeeId);
}

export async function runAdminEmployeeCreatePostRoute(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const parsed = await parseRouteBodyWithSchema(req, createEmployeeSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const createPlan = await resolveEmployeeCreatePlan({
    employee: parsed.data,
    defaultLinkedProvider: HYPHEN_PROVIDER,
  });
  if (!createPlan.ok && createPlan.reason === "missing_app_user") {
    return noStoreJson({ ok: false, error: APP_USER_NOT_FOUND_ERROR }, 400);
  }
  if (!createPlan.ok && createPlan.reason === "duplicate_identity") {
    return noStoreJson(
      {
        ok: false,
        error: EMPLOYEE_DUPLICATE_ERROR,
        duplicate: createPlan.duplicate,
      },
      409
    );
  }

  const employee = await db.b2bEmployee.create({
    data: createPlan.createData,
    select: managedEmployeeSelect,
  });

  await logB2bAdminAction({
    employeeId: employee.id,
    action: "employee_create",
    actorTag: "admin",
    payload: {
      appUserId: createPlan.appUserId,
      linkedProvider: employee.linkedProvider,
    },
  });

  return noStoreJson({
    ok: true,
    employee: serializeEmployeeRow(employee),
  });
}

export async function runAdminEmployeePatchRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, patchEmployeeSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const current = await db.b2bEmployee.findUnique({
    where: { id: authEmployee.employeeId },
    select: managedEmployeeSelect,
  });
  if (!current) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  const patchPlan = await resolveEmployeePatchUpdate({
    current,
    patch: parsed.data,
  });

  if (!patchPlan.ok && patchPlan.reason === "duplicate_identity") {
    return noStoreJson({ ok: false, error: EMPLOYEE_DUPLICATE_ERROR }, 409);
  }

  if (!patchPlan.ok && patchPlan.reason === "missing_app_user") {
    return noStoreJson({ ok: false, error: APP_USER_NOT_FOUND_ERROR }, 400);
  }

  if (!patchPlan.ok) {
    return noStoreJson({ ok: false, error: "수정할 내용이 없습니다." }, 400);
  }

  const updated = await db.b2bEmployee.update({
    where: { id: current.id },
    data: patchPlan.updateData,
    select: managedEmployeeSelect,
  });

  await logB2bAdminAction({
    employeeId: updated.id,
    action: "employee_patch",
    actorTag: "admin",
    payload: {
      changedFields: patchPlan.changedFields,
    },
  });

  return noStoreJson({
    ok: true,
    employee: serializeEmployeeRow(updated),
  });
}

export async function runAdminEmployeeDeleteRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, deleteEmployeeSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const target = await db.b2bEmployee.findUnique({
    where: { id: authEmployee.employeeId },
    select: employeeDeleteTargetSelect,
  });
  if (!target) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  if (parsed.data.confirmName.trim() !== target.name) {
    return noStoreJson({ ok: false, error: EMPLOYEE_DELETE_CONFIRM_ERROR }, 400);
  }

  await deleteEmployeeWithAudit({
    id: target.id,
    name: target.name,
    appUserId: target.appUserId,
    identityHash: target.identityHash,
    counts: target._count,
  });

  return noStoreJson({
    ok: true,
    deleted: {
      employeeId: target.id,
      employeeName: target.name,
    },
  });
}

export async function runAdminEmployeeOpsPostRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, employeeOpsSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const employee = await db.b2bEmployee.findUnique({
    where: { id: authEmployee.employeeId },
    select: employeeOpsTargetSelect,
  });
  if (!employee) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  if (parsed.data.action === "reset_all_b2b_data") {
    const deleted = await resetAllB2bDataForEmployee({
      employeeId: employee.id,
      appUserId: employee.appUserId,
      identityHash: employee.identityHash,
      includeAccessLogs: parsed.data.includeAccessLogs === true,
      includeAdminLogs: parsed.data.includeAdminLogs === true,
    });
    return noStoreJson({
      ok: true,
      action: parsed.data.action,
      deleted,
    });
  }

  if (parsed.data.action === "reset_period_data") {
    const periodKey = parsed.data.periodKey.trim();
    if (!B2B_PERIOD_KEY_REGEX.test(periodKey)) {
      return noStoreJson({ ok: false, error: PERIOD_INVALID_ERROR }, 400);
    }
    const deleted = await resetPeriodDataForEmployee({
      employeeId: employee.id,
      periodKey,
    });
    return noStoreJson({
      ok: true,
      action: parsed.data.action,
      periodKey,
      deleted,
    });
  }

  if (parsed.data.action === "clear_hyphen_cache") {
    if (!employee.appUserId) {
      return noStoreJson({ ok: false, error: APP_USER_REQUIRED_ERROR }, 400);
    }

    const clearLink = parsed.data.clearLink !== false;
    const clearFetchCache = parsed.data.clearFetchCache !== false;
    const clearFetchAttempts = parsed.data.clearFetchAttempts !== false;
    const result = await clearHyphenCachesForEmployee({
      employeeId: employee.id,
      appUserId: employee.appUserId,
      clearLink,
      clearFetchCache,
      clearFetchAttempts,
    });
    return noStoreJson({
      ok: true,
      action: parsed.data.action,
      ...result,
    });
  }

  return deleteEmployeeRecord({
    employeeId: employee.id,
    appUserId: employee.appUserId,
    recordType: parsed.data.recordType,
    recordId: parsed.data.recordId,
  });
}
