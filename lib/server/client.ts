import { Prisma } from "@prisma/client";
import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  CLIENT_COOKIE_NAME,
  CLIENT_ID_HEADER,
  CLIENT_ID_MAX_AGE,
  LEGACY_CLIENT_ID_HEADER,
  generateClientId,
  isLikelyBot,
  isValidClientIdValue,
} from "../shared/client-id";

const LAST_SEEN_UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

type EnsureClientInit = {
  userAgent?: string | null;
  pushEndpoint?: string | null;
  ipHash?: string | null;
};

export async function getClientIdFromRequest(): Promise<string | null> {
  try {
    const h = await nextHeaders();
    const cid = h.get(CLIENT_ID_HEADER) || h.get(LEGACY_CLIENT_ID_HEADER);
    if (isValidClientIdValue(cid)) return cid;
  } catch {}
  try {
    const c = await nextCookies();
    const v = c.get(CLIENT_COOKIE_NAME)?.value;
    if (isValidClientIdValue(v)) return v;
  } catch {}
  return null;
}

export type ClientIdCandidateSource = "header";

export function isRequestHttps(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    const proto = forwarded.split(",")[0]?.trim().toLowerCase();
    if (proto) return proto === "https";
  }
  return req.nextUrl.protocol === "https:";
}

export function resolveClientIdFromRequest(
  req: NextRequest,
  candidate?: string | null,
  candidateSource?: ClientIdCandidateSource
): { clientId: string | null; cookieToSet?: ReturnType<typeof buildClientCookie> } {
  const cookieId = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
  const headerId = req.headers.get(CLIENT_ID_HEADER) || req.headers.get(LEGACY_CLIENT_ID_HEADER);

  const candidates: Array<{ value: string | null | undefined; source: string; valid: boolean }> = [
    { value: cookieId, source: "cookie", valid: isValidClientIdValue(cookieId) },
    { value: headerId, source: "header", valid: isValidClientIdValue(headerId) },
    ...(candidateSource === "header"
      ? [
          {
            value: candidate,
            source: candidateSource,
            valid: isValidClientIdValue(candidate),
          },
        ]
      : []),
  ];

  const firstValid = candidates.find((c) => c.valid) ?? null;
  const clientId = firstValid?.value ?? null;
  const hasValidCookie = candidates[0]?.valid;

  const shouldSetCookie =
    !!clientId &&
    !hasValidCookie &&
    (firstValid?.source === "header" ||
      (req.method !== "GET" && req.method !== "HEAD"));

  if (shouldSetCookie) {
    return {
      clientId,
      cookieToSet: buildClientCookie(clientId, isRequestHttps(req)),
    };
  }

  return { clientId };
}

async function updateExistingClient(id: string, init: EnsureClientInit, now: Date) {
  const existing = await db.client.findUnique({ where: { id } });
  if (!existing) return false;

  const updates: Record<string, any> = {};
  const lastSeenStale = !existing.lastSeenAt || now.getTime() - existing.lastSeenAt.getTime() > LAST_SEEN_UPDATE_INTERVAL_MS;

  if (init.userAgent != null && init.userAgent !== existing.userAgent) updates.userAgent = init.userAgent;
  if (init.pushEndpoint != null && init.pushEndpoint !== existing.pushEndpoint)
    updates.pushEndpoint = init.pushEndpoint;
  if (init.ipHash != null && init.ipHash !== existing.lastIpHash) updates.lastIpHash = init.ipHash;

  if (lastSeenStale || Object.keys(updates).length > 0) updates.lastSeenAt = now;

  if (Object.keys(updates).length === 0) return true;

  await db.client.update({ where: { id }, data: updates });
  return true;
}

export async function ensureClient(clientId: string, init: EnsureClientInit = {}) {
  if (!isValidClientIdValue(clientId)) return;
  if (isLikelyBot(init.userAgent)) return;

  const now = new Date();
  const created = await updateExistingClient(clientId, init, now);
  if (created) return;

  const data: any = {
    id: clientId,
    lastSeenAt: now,
    createdAt: now,
  };
  if (init.userAgent != null) data.userAgent = init.userAgent;
  if (init.pushEndpoint != null) data.pushEndpoint = init.pushEndpoint;
  if (init.ipHash != null) data.lastIpHash = init.ipHash;

  try {
    await db.client.create({ data });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await updateExistingClient(clientId, init, now);
      return;
    }
    throw err;
  }
}

export function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return new Date();
}

export function buildClientCookie(id: string, secure?: boolean) {
  return {
    name: CLIENT_COOKIE_NAME,
    value: id,
    options: {
      httpOnly: false,
      sameSite: "lax" as const,
      path: "/",
      maxAge: CLIENT_ID_MAX_AGE,
      secure: secure ?? process.env.NODE_ENV === "production",
    },
  };
}

export function resolveOrCreateClientId(existing?: string | null) {
  if (existing && existing.trim().length > 0) return existing;
  const generated = generateClientId();
  return generated;
}

export function clientIdHeaders(id: string) {
  return {
    [CLIENT_ID_HEADER]: id,
  } as Record<string, string>;
}
