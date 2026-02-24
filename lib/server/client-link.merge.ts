import { Prisma } from "@prisma/client";
import db from "@/lib/db";

export type MergeSummary = {
  movedFrom: string[];
};

export async function pickPreferredClientId(
  current: string | null,
  incoming: string | null
): Promise<string | null> {
  if (current && incoming && current === incoming) return current;
  if (!current) return incoming;
  if (!incoming) return current;

  const ids = [current, incoming].filter(Boolean) as string[];
  const rows = await db.client.findMany({
    where: { id: { in: ids } },
    select: { id: true, lastSeenAt: true, createdAt: true },
  });

  const map = new Map(rows.map((row) => [row.id, row]));
  const currentRow = map.get(current);
  const incomingRow = map.get(incoming);

  const currentSeen = currentRow?.lastSeenAt ?? currentRow?.createdAt;
  const incomingSeen = incomingRow?.lastSeenAt ?? incomingRow?.createdAt;

  if (!currentSeen && incomingSeen) return incoming;
  if (!incomingSeen && currentSeen) return current;
  if (!currentSeen && !incomingSeen) return incoming;

  if ((incomingSeen?.getTime() ?? 0) >= (currentSeen?.getTime() ?? 0)) {
    return incoming;
  }

  return current;
}

async function mergeUserProfiles(
  fromClientId: string,
  toClientId: string,
  tx: Prisma.TransactionClient
) {
  const profiles = await tx.userProfile.findMany({
    where: { clientId: { in: [fromClientId, toClientId] } },
  });

  const fromProfile = profiles.find((profile) => profile.clientId === fromClientId);
  const toProfile = profiles.find((profile) => profile.clientId === toClientId);

  if (fromProfile && !toProfile) {
    await tx.userProfile.update({
      where: { clientId: fromClientId },
      data: { clientId: toClientId },
    });
    return;
  }

  if (!fromProfile || !toProfile) return;

  const preferFrom = fromProfile.updatedAt > toProfile.updatedAt;
  if (preferFrom) {
    await tx.userProfile.update({
      where: { clientId: toClientId },
      data: { data: fromProfile.data as Prisma.InputJsonValue },
    });
  }

  await tx.userProfile.delete({ where: { clientId: fromClientId } });
}

export async function mergeClientData(
  fromClientId: string,
  toClientId: string
): Promise<MergeSummary> {
  if (fromClientId === toClientId) return { movedFrom: [] };

  await db.$transaction(async (tx) => {
    await tx.assessmentResult.updateMany({
      where: { clientId: fromClientId },
      data: { clientId: toClientId },
    });

    await tx.checkAiResult.updateMany({
      where: { clientId: fromClientId },
      data: { clientId: toClientId },
    });

    await tx.chatSession.updateMany({
      where: { clientId: fromClientId },
      data: { clientId: toClientId },
    });

    await mergeUserProfiles(fromClientId, toClientId, tx);

    await tx.order.updateMany({
      where: { endpoint: fromClientId },
      data: { endpoint: toClientId },
    });
  });

  return { movedFrom: [fromClientId] };
}

export function maskPhone(phone?: string | null) {
  if (!phone) return phone;
  return phone.replace(/(\d{3})\d*(\d{2})/, "$1***$2");
}
