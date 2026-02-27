import "server-only";

import { NextRequest } from "next/server";
import {
  buildFallbackExecuteDecision,
  buildFallbackSuggestedActions,
} from "@/lib/chat/actions/fallback";
import { decideExecuteByModel, suggestActionsByModel } from "@/lib/chat/actions/model";
import {
  DEFAULT_EXECUTE_DECISION,
  type ExecuteBody,
  type SuggestBody,
  mergeExecuteDecision,
  sanitizeDecisionByText,
  toText,
} from "@/lib/chat/actions/shared";

export async function runChatActionsPostRoute(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExecuteBody | SuggestBody;
    const mode = body?.mode === "suggest" ? "suggest" : "execute";

    if (mode === "suggest") {
      const suggestBody = body as SuggestBody;
      const fromModel = await suggestActionsByModel(suggestBody);
      const uiActions =
        Array.isArray(fromModel) && fromModel.length > 0
          ? fromModel
          : buildFallbackSuggestedActions(suggestBody);
      return new Response(JSON.stringify({ uiActions }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const executeBody = body as ExecuteBody;
    const fromModel = await decideExecuteByModel(executeBody);
    const fallbackDecision = buildFallbackExecuteDecision(executeBody);
    const merged = mergeExecuteDecision(fromModel, fallbackDecision);
    const decision = sanitizeDecisionByText(toText(executeBody.text, 240), merged);

    if (
      !decision.handled &&
      decision.actions.length === 0 &&
      decision.cartIntent.mode === "none"
    ) {
      return new Response(JSON.stringify(DEFAULT_EXECUTE_DECISION), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(decision), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ...DEFAULT_EXECUTE_DECISION,
        error: error?.message || "Unknown error",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
