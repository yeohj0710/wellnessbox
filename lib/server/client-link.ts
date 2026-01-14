import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { CLIENT_COOKIE_NAME } from "../shared/client-id";
import {
  buildClientCookie,
  ensureClient,
  isRequestHttps,
  resolveClientIdFromRequest,
  resolveOrCreateClientId,
  type ClientIdCandidateSource,
} from "./client";
import { backfillLoginDataForAppUser } from "@/lib/server/app-user-sync";

type AttachSource =
  | "kakao-login"
  | "phone-link"
  | "profile-sync"
  | "session-sync"
  | "kakao-app-bridge";

type AttachResult = {
  clientId: string | null;
  attached: boolean;
  mergedFrom: string[];
  cookieToSet?: ReturnType<typeof buildClientCookie>;
  appUserId?: string;
};

type MergeSummary = {
  movedFrom: string[];
};

type ResolveResult = {
  clientId: string | null;
  cookieToSet?: ReturnType<typeof buildClientCookie>;
  appUserId?: string;
};

async function findAppUserClient(kakaoId: string) {
  return db.appUser.findUnique({
    where: { kakaoId },
    select: { id: true, clientId: true },
  });
}

function sanitizeCandidate(
  loggedIn: boolean,
  candidate: string | null | undefined,
  source: ClientIdCandidateSource | undefined
) {
  if (loggedIn) return undefined;
  if (source === "header") return candidate;
  return undefined;
}

async function pickPreferredClientId(
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
      data: { data: fromProfile.data as Prisma.InputJsonValue },
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
  candidateSource?: ClientIdCandidateSource;
  userAgent?: string | null;
  allowMerge?: boolean;
  mergeWithinMs?: number;
}): Promise<AttachResult> {
  const { req, kakaoId, source, candidateClientId, candidateSource } = options;
  const allowMerge = options.allowMerge === true;
  const mergeWithinMs =
    typeof options.mergeWithinMs === "number"
      ? options.mergeWithinMs
      : 15 * 60 * 1000;
  const trustedCandidate = sanitizeCandidate(
    true,
    candidateClientId,
    candidateSource
  );
  const { clientId: resolvedClientId, cookieToSet: baseCookie } = req
    ? resolveClientIdFromRequest(
        req,
        trustedCandidate ?? undefined,
        candidateSource
      )
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

  const candidateRow =
    allowMerge && clientId
      ? await db.client.findUnique({
          where: { id: clientId },
          select: {
            id: true,
            lastSeenAt: true,
            createdAt: true,
            userAgent: true,
          },
        })
      : null;

  const candidateLastSeen = candidateRow?.lastSeenAt ?? candidateRow?.createdAt;
  const candidateRecent =
    allowMerge &&
    !!candidateLastSeen &&
    Date.now() - candidateLastSeen.getTime() <= mergeWithinMs &&
    (!candidateRow?.userAgent ||
      !options.userAgent ||
      candidateRow.userAgent === options.userAgent);

  const candidateForMerge = candidateRecent ? clientId : null;
  const preferredClientId = await pickPreferredClientId(
    appUser.clientId,
    candidateForMerge
  );
  const finalClientId =
    preferredClientId ?? appUser.clientId ?? resolveOrCreateClientId(null);

  if (req && (!cookieToSet || cookieToSet.value !== finalClientId)) {
    cookieToSet = buildClientCookie(
      finalClientId,
      isRequestHttps(req)
    );
  }

  await ensureClient(finalClientId, {
    userAgent: options.userAgent ?? req?.headers.get("user-agent") ?? undefined,
  });

  const mergedFrom: string[] = [];
  if (allowMerge && appUser.clientId && appUser.clientId !== finalClientId) {
    const summary = await mergeClientData(appUser.clientId, finalClientId);
    mergedFrom.push(...summary.movedFrom);
  }

  if (allowMerge && candidateForMerge && candidateForMerge !== finalClientId) {
    const summary = await mergeClientData(candidateForMerge, finalClientId);
    mergedFrom.push(...summary.movedFrom);
  }

  if (appUser.clientId !== finalClientId) {
    await db.appUser.update({
      where: { id: appUser.id },
      data: { clientId: finalClientId },
    });
  }

  await backfillLoginDataForAppUser({
    appUserId: appUser.id,
    clientId: finalClientId,
  });

  console.info("attached client to app user", {
    source,
    kakaoId,
    clientId: finalClientId,
    mergedFrom,
    phoneLinkedAt: appUser.phoneLinkedAt,
    phone: maskPhone(appUser.phone),
    merged: allowMerge && mergedFrom.length > 0,
    mergeWithinMs,
  });

  return {
    clientId: finalClientId,
    attached: true,
    mergedFrom,
    cookieToSet,
    appUserId: appUser.id,
  };
}

export async function resolveClientIdForRead(
  req: NextRequest,
  candidate?: string | null,
  candidateSource?: ClientIdCandidateSource
): Promise<ResolveResult> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const trustedCandidate = sanitizeCandidate(
    loggedIn,
    candidate,
    candidateSource
  );

  if (loggedIn) {
    const appUser = await findAppUserClient(String(user.kakaoId));
    return {
      clientId: appUser?.clientId ?? null,
      appUserId: appUser?.id,
    };
  }

  const base = resolveClientIdFromRequest(
    req,
    trustedCandidate ?? undefined,
    candidateSource
  );
  let clientId = base.clientId;
  let cookieToSet = base.cookieToSet;
  let appUserId: string | undefined;

  return { clientId: clientId ?? null, cookieToSet, appUserId };
}

export async function resolveClientIdForWrite(
  req: NextRequest,
  candidate?: string | null,
  candidateSource?: ClientIdCandidateSource
): Promise<ResolveResult> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const trustedCandidate = sanitizeCandidate(
    loggedIn,
    candidate,
    candidateSource
  );

  if (loggedIn) {
    const appUser = await findAppUserClient(String(user.kakaoId));
    if (!appUser) {
      return { clientId: null };
    }
    if (appUser.clientId) {
      return { clientId: appUser.clientId, appUserId: appUser.id };
    }
    const clientId = resolveOrCreateClientId(null);
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    await db.appUser.update({
      where: { id: appUser.id },
      data: { clientId },
    });
    return { clientId, appUserId: appUser.id };
  }

  const base = resolveClientIdFromRequest(
    req,
    trustedCandidate ?? undefined,
    candidateSource
  );
  let clientId = base.clientId;
  let cookieToSet = base.cookieToSet;
  const finalClientId = resolveOrCreateClientId(clientId);
  const cookieVal = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
  if (!cookieToSet && cookieVal !== finalClientId) {
    cookieToSet = buildClientCookie(
      finalClientId,
      isRequestHttps(req)
    );
  }

  return { clientId: finalClientId, cookieToSet };
}

export async function resolveClientIdForAppUserRequest(
  req: NextRequest,
  candidate?: string | null,
  candidateSource?: ClientIdCandidateSource,
  intent: "read" | "write" = "read"
): Promise<ResolveResult> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const trustedCandidate = sanitizeCandidate(
    loggedIn,
    candidate,
    candidateSource
  );

  return intent === "write"
    ? resolveClientIdForWrite(req, trustedCandidate, candidateSource)
    : resolveClientIdForRead(req, trustedCandidate, candidateSource);
}

export function withClientCookie(
  response: NextResponse,
  cookie?: ReturnType<typeof buildClientCookie>
) {
  if (!cookie) return response;
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
