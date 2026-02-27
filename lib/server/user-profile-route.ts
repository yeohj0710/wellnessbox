import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import type { RequestActor } from "@/lib/server/actor";
import { resolveActorForRequest } from "@/lib/server/actor";
import { ensureClient } from "@/lib/server/client";

type UserProfileRecord = Awaited<ReturnType<typeof loadUserProfileRecord>>;
const UNKNOWN_ERROR = "Unknown error";
const MISSING_CLIENT_ID_ERROR = "Missing clientId";

export function applyUserProfileActorCookie(
  response: NextResponse,
  actor: Pick<RequestActor, "cookieToSet">
) {
  if (!actor.cookieToSet) return response;
  response.cookies.set(
    actor.cookieToSet.name,
    actor.cookieToSet.value,
    actor.cookieToSet.options
  );
  return response;
}

export function buildUserProfileNoContentResponse(actor: Pick<RequestActor, "cookieToSet">) {
  return applyUserProfileActorCookie(new NextResponse(null, { status: 204 }), actor);
}

export function buildUserProfilePayload(record: NonNullable<UserProfileRecord>) {
  return {
    clientId: record.clientId,
    profile: record.data,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function loadUserProfileRecord(clientId: string) {
  return db.userProfile.findUnique({
    where: { clientId },
  });
}

export async function clearUserProfileRecord(clientId: string) {
  await db.userProfile.delete({ where: { clientId } }).catch(() => undefined);
}

export async function saveUserProfileRecord(input: {
  clientId: string;
  profile: unknown;
}) {
  const profileJson = JSON.parse(JSON.stringify(input.profile)) as Prisma.InputJsonValue;
  return db.userProfile.upsert({
    where: { clientId: input.clientId },
    create: { clientId: input.clientId, data: profileJson },
    update: { data: profileJson },
  });
}

function extractProfileFromBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  return (body as Record<string, unknown>).profile;
}

export async function runUserProfileGetRoute(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    if (!actor.deviceClientId) {
      return new NextResponse(null, { status: 204 });
    }

    const record = await loadUserProfileRecord(actor.deviceClientId);
    if (!record) {
      return buildUserProfileNoContentResponse(actor);
    }

    return applyUserProfileActorCookie(
      NextResponse.json(buildUserProfilePayload(record)),
      actor
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}

export async function runUserProfilePostRoute(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const actor = await resolveActorForRequest(req, { intent: "write" });
    if (!actor.deviceClientId) {
      return NextResponse.json({ error: MISSING_CLIENT_ID_ERROR }, { status: 500 });
    }

    await ensureClient(actor.deviceClientId, {
      userAgent: req.headers.get("user-agent"),
    });

    const profile = extractProfileFromBody(body);
    if (profile == null) {
      await clearUserProfileRecord(actor.deviceClientId);
      return buildUserProfileNoContentResponse(actor);
    }

    const saved = await saveUserProfileRecord({
      clientId: actor.deviceClientId,
      profile,
    });

    return applyUserProfileActorCookie(
      NextResponse.json(buildUserProfilePayload(saved)),
      actor
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
