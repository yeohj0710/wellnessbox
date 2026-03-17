import "server-only";

import db from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type B2bEmployeeIdentityMatchInput = {
  appUserId?: string | null;
  identityHash: string;
  name: string;
  birthDate: string;
  phoneNormalized: string;
};

type EmployeeMatchCandidate = {
  id: string;
  appUserId: string | null;
  name: string;
  birthDate: string;
  phoneNormalized: string;
  identityHash: string;
  lastSyncedAt: Date | null;
  updatedAt: Date;
  _count: {
    healthSnapshots: number;
    surveyResponses: number;
    analysisResults: number;
    pharmacistNotes: number;
    reports: number;
  };
};

function scoreCandidate(
  candidate: EmployeeMatchCandidate,
  input: B2bEmployeeIdentityMatchInput
) {
  let score = 0;
  if (input.appUserId && candidate.appUserId === input.appUserId) score += 320;
  if (candidate.identityHash === input.identityHash) score += 40;
  score += candidate._count.reports * 140;
  score += candidate._count.healthSnapshots * 56;
  score += candidate._count.analysisResults * 44;
  score += candidate._count.surveyResponses * 40;
  score += candidate._count.pharmacistNotes * 28;
  if (candidate.lastSyncedAt) score += 24;
  score += Math.floor(candidate.updatedAt.getTime() / 1000 / 60 / 60 / 24);
  return score;
}

async function loadB2bEmployeeIdentityCandidates(
  client: typeof db | Prisma.TransactionClient,
  input: B2bEmployeeIdentityMatchInput
) {
  return client.b2bEmployee.findMany({
    where: {
      OR: [
        { identityHash: input.identityHash },
        {
          birthDate: input.birthDate,
          phoneNormalized: input.phoneNormalized,
        },
      ],
    },
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      lastSyncedAt: true,
      updatedAt: true,
      _count: {
        select: {
          healthSnapshots: true,
          surveyResponses: true,
          analysisResults: true,
          pharmacistNotes: true,
          reports: true,
        },
      },
    },
  });

}

function pickCanonicalEmployeeCandidate(
  candidates: EmployeeMatchCandidate[],
  input: B2bEmployeeIdentityMatchInput
) {
  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    const scoreDiff = scoreCandidate(right, input) - scoreCandidate(left, input);
    if (scoreDiff !== 0) return scoreDiff;
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  })[0];
}

async function moveAnalysisResults(
  tx: Prisma.TransactionClient,
  sourceEmployeeId: string,
  targetEmployeeId: string
) {
  const sourceRows = await tx.b2bAnalysisResult.findMany({
    where: { employeeId: sourceEmployeeId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      version: true,
      updatedAt: true,
    },
  });

  for (const row of sourceRows) {
    const duplicate = await tx.b2bAnalysisResult.findFirst({
      where: {
        employeeId: targetEmployeeId,
        version: row.version,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    if (!duplicate) {
      await tx.b2bAnalysisResult.update({
        where: { id: row.id },
        data: { employeeId: targetEmployeeId },
      });
      continue;
    }

    if (row.updatedAt >= duplicate.updatedAt) {
      await tx.b2bAnalysisResult.delete({ where: { id: duplicate.id } });
      await tx.b2bAnalysisResult.update({
        where: { id: row.id },
        data: { employeeId: targetEmployeeId },
      });
      continue;
    }

    await tx.b2bAnalysisResult.delete({ where: { id: row.id } });
  }
}

async function moveReports(
  tx: Prisma.TransactionClient,
  sourceEmployeeId: string,
  targetEmployeeId: string
) {
  const sourceRows = await tx.b2bReport.findMany({
    where: { employeeId: sourceEmployeeId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      variantIndex: true,
      updatedAt: true,
    },
  });

  for (const row of sourceRows) {
    const duplicate = await tx.b2bReport.findFirst({
      where: {
        employeeId: targetEmployeeId,
        variantIndex: row.variantIndex,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    if (!duplicate) {
      await tx.b2bReport.update({
        where: { id: row.id },
        data: { employeeId: targetEmployeeId },
      });
      continue;
    }

    if (row.updatedAt >= duplicate.updatedAt) {
      await tx.b2bReport.delete({ where: { id: duplicate.id } });
      await tx.b2bReport.update({
        where: { id: row.id },
        data: { employeeId: targetEmployeeId },
      });
      continue;
    }

    await tx.b2bReport.delete({ where: { id: row.id } });
  }
}

async function mergeEmployeeIntoCanonical(
  tx: Prisma.TransactionClient,
  source: EmployeeMatchCandidate,
  canonical: EmployeeMatchCandidate
) {
  await tx.b2bHealthDataSnapshot.updateMany({
    where: { employeeId: source.id },
    data: { employeeId: canonical.id },
  });
  await tx.b2bSurveyResponse.updateMany({
    where: { employeeId: source.id },
    data: { employeeId: canonical.id },
  });
  await tx.b2bPharmacistNote.updateMany({
    where: { employeeId: source.id },
    data: { employeeId: canonical.id },
  });
  await tx.b2bEmployeeAccessLog.updateMany({
    where: { employeeId: source.id },
    data: { employeeId: canonical.id },
  });
  await tx.b2bAdminActionLog.updateMany({
    where: { employeeId: source.id },
    data: { employeeId: canonical.id },
  });

  await moveAnalysisResults(tx, source.id, canonical.id);
  await moveReports(tx, source.id, canonical.id);

  const updateData: Prisma.B2bEmployeeUpdateInput = {};
  if (!canonical.appUserId && source.appUserId) {
    updateData.appUser = { connect: { id: source.appUserId } };
  }
  if (
    source.lastSyncedAt &&
    (!canonical.lastSyncedAt || source.lastSyncedAt > canonical.lastSyncedAt)
  ) {
    updateData.lastSyncedAt = source.lastSyncedAt;
  }

  if (Object.keys(updateData).length > 0) {
    await tx.b2bEmployee.update({
      where: { id: canonical.id },
      data: updateData,
    });
  }

  await tx.b2bEmployee.delete({
    where: { id: source.id },
  });
}

export async function findBestB2bEmployeeIdentityMatch(
  input: B2bEmployeeIdentityMatchInput
) {
  const candidates = await loadB2bEmployeeIdentityCandidates(db, input);
  return pickCanonicalEmployeeCandidate(candidates, input);
}

export async function mergeDuplicateB2bEmployeesForIdentity(
  input: B2bEmployeeIdentityMatchInput
) {
  const candidates = await loadB2bEmployeeIdentityCandidates(db, input);
  const canonical = pickCanonicalEmployeeCandidate(candidates, input);
  if (!canonical) return null;
  if (candidates.length <= 1) return canonical;

  await db.$transaction(async (tx) => {
    const transactionCandidates = await loadB2bEmployeeIdentityCandidates(tx, input);
    const transactionCanonical = pickCanonicalEmployeeCandidate(transactionCandidates, input);
    if (!transactionCanonical) return;

    const duplicates = transactionCandidates.filter(
      (candidate) => candidate.id !== transactionCanonical.id
    );

    for (const duplicate of duplicates) {
      await mergeEmployeeIntoCanonical(tx, duplicate, transactionCanonical);
    }
  });

  const matched = await findBestB2bEmployeeIdentityMatch(input);
  if (!matched) return null;

  return reconcileMatchedB2bEmployeeIdentity({
    employeeId: matched.id,
    nextIdentity: input,
  });
}

export async function reconcileMatchedB2bEmployeeIdentity(input: {
  employeeId: string;
  nextIdentity: B2bEmployeeIdentityMatchInput;
}) {
  const current = await db.b2bEmployee.findUnique({
    where: { id: input.employeeId },
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      linkedProvider: true,
      lastSyncedAt: true,
      updatedAt: true,
    },
  });

  if (!current) return null;

  const updateData: {
    appUserId?: string | null;
    name?: string;
    birthDate?: string;
    phoneNormalized?: string;
    identityHash?: string;
    updatedAt?: Date;
  } = {};

  if (input.nextIdentity.appUserId && current.appUserId !== input.nextIdentity.appUserId) {
    updateData.appUserId = input.nextIdentity.appUserId;
  }
  if (current.name !== input.nextIdentity.name) {
    updateData.name = input.nextIdentity.name;
  }
  if (current.birthDate !== input.nextIdentity.birthDate) {
    updateData.birthDate = input.nextIdentity.birthDate;
  }
  if (current.phoneNormalized !== input.nextIdentity.phoneNormalized) {
    updateData.phoneNormalized = input.nextIdentity.phoneNormalized;
  }
  const shouldRefreshIdentityHash =
    current.birthDate !== input.nextIdentity.birthDate ||
    current.phoneNormalized !== input.nextIdentity.phoneNormalized;

  if (shouldRefreshIdentityHash && current.identityHash !== input.nextIdentity.identityHash) {
    const duplicate = await db.b2bEmployee.findUnique({
      where: { identityHash: input.nextIdentity.identityHash },
      select: { id: true },
    });
    if (!duplicate || duplicate.id === current.id) {
      updateData.identityHash = input.nextIdentity.identityHash;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return current;
  }

  return db.b2bEmployee.update({
    where: { id: current.id },
    data: {
      ...updateData,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      linkedProvider: true,
      lastSyncedAt: true,
      updatedAt: true,
    },
  });
}
