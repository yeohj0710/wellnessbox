import db from "@/lib/db";
import getSession from "@/lib/session";
import type { ClientIdCandidateSource } from "./client";

export type SessionResolutionContext = {
  loggedIn: boolean;
  kakaoId?: string;
  trustedCandidate?: string;
};

export function sanitizeCandidate(
  loggedIn: boolean,
  candidate: string | null | undefined,
  source: ClientIdCandidateSource | undefined
) {
  if (loggedIn) return undefined;
  if (source === "header") return candidate;
  return undefined;
}

export async function resolveSessionContext(
  candidate?: string | null,
  candidateSource?: ClientIdCandidateSource
): Promise<SessionResolutionContext> {
  const session = await getSession();
  const user = session.user;
  const loggedIn = !!user?.loggedIn && typeof user.kakaoId === "number";
  const trustedCandidate = sanitizeCandidate(
    loggedIn,
    candidate,
    candidateSource
  );

  return {
    loggedIn,
    kakaoId: loggedIn ? String(user.kakaoId) : undefined,
    trustedCandidate: trustedCandidate ?? undefined,
  };
}

export async function findAppUserClient(kakaoId: string) {
  return db.appUser.findUnique({
    where: { kakaoId },
    select: { id: true, clientId: true },
  });
}
