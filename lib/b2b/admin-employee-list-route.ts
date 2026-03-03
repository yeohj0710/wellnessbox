import "server-only";

import db from "@/lib/db";
import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";

export async function runAdminEmployeeListGetRoute(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const employees = await db.b2bEmployee.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phoneNormalized: { contains: q } },
            { birthDate: { contains: q } },
          ],
        }
      : undefined,
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
          surveyResponses: true,
          analysisResults: true,
          pharmacistNotes: true,
          accessLogs: true,
          adminActionLogs: true,
        },
      },
    },
  });

  return noStoreJson({
    ok: true,
    employees: employees.map((employee) => ({
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
  });
}
