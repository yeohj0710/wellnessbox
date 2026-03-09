import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import type { AdminEmployeeListResponse, EmployeeListItem } from "@/lib/b2b/admin-employee-management-contract";
import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";

export async function runAdminEmployeeListGetRoute(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const view = (searchParams.get("view") || "").trim().toLowerCase();
  const where: Prisma.B2bEmployeeWhereInput | undefined = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phoneNormalized: { contains: q } },
          { birthDate: { contains: q } },
        ],
      }
    : undefined;

  if (view === "reports") {
    const employees = await db.b2bEmployee.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        birthDate: true,
        phoneNormalized: true,
        lastSyncedAt: true,
        updatedAt: true,
        _count: {
          select: {
            healthSnapshots: true,
            reports: true,
          },
        },
      },
    });

    const payload: AdminEmployeeListResponse = {
      ok: true,
      employees: employees.map((employee): EmployeeListItem => ({
        id: employee.id,
        name: employee.name,
        birthDate: employee.birthDate,
        phoneNormalized: employee.phoneNormalized,
        lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
        updatedAt: employee.updatedAt.toISOString(),
        counts: employee._count,
      })),
    };

    return noStoreJson(payload);
  }

  const employees = await db.b2bEmployee.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      linkedProvider: true,
      lastSyncedAt: true,
      lastViewedAt: true,
      updatedAt: true,
      _count: {
        select: {
          healthSnapshots: true,
          reports: true,
        },
      },
    },
  });

  const payload: AdminEmployeeListResponse = {
    ok: true,
    employees: employees.map((employee): EmployeeListItem => ({
      id: employee.id,
      appUserId: employee.appUserId,
      name: employee.name,
      birthDate: employee.birthDate,
      phoneNormalized: employee.phoneNormalized,
      identityHash: employee.identityHash,
      linkedProvider: employee.linkedProvider,
      lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
      lastViewedAt: employee.lastViewedAt?.toISOString() ?? null,
      updatedAt: employee.updatedAt.toISOString(),
      counts: employee._count,
    })),
  };

  return noStoreJson(payload);
}
