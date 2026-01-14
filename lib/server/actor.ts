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
    select: { id: true, clientId: true },
  });
  if (!existing) {
    return db.appUser.create({
      data: { kakaoId, clientId: deviceClientId ?? undefined },
      select: { id: true, clientId: true },
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

export async function resolveActorForRequest(
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

  const appUserId = loggedIn
    ? (await ensureAppUserForKakao(String(user.kakaoId), deviceClientId)).id
    : null;

  return {
    deviceClientId: deviceClientId ?? null,
    appUserId,
    loggedIn,
    cookieToSet,
  };
}

export async function resolveActorForServerComponent(): Promise<RequestActor> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const { getClientIdFromRequest } = await import("@/lib/server/client");
  const deviceClientId = await getClientIdFromRequest();
  const appUserId = loggedIn
    ? (await ensureAppUserForKakao(String(user.kakaoId), deviceClientId)).id
    : null;

  return {
    deviceClientId,
    appUserId,
    loggedIn,
  };
}
