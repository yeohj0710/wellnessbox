import type { NextRequest } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { CLIENT_COOKIE_NAME } from "@/lib/shared/client-id";
import {
  buildClientCookie,
  resolveClientIdFromRequest,
  resolveOrCreateClientId,
} from "@/lib/server/client";

type ActorIntent = "read" | "write";

export type RequestActor = {
  deviceClientId: string | null;
  appUserId: string | null;
  loggedIn: boolean;
  cookieToSet?: ReturnType<typeof buildClientCookie>;
};

type ResolveActorOptions = {
  intent?: ActorIntent;
  candidate?: string | null;
  candidateSource?: Parameters<typeof resolveClientIdFromRequest>[2];
};

async function findAppUserId(kakaoId: string) {
  return db.appUser.findUnique({
    where: { kakaoId },
    select: { id: true },
  });
}

export async function resolveActorForRequest(
  req: NextRequest,
  options: ResolveActorOptions = {}
): Promise<RequestActor> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const intent: ActorIntent = options.intent ?? "read";
  const candidate = loggedIn ? null : options.candidate ?? null;
  const candidateSource = loggedIn ? "candidate" : options.candidateSource;

  const base = resolveClientIdFromRequest(
    req,
    candidate ?? undefined,
    candidateSource
  );
  let deviceClientId = base.clientId;
  let cookieToSet = base.cookieToSet;

  if (intent === "write" && !deviceClientId) {
    deviceClientId = resolveOrCreateClientId(null);
  }

  const cookieVal = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
  if (
    intent === "write" &&
    deviceClientId &&
    !cookieToSet &&
    cookieVal !== deviceClientId
  ) {
    cookieToSet = buildClientCookie(
      deviceClientId,
      req.nextUrl.protocol === "https:"
    );
  }

  const appUserId = loggedIn
    ? (await findAppUserId(String(user.kakaoId)))?.id ?? null
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
  const appUserId = loggedIn
    ? (await findAppUserId(String(user.kakaoId)))?.id ?? null
    : null;
  const { getClientIdFromRequest } = await import("@/lib/server/client");
  const deviceClientId = await getClientIdFromRequest();

  return {
    deviceClientId,
    appUserId,
    loggedIn,
  };
}
