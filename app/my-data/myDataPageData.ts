import type { Prisma, UserProfile } from "@prisma/client";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { resolveActorForServerComponent } from "@/lib/server/actor";

export type SessionUser = {
  kakaoId: number;
  loggedIn: boolean;
  nickname?: string;
  profileImageUrl?: string;
  email?: string;
  kakaoEmail?: string;
  phone?: string;
  phoneLinkedAt?: string;
};

const APP_USER_SELECT = {
  id: true,
  kakaoId: true,
  clientId: true,
  nickname: true,
  email: true,
  kakaoEmail: true,
  phone: true,
  phoneLinkedAt: true,
  profileImageUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AppUserSelect;

const ORDER_INCLUDE = {
  pharmacy: true,
  orderItems: {
    include: {
      pharmacyProduct: {
        include: { product: true },
      },
    },
  },
} satisfies Prisma.OrderInclude;

const CHAT_SESSION_INCLUDE = {
  messages: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ChatSessionInclude;

type ChatSessionQuery = {
  where: Prisma.ChatSessionWhereInput;
  orderBy: Prisma.ChatSessionOrderByWithRelationInput;
  include: typeof CHAT_SESSION_INCLUDE;
};

export type MyDataAppUser = Prisma.AppUserGetPayload<{
  select: typeof APP_USER_SELECT;
}>;

export type MyDataOrder = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

export type MyDataChatSession = Prisma.ChatSessionGetPayload<{
  include: typeof CHAT_SESSION_INCLUDE;
}>;

export type MyDataActorContext = {
  user: Partial<SessionUser> | undefined;
  isKakaoLoggedIn: boolean;
  deviceClientId: string | null;
  appUserId: string | null;
  phoneLinked: boolean;
  appUser: MyDataAppUser | null;
};

export type MyDataCollections = {
  profile: UserProfile | null;
  assessResults: Awaited<ReturnType<typeof db.assessmentResult.findMany>>;
  checkAiResults: Awaited<ReturnType<typeof db.checkAiResult.findMany>>;
  orders: MyDataOrder[];
  chatSessions: MyDataChatSession[];
};

function resolveResultWhere(
  isKakaoLoggedIn: boolean,
  appUserId: string | null,
  deviceClientId: string | null
) {
  if (isKakaoLoggedIn) {
    return appUserId ? { appUserId } : { id: "missing" };
  }
  return { clientId: deviceClientId ?? "missing" };
}

function resolveOrderWhere(
  isKakaoLoggedIn: boolean,
  phoneLinked: boolean,
  appUserId: string | null,
  deviceClientId: string | null
) {
  if (isKakaoLoggedIn) {
    return phoneLinked && appUserId ? { appUserId } : { id: -1 };
  }
  return deviceClientId ? { endpoint: deviceClientId } : { id: -1 };
}

function resolveChatSessionQuery(
  isKakaoLoggedIn: boolean,
  appUserId: string | null,
  deviceClientId: string | null
): ChatSessionQuery | null {
  if (isKakaoLoggedIn && appUserId) {
    return {
      where: {
        OR: [
          { appUserId },
          deviceClientId
            ? { clientId: deviceClientId, appUserId: null }
            : { id: "missing" },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: CHAT_SESSION_INCLUDE,
    };
  }

  if (deviceClientId) {
    return {
      where: { clientId: deviceClientId, appUserId: null },
      orderBy: { updatedAt: "desc" },
      include: CHAT_SESSION_INCLUDE,
    };
  }

  return null;
}

export async function loadMyDataActorContext(): Promise<MyDataActorContext> {
  const session = await getSession();
  const user = session.user as Partial<SessionUser> | undefined;
  const isKakaoLoggedIn =
    user?.loggedIn === true && typeof user.kakaoId === "number";

  const actor = await resolveActorForServerComponent();
  const deviceClientId = actor.deviceClientId ?? null;
  const appUserId = actor.appUserId ?? null;
  const phoneLinked = actor.phoneLinked === true;

  const appUser = isKakaoLoggedIn
    ? await db.appUser.findUnique({
        where: { kakaoId: String(user.kakaoId) },
        select: APP_USER_SELECT,
      })
    : null;

  return {
    user,
    isKakaoLoggedIn,
    deviceClientId,
    appUserId,
    phoneLinked,
    appUser,
  };
}

export async function loadMyDataCollections(input: {
  isKakaoLoggedIn: boolean;
  appUserId: string | null;
  deviceClientId: string | null;
  phoneLinked: boolean;
}): Promise<MyDataCollections> {
  const { isKakaoLoggedIn, appUserId, deviceClientId, phoneLinked } = input;

  if (!deviceClientId && !appUserId) {
    return {
      profile: null,
      assessResults: [],
      checkAiResults: [],
      orders: [],
      chatSessions: [],
    };
  }

  const resultWhere = resolveResultWhere(
    isKakaoLoggedIn,
    appUserId,
    deviceClientId
  );
  const orderWhere = resolveOrderWhere(
    isKakaoLoggedIn,
    phoneLinked,
    appUserId,
    deviceClientId
  );
  const chatSessionQuery = resolveChatSessionQuery(
    isKakaoLoggedIn,
    appUserId,
    deviceClientId
  );

  const [profile, assessResults, checkAiResults, orders, chatSessions] =
    await Promise.all([
      deviceClientId
        ? db.userProfile.findUnique({
            where: { clientId: deviceClientId },
          })
        : Promise.resolve(null),
      db.assessmentResult.findMany({
        where: resultWhere,
        orderBy: { createdAt: "desc" },
      }),
      db.checkAiResult.findMany({
        where: resultWhere,
        orderBy: { createdAt: "desc" },
      }),
      db.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: "desc" },
        include: ORDER_INCLUDE,
      }),
      chatSessionQuery
        ? db.chatSession.findMany(chatSessionQuery)
        : Promise.resolve<MyDataChatSession[]>([]),
    ]);

  return {
    profile,
    assessResults,
    checkAiResults,
    orders,
    chatSessions,
  };
}

export function readProfilePhone(profile: UserProfile | null): string | undefined {
  if (!profile?.data || typeof profile.data !== "object") return undefined;
  const phone = (profile.data as Record<string, unknown>).phone;
  return typeof phone === "string" ? phone : undefined;
}
