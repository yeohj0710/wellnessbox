import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { CLIENT_COOKIE_NAME } from "../shared/client-id";
import {
  buildClientCookie,
  ensureClient,
  resolveClientIdFromRequest,
  resolveOrCreateClientId,
} from "./client";

type AttachSource =
  | "kakao-login"
  | "phone-link"
  | "profile-sync"
  | "session-sync";

type AttachResult = {
  clientId: string | null;
  attached: boolean;
  mergedFrom: string[];
  cookieToSet?: ReturnType<typeof buildClientCookie>;
};

type MergeSummary = {
  movedFrom: string[];
};

type ResolveResult = {
  clientId: string | null;
  cookieToSet?: ReturnType<typeof buildClientCookie>;
  appUserId?: string;
};

function sanitizeCandidate(
  loggedIn: boolean,
  candidate: string | null | undefined,
  source: Parameters<typeof resolveClientIdFromRequest>[2]
) {
  if (!loggedIn) return candidate;
  if (source === "body" || source === "query") return undefined;
  return candidate;
}

async function pickPreferredClientId(
  current: string | null,
  incoming: string | null
): Promise<string | null> {
  if (current && incoming && current === incoming) return current;
  if (!current) return incoming;
  if (!incoming) return current;

  const rows = await db.client.findMany({
    where: { id: { in: [current, incoming] } },
    select: { id: true, lastSeenAt: true, createdAt: true },
  });

  const map = new Map(rows.map((r) => [r.id, r]));
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

  const fromProfile = profiles.find((p) => p.clientId === fromClientId);
  const toProfile = profiles.find((p) => p.clientId === toClientId);

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
      data: { data: fromProfile.data },
    });
  }

  await tx.userProfile.delete({ where: { clientId: fromClientId } });
}

async function mergeClientData(
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

function maskPhone(phone?: string | null) {
  if (!phone) return phone;
  return phone.replace(/(\d{3})\d*(\d{2})/, "$1***$2");
}

export async function attachClientToAppUser(options: {
  req?: NextRequest;
  kakaoId: string;
  source: AttachSource;
  candidateClientId?: string | null;
  candidateSource?: Parameters<typeof resolveClientIdFromRequest>[2];
  userAgent?: string | null;
}): Promise<AttachResult> {
  const { req, kakaoId, source, candidateClientId, candidateSource } = options;
  const trustedCandidate = sanitizeCandidate(true, candidateClientId, candidateSource ?? "candidate");
  const { clientId: resolvedClientId, cookieToSet: baseCookie } = req
    ? resolveClientIdFromRequest(req, trustedCandidate ?? undefined, candidateSource)
    : { clientId: trustedCandidate ?? null, cookieToSet: undefined };

  let clientId = resolvedClientId ?? null;
  let cookieToSet = baseCookie;

  const appUser = await db.appUser.findUnique({
    where: { kakaoId },
    select: {
      id: true,
      clientId: true,
      kakaoId: true,
      phone: true,
      phoneLinkedAt: true,
    },
  });

  if (!appUser) {
    return { clientId, attached: false, mergedFrom: [], cookieToSet };
  }

  const conflictUser = clientId
    ? await db.appUser.findFirst({
        where: { clientId, NOT: { id: appUser.id } },
        select: { id: true, kakaoId: true },
      })
    : null;

  if (conflictUser) {
    console.warn("clientId conflict detected", {
      source,
      kakaoId,
      existingUser: conflictUser.kakaoId,
      clientId,
    });
    clientId = appUser.clientId ?? null;
  }

  const preferredClientId = await pickPreferredClientId(appUser.clientId, clientId);
  const finalClientId = preferredClientId ?? resolveOrCreateClientId(clientId ?? appUser.clientId ?? undefined);

  if (appUser.clientId === finalClientId && (!clientId || clientId === finalClientId)) {
    if (req && (!cookieToSet || cookieToSet.value !== finalClientId)) {
      cookieToSet = buildClientCookie(finalClientId, req.nextUrl.protocol === "https:");
    }
    return {
      clientId: finalClientId,
      attached: false,
      mergedFrom: [],
      cookieToSet,
    };
  }

  if (req && (!cookieToSet || cookieToSet.value !== finalClientId)) {
    cookieToSet = buildClientCookie(finalClientId, req.nextUrl.protocol === "https:");
  }

  await ensureClient(finalClientId, {
    userAgent: options.userAgent ?? req?.headers.get("user-agent") ?? undefined,
  });

  const mergedFrom: string[] = [];
  if (appUser.clientId && appUser.clientId !== finalClientId) {
    const summary = await mergeClientData(appUser.clientId, finalClientId);
    mergedFrom.push(...summary.movedFrom);
  }
  if (clientId && clientId !== finalClientId && clientId !== appUser.clientId) {
    const summary = await mergeClientData(clientId, finalClientId);
    mergedFrom.push(...summary.movedFrom);
  }

  await db.appUser.update({
    where: { id: appUser.id },
    data: { clientId: finalClientId },
  });

  console.info("attached client to app user", {
    source,
    kakaoId,
    clientId: finalClientId,
    mergedFrom,
    phoneLinkedAt: appUser.phoneLinkedAt,
    phone: maskPhone(appUser.phone),
  });

  return {
    clientId: finalClientId,
    attached: true,
    mergedFrom,
    cookieToSet,
  };
}

export async function resolveClientIdForRead(
  req: NextRequest,
  candidate?: string | null,
  candidateSource: Parameters<typeof resolveClientIdFromRequest>[2] = "candidate"
): Promise<ResolveResult> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const trustedCandidate = sanitizeCandidate(loggedIn, candidate, candidateSource);

  const base = resolveClientIdFromRequest(req, trustedCandidate ?? undefined, candidateSource);
  let clientId = base.clientId;
  let cookieToSet = base.cookieToSet;
  let appUserId: string | undefined;

  if (loggedIn) {
    const appUser = await db.appUser.findUnique({
      where: { kakaoId: String(user.kakaoId) },
      select: { id: true, clientId: true },
    });

    appUserId = appUser?.id;
    if (appUser?.clientId) {
      clientId = appUser.clientId;
      const cookieVal = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
      if (!cookieToSet && cookieVal !== clientId) {
        cookieToSet = buildClientCookie(clientId, req.nextUrl.protocol === "https:");
      }
    }
  }

  return { clientId: clientId ?? null, cookieToSet, appUserId };
}

export async function resolveClientIdForWrite(
  req: NextRequest,
  candidate?: string | null,
  candidateSource: Parameters<typeof resolveClientIdFromRequest>[2] = "candidate"
): Promise<ResolveResult> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const trustedCandidate = sanitizeCandidate(loggedIn, candidate, candidateSource);

  const base = resolveClientIdFromRequest(req, trustedCandidate ?? undefined, candidateSource);
  let clientId = base.clientId;
  let cookieToSet = base.cookieToSet;
  let appUserId: string | undefined;

  if (loggedIn) {
    const appUser = await db.appUser.findUnique({
      where: { kakaoId: String(user.kakaoId) },
      select: { id: true, clientId: true },
    });

    appUserId = appUser?.id;
    if (appUser?.clientId) {
      clientId = appUser.clientId;
    }
  }

  const finalClientId = resolveOrCreateClientId(clientId);
  if (req) {
    const cookieVal = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
    if (!cookieToSet && cookieVal !== finalClientId) {
      cookieToSet = buildClientCookie(finalClientId, req.nextUrl.protocol === "https:");
    }
  }

  return { clientId: finalClientId, cookieToSet, appUserId };
}

export function withClientCookie(response: NextResponse, cookie?: ReturnType<typeof buildClientCookie>) {
  if (!cookie) return response;
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
