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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const state =
      record.action === "initialize" ? "NEW" : verifyTipsLabStateToken(record.stateToken);
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
    return json({ ...result, stateToken: createTipsLabStateToken(result.state) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message.startsWith("consent_scope_required") ? 403 : 400;
    return json({ error: message }, status);
  }
}
