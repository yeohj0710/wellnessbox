import type { UserContextSummaryInput } from "@/lib/chat/context";
import type { ChatSession, UserProfile } from "@/types/chat";

type ActorContext = {
  loggedIn: boolean;
  phoneLinked: boolean;
};

type BuildUserContextInputParams = {
  profile: UserProfile | undefined;
  orders: any[];
  assessResult: any | null;
  checkAiResult: any | null;
  sessions: ChatSession[];
  currentSessionId: string | null;
  localAssessCats: string[];
  localCheckAi: string[];
  actorContext: ActorContext;
};

type BuildChatContextPayloadParams = BuildUserContextInputParams;

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
        ? order.items.map((item: any) => ({
            name: item?.name || "상품",
            quantity:
              typeof item?.quantity === "number" ? item.quantity : undefined,
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
