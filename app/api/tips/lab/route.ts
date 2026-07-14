import { NextResponse } from "next/server";
import { hasTipsLabAccess } from "@/lib/server/tips-lab/auth";
import {
  runTipsLab,
  TIPS_LAB_ACTIONS,
  type TipsLabAction,
} from "@/lib/server/tips-lab/runtime";
import {
  createTipsLabStateToken,
  verifyTipsLabStateToken,
} from "@/lib/server/tips-lab/state-token";
import { appendTipsLabEvent, createTipsLabSession } from "@/lib/server/tips-lab/data-lake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function POST(req: Request) {
  if (!(await hasTipsLabAccess())) return json({ error: "Unauthorized" }, 401);
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 64_000) return json({ error: "request_too_large" }, 413);

  try {
    const input: unknown = await req.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return json({ error: "json_object_required" }, 400);
    }
    const record = input as Record<string, unknown>;
    if (
      typeof record.action !== "string" ||
      !TIPS_LAB_ACTIONS.includes(record.action as TipsLabAction)
    ) {
      return json({ error: "invalid_lab_action" }, 400);
    }
    const token = record.action === "initialize" ? null : verifyTipsLabStateToken(record.stateToken);
    const state = token?.state ?? "NEW";
    const result = runTipsLab({
        action: record.action as TipsLabAction,
        state,
        profile:
          record.profile && typeof record.profile === "object"
            ? (record.profile as never)
            : undefined,
        consentScopes: Array.isArray(record.consentScopes)
          ? (record.consentScopes as string[])
          : [],
        payload:
          record.payload && typeof record.payload === "object"
            ? (record.payload as Record<string, unknown>)
            : {},
      });
    const resultRecord = result as Record<string, any>;
    const sessionId = token?.sessionId ?? (await createTipsLabSession({
      state: result.state,
      profile: resultRecord.profile ?? record.profile ?? {},
      consentScopes: Array.isArray(record.consentScopes) ? record.consentScopes as string[] : [],
    })).id;
    const dataLake = await appendTipsLabEvent({
      sessionId,
      action: record.action as TipsLabAction,
      previousState: state,
      nextState: result.state,
      request: { profile: record.profile ?? {}, consentScopes: record.consentScopes ?? [], payload: record.payload ?? {} },
      result,
      profile: resultRecord.profile ?? record.profile,
      consentScopes: Array.isArray(record.consentScopes) ? record.consentScopes as string[] : [],
      postconditionsMet: typeof resultRecord.trace?.postconditionsMet === "boolean" ? resultRecord.trace.postconditionsMet : undefined,
    });
    return json({ ...result, dataLake, stateToken: createTipsLabStateToken(result.state, dataLake.sessionId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message.startsWith("consent_scope_required") ? 403 : 400;
    return json({ error: message }, status);
  }
}
