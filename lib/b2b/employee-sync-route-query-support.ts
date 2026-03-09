import db from "@/lib/db";

export async function findLatestEmployeeSyncReusableSnapshot(employeeId: string) {
  return db.b2bHealthDataSnapshot.findFirst({
    where: { employeeId, provider: "HYPHEN_NHIS" },
    orderBy: [{ fetchedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      periodKey: true,
    },
  });
}

export async function findLatestEmployeeSyncTimeoutFallbackSnapshot(
  employeeId: string
) {
  return db.b2bHealthDataSnapshot.findFirst({
    where: { employeeId },
    orderBy: { fetchedAt: "desc" },
    select: { id: true },
  });
}
