import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  applyActorCookie,
  canWriteChatSession,
  parseChatDeleteBody,
  resolveChatWriteIdentity,
} from "@/lib/chat/session-route";
import { resolveActorForRequest } from "@/lib/server/actor";

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown error";
}

export async function runChatDeletePostRoute(req: NextRequest) {
  try {
    const [rawBody, actor] = await Promise.all([
      req.json().catch(() => null),
      resolveActorForRequest(req, { intent: "write" }),
    ]);

    const identityResult = resolveChatWriteIdentity(actor);
    if (!identityResult.ok) return identityResult.response;

    const parseResult = parseChatDeleteBody(rawBody);
    if (!parseResult.ok) {
      return NextResponse.json(
        { error: parseResult.error },
        { status: parseResult.status }
      );
    }

    const { sessionId } = parseResult.data;
    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { clientId: true, appUserId: true },
    });

    if (!session) {
      return applyActorCookie(NextResponse.json({ ok: true }), actor);
    }

    if (!canWriteChatSession(session, identityResult.data)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.chatSession.delete({ where: { id: sessionId } });
    return applyActorCookie(NextResponse.json({ ok: true }), actor);
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
