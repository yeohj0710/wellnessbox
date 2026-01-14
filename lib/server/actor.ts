import type { NextRequest } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { CLIENT_COOKIE_NAME } from "@/lib/shared/client-id";
import {
  buildClientCookie,
  isRequestHttps,
  resolveClientIdFromRequest,
  resolveOrCreateClientId,
} from "@/lib/server/client";

export type RequestActor = {
  deviceClientId: string | null;
  appUserId: string | null;
  loggedIn: boolean;
  phoneLinked: boolean;
  phone?: string | null;
  cookieToSet?: ReturnType<typeof buildClientCookie>;
};

type ActorIntent = "read" | "write";

type ResolveActorOptions = {
  intent?: ActorIntent;
};

async function ensureAppUserForKakao(
  kakaoId: string,
  deviceClientId: string | null
) {
  const existing = await db.appUser.findUnique({
    where: { kakaoId },
    select: { id: true, clientId: true, phone: true, phoneLinkedAt: true },
  });
  if (!existing) {
    return db.appUser.create({
      data: { kakaoId, clientId: deviceClientId ?? undefined },
      select: { id: true, clientId: true, phone: true, phoneLinkedAt: true },
    });
  }
  if (!existing.clientId && deviceClientId) {
    await db.appUser.update({
      where: { id: existing.id },
      data: { clientId: deviceClientId },
    });
  }
  return existing;
}

async function resolveActorContextForRequest(
  req: NextRequest,
  options: ResolveActorOptions = {}
): Promise<RequestActor> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const intent: ActorIntent = options.intent ?? "read";
  const requestIsHttps = isRequestHttps(req);

  const base = resolveClientIdFromRequest(req);
  let deviceClientId = base.clientId;
  let cookieToSet = intent === "write" ? base.cookieToSet : undefined;

  if (intent === "write" && !deviceClientId) {
    deviceClientId = resolveOrCreateClientId(null);
    cookieToSet = buildClientCookie(
      deviceClientId,
      requestIsHttps
    );
  }

  const cookieVal = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
  if (intent === "write" && deviceClientId && !cookieToSet && cookieVal !== deviceClientId) {
    cookieToSet = buildClientCookie(
      deviceClientId,
      requestIsHttps
    );
  }

  const appUser = loggedIn
    ? await ensureAppUserForKakao(String(user.kakaoId), deviceClientId)
    : null;

  return {
    deviceClientId: deviceClientId ?? null,
    appUserId: appUser?.id ?? null,
    loggedIn,
    phoneLinked: !!appUser?.phoneLinkedAt,
    phone: appUser?.phone ?? null,
    cookieToSet,
  };
}

export async function resolveActorForRequest(
  req: NextRequest,
  options: ResolveActorOptions = {}
): Promise<RequestActor> {
  return resolveActorContextForRequest(req, options);
}

async function resolveActorContextForServerComponent(): Promise<RequestActor> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const { getClientIdFromRequest } = await import("@/lib/server/client");
  const deviceClientId = await getClientIdFromRequest();
  const appUser = loggedIn
    ? await ensureAppUserForKakao(String(user.kakaoId), deviceClientId)
    : null;

  return {
    deviceClientId,
    appUserId: appUser?.id ?? null,
    loggedIn,
    phoneLinked: !!appUser?.phoneLinkedAt,
    phone: appUser?.phone ?? null,
  };
}

export async function resolveActorForServerComponent(): Promise<RequestActor> {
  return resolveActorContextForServerComponent();
}

export async function getActorContextForRequest(
  req: NextRequest,
  options: ResolveActorOptions = {}
): Promise<RequestActor> {
  return resolveActorContextForRequest(req, options);
}

export async function getActorContextForServerComponent(): Promise<RequestActor> {
  return resolveActorContextForServerComponent();
}
