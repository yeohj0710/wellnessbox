import "server-only";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { backfillOrdersForAppUser } from "@/lib/server/app-user-sync";

type LinkPhoneResult = {
  phone: string;
  linkedAt: string;
};

type ResolvePhoneStatusResult = {
  phone: string;
  linkedAt: string | undefined;
};

export async function linkPhoneForUser(input: {
  kakaoId: string;
  phone: string;
  now?: Date;
}): Promise<LinkPhoneResult> {
  const now = input.now ?? new Date();
  const linkedAt = now.toISOString();
  const linkedAtDate = new Date(linkedAt);

  const profile = await db.appUser.findUnique({
    where: { kakaoId: input.kakaoId },
    select: { clientId: true },
  });
  const resolvedClientId = profile?.clientId ?? undefined;

  const updatedUser = await db.appUser.upsert({
    where: { kakaoId: input.kakaoId },
    create: {
      kakaoId: input.kakaoId,
      clientId: resolvedClientId,
      phone: input.phone,
      phoneLinkedAt: linkedAtDate,
    },
    update: {
      clientId: resolvedClientId,
      phone: input.phone,
      phoneLinkedAt: linkedAtDate,
    },
    select: { id: true },
  });

  await backfillOrdersForAppUser(updatedUser.id, input.phone);
  return { phone: input.phone, linkedAt };
}

export async function syncLinkedPhoneToSession(input: LinkPhoneResult) {
  const session = await getSession();
  if (!session.user?.loggedIn) return;

  session.user = {
    ...session.user,
    phone: input.phone,
    phoneLinkedAt: input.linkedAt,
  };
  await session.save();
}

export async function clearPhoneFromSession() {
  const session = await getSession();
  if (!session.user?.loggedIn) return;

  session.user = {
    ...session.user,
    phone: undefined,
    phoneLinkedAt: undefined,
  };
  await session.save();
}

export async function unlinkPhoneForUser(kakaoId: string) {
  await db.appUser.updateMany({
    where: { kakaoId },
    data: { phone: null, phoneLinkedAt: null },
  });
}

export async function resolvePhoneStatusForUser(input: {
  kakaoId: string;
  sessionPhone: string;
}): Promise<ResolvePhoneStatusResult> {
  let phone = input.sessionPhone;
  let linkedAt: string | undefined;

  const profile = await db.appUser.findUnique({
    where: { kakaoId: input.kakaoId },
    select: { phone: true, phoneLinkedAt: true },
  });

  if (profile) {
    phone = typeof profile.phone === "string" ? profile.phone : phone;
    linkedAt = profile.phoneLinkedAt ? profile.phoneLinkedAt.toISOString() : undefined;
  }

  return { phone, linkedAt };
}
