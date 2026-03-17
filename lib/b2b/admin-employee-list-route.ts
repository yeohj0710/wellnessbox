import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import type { AdminEmployeeListResponse, EmployeeListItem } from "@/lib/b2b/admin-employee-management-contract";
import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";

function toEmployeeGroupKey(input: {
  birthDate: string;
  phoneNormalized: string;
}) {
  return `${input.birthDate}::${input.phoneNormalized}`;
}

function scoreEmployeeListCandidate(input: {
  lastSyncedAt: Date | null;
  updatedAt: Date;
  counts: {
    healthSnapshots: number;
    reports: number;
  };
}) {
  let score = 0;
  score += input.counts.reports * 140;
  score += input.counts.healthSnapshots * 56;
  if (input.lastSyncedAt) score += 24;
  score += Math.floor(input.updatedAt.getTime() / 1000 / 60 / 60 / 24);
  return score;
}

function dedupeEmployeesByIdentity<T extends {
  birthDate: string;
  phoneNormalized: string;
  lastSyncedAt: Date | null;
  updatedAt: Date;
  _count: {
    healthSnapshots: number;
    reports: number;
  };
}>(employees: T[]) {
  const grouped = new Map<string, T>();

  for (const employee of employees) {
    const key = toEmployeeGroupKey(employee);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, employee);
      continue;
    }

    const existingScore = scoreEmployeeListCandidate({
      lastSyncedAt: existing.lastSyncedAt,
      updatedAt: existing.updatedAt,
      counts: existing._count,
    });
    const nextScore = scoreEmployeeListCandidate({
      lastSyncedAt: employee.lastSyncedAt,
      updatedAt: employee.updatedAt,
      counts: employee._count,
    });

    if (nextScore > existingScore) {
      grouped.set(key, employee);
    }
  }

  return [...grouped.values()].sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()
  );
}

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

    const dedupedEmployees = dedupeEmployeesByIdentity(employees);

    const payload: AdminEmployeeListResponse = {
      ok: true,
      employees: dedupedEmployees.map((employee): EmployeeListItem => ({
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

  const dedupedEmployees = dedupeEmployeesByIdentity(employees);

  const payload: AdminEmployeeListResponse = {
    ok: true,
    employees: dedupedEmployees.map((employee): EmployeeListItem => ({
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
