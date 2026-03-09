import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import type {
  AdminEmployeeCreatePayload,
  AdminEmployeePatchPayload,
} from "@/lib/b2b/admin-employee-management-contract";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";

export const managedEmployeeSelect = {
  id: true,
  appUserId: true,
  name: true,
  birthDate: true,
  phoneNormalized: true,
  identityHash: true,
  linkedProvider: true,
  lastSyncedAt: true,
  lastViewedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.B2bEmployeeSelect;

export const employeeDeleteTargetSelect = {
  id: true,
  name: true,
  appUserId: true,
  _count: {
    select: {
      healthSnapshots: true,
      surveyResponses: true,
      analysisResults: true,
      pharmacistNotes: true,
      reports: true,
      accessLogs: true,
      adminActionLogs: true,
    },
  },
} satisfies Prisma.B2bEmployeeSelect;

export const employeeOpsTargetSelect = {
  id: true,
  name: true,
  appUserId: true,
} satisfies Prisma.B2bEmployeeSelect;

export type ManagedEmployeeRow = Prisma.B2bEmployeeGetPayload<{
  select: typeof managedEmployeeSelect;
}>;

export function normalizeNullableText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function ensureAppUserExists(appUserId: string) {
  const user = await db.appUser.findUnique({
    where: { id: appUserId },
    select: { id: true },
  });
  return Boolean(user);
}

export async function resolveEmployeeCreatePlan(input: {
  employee: AdminEmployeeCreatePayload;
  defaultLinkedProvider: string;
}) {
  const appUserId = normalizeNullableText(input.employee.appUserId);
  if (appUserId) {
    const exists = await ensureAppUserExists(appUserId);
    if (!exists) {
      return { ok: false as const, reason: "missing_app_user" as const };
    }
  }

  const identity = resolveB2bEmployeeIdentity({
    name: input.employee.name,
    birthDate: input.employee.birthDate,
    phone: input.employee.phone,
  });
  const duplicate = await db.b2bEmployee.findUnique({
    where: { identityHash: identity.identityHash },
    select: { id: true, name: true, birthDate: true, phoneNormalized: true },
  });
  if (duplicate) {
    return {
      ok: false as const,
      reason: "duplicate_identity" as const,
      duplicate,
    };
  }

  return {
    ok: true as const,
    appUserId,
    createData: {
      appUserId,
      name: identity.name,
      birthDate: identity.birthDate,
      phoneNormalized: identity.phoneNormalized,
      identityHash: identity.identityHash,
      linkedProvider:
        normalizeNullableText(input.employee.linkedProvider) ||
        input.defaultLinkedProvider,
    },
  };
}

export async function resolveEmployeePatchUpdate(input: {
  current: ManagedEmployeeRow;
  patch: AdminEmployeePatchPayload;
}) {
  const updateData: {
    appUserId?: string | null;
    name?: string;
    birthDate?: string;
    phoneNormalized?: string;
    identityHash?: string;
    linkedProvider?: string;
  } = {};
  const changedFields: string[] = [];

  if (
    input.patch.name !== undefined ||
    input.patch.birthDate !== undefined ||
    input.patch.phone !== undefined
  ) {
    const nextIdentity = resolveB2bEmployeeIdentity({
      name: input.patch.name ?? input.current.name,
      birthDate: input.patch.birthDate ?? input.current.birthDate,
      phone: input.patch.phone ?? input.current.phoneNormalized,
    });

    if (nextIdentity.identityHash !== input.current.identityHash) {
      const duplicate = await db.b2bEmployee.findUnique({
        where: { identityHash: nextIdentity.identityHash },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== input.current.id) {
        return { ok: false as const, reason: "duplicate_identity" as const };
      }
    }

    updateData.name = nextIdentity.name;
    updateData.birthDate = nextIdentity.birthDate;
    updateData.phoneNormalized = nextIdentity.phoneNormalized;
    updateData.identityHash = nextIdentity.identityHash;
    changedFields.push("name", "birthDate", "phoneNormalized", "identityHash");
  }

  if (input.patch.appUserId !== undefined) {
    const nextAppUserId = normalizeNullableText(input.patch.appUserId);
    if (nextAppUserId) {
      const exists = await ensureAppUserExists(nextAppUserId);
      if (!exists) {
        return { ok: false as const, reason: "missing_app_user" as const };
      }
    }
    updateData.appUserId = nextAppUserId;
    changedFields.push("appUserId");
  }

  if (input.patch.linkedProvider !== undefined) {
    updateData.linkedProvider = input.patch.linkedProvider.trim();
    changedFields.push("linkedProvider");
  }

  if (Object.keys(updateData).length === 0) {
    return { ok: false as const, reason: "no_changes" as const };
  }

  return {
    ok: true as const,
    updateData,
    changedFields: [...new Set(changedFields)],
  };
}
