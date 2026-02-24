import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
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
import { maskPhone, mergeClientData, pickPreferredClientId } from "./client-link.merge";
import {
  findAppUserClient,
  resolveSessionContext,
  sanitizeCandidate,
  type SessionResolutionContext,
} from "./client-link.session";

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

type ResolveResult = {
  clientId: string | null;
  cookieToSet?: ReturnType<typeof buildClientCookie>;
  appUserId?: string;
};

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
  const context = await resolveSessionContext(candidate, candidateSource);
  return resolveClientIdForReadWithContext(req, context, candidateSource);
}

export async function resolveClientIdForWrite(
  req: NextRequest,
  candidate?: string | null,
  candidateSource?: ClientIdCandidateSource
): Promise<ResolveResult> {
  const context = await resolveSessionContext(candidate, candidateSource);
  return resolveClientIdForWriteWithContext(req, context, candidateSource);
}

export async function resolveClientIdForAppUserRequest(
  req: NextRequest,
  candidate?: string | null,
  candidateSource?: ClientIdCandidateSource,
  intent: "read" | "write" = "read"
): Promise<ResolveResult> {
  const context = await resolveSessionContext(candidate, candidateSource);
  return intent === "write"
    ? resolveClientIdForWriteWithContext(req, context, candidateSource)
    : resolveClientIdForReadWithContext(req, context, candidateSource);
}

async function resolveClientIdForReadWithContext(
  req: NextRequest,
  context: SessionResolutionContext,
  candidateSource?: ClientIdCandidateSource
): Promise<ResolveResult> {
  if (context.loggedIn && context.kakaoId) {
    const appUser = await findAppUserClient(context.kakaoId);
    return {
      clientId: appUser?.clientId ?? null,
      appUserId: appUser?.id,
    };
  }

  const base = resolveClientIdFromRequest(
    req,
    context.trustedCandidate,
    candidateSource
  );

  return { clientId: base.clientId ?? null, cookieToSet: base.cookieToSet };
}

async function resolveClientIdForWriteWithContext(
  req: NextRequest,
  context: SessionResolutionContext,
  candidateSource?: ClientIdCandidateSource
): Promise<ResolveResult> {
  if (context.loggedIn && context.kakaoId) {
    const appUser = await findAppUserClient(context.kakaoId);
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
    context.trustedCandidate,
    candidateSource
  );
  let cookieToSet = base.cookieToSet;
  const finalClientId = resolveOrCreateClientId(base.clientId);
  const cookieVal = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
  if (!cookieToSet && cookieVal !== finalClientId) {
    cookieToSet = buildClientCookie(finalClientId, isRequestHttps(req));
  }

  return { clientId: finalClientId, cookieToSet };
}

export function withClientCookie(
  response: NextResponse,
  cookie?: ReturnType<typeof buildClientCookie>
) {
  if (!cookie) return response;
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
