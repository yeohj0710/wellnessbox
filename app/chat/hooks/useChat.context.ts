import { buildUserContextSummary } from "@/lib/chat/context";
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";
import type { UserContextSummaryInput } from "@/lib/chat/context";
import type { ChatSession, UserProfile } from "@/types/chat";
import type {
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedOrderSummary,
} from "./useChat.results";

type ActorContext = {
  loggedIn: boolean;
  phoneLinked: boolean;
};

type BuildUserContextInputParams = {
  profile: UserProfile | undefined;
  orders: NormalizedOrderSummary[];
  assessResult: NormalizedAssessResult | null;
  checkAiResult: NormalizedCheckAiResult | null;
  sessions: ChatSession[];
  currentSessionId: string | null;
  localAssessCats: string[];
  localCheckAi: string[];
  actorContext: ActorContext;
};

type BuildChatContextPayloadParams = BuildUserContextInputParams;

type BuildActionContextTextParams = BuildUserContextInputParams & {
  runtimeContextText: string;
};

type BuildRuntimeContextPayloadParams = {
  pageContext: ChatPageAgentContext | null;
  runtimeContextText: string;
};

function buildContextSessionPayload(
  sessions: ChatSession[],
  currentSessionId: string | null
) {
  return sessions
    .filter((session) => !currentSessionId || session.id !== currentSessionId)
    .sort(
      (left, right) =>
        (right.updatedAt || right.createdAt) -
        (left.updatedAt || left.createdAt)
    )
    .slice(0, 5)
    .map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt || session.createdAt,
      messages: session.messages.slice(-4).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }));
}

export function buildUserContextInput(
  params: BuildUserContextInputParams
): UserContextSummaryInput {
  return {
    profile: params.profile ?? null,
    orders: params.orders,
    assessResult: params.assessResult || null,
    checkAiResult: params.checkAiResult || null,
    chatSessions: params.sessions,
    currentSessionId: params.currentSessionId,
    localAssessCats: params.localAssessCats,
    localCheckAiTopLabels: params.localCheckAi,
    actorContext: params.actorContext,
  };
}

export function buildChatContextPayload(params: BuildChatContextPayloadParams) {
  return {
    profile: params.profile,
    localCheckAiTopLabels: params.localCheckAi,
    localAssessCats: params.localAssessCats,
    actorContext: params.actorContext,
    orders: params.orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: Array.isArray(order.items)
        ? order.items.map((item) => ({
            name: item.name || "상품",
            quantity: item.quantity,
          }))
        : [],
    })),
    assessResult: params.assessResult || null,
    checkAiResult: params.checkAiResult || null,
    sessionId: params.currentSessionId || undefined,
    chatSessions: buildContextSessionPayload(
      params.sessions,
      params.currentSessionId
    ),
  };
}

export function buildSummaryForSession(params: BuildUserContextInputParams) {
  return buildUserContextSummary(buildUserContextInput(params));
}

export function buildActionContextText(params: BuildActionContextTextParams) {
  const summaryText = buildSummaryForSession(params).promptSummaryText;
  return [summaryText, params.runtimeContextText].filter(Boolean).join("\n\n");
}

export function buildRuntimeContextPayload(
  params: BuildRuntimeContextPayloadParams
) {
  if (!params.pageContext) return null;
  return {
    routeKey: params.pageContext.routeKey,
    routePath: params.pageContext.routePath,
    pageTitle: params.pageContext.title,
    pageSummary: params.pageContext.summary,
    suggestedPrompts: params.pageContext.suggestedPrompts,
    runtimeContextText: params.runtimeContextText,
  };
}
