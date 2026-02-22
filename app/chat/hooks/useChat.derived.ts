"use client";

import { useCallback, useMemo } from "react";
import type { ChatSession, UserProfile } from "@/types/chat";
import type { ChatActionType } from "@/lib/chat/agent-actions";
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";
import {
  buildActionContextText as buildActionContextTextPayload,
  buildChatContextPayload,
  buildRuntimeContextPayload as buildRuntimeContextPayloadValue,
  buildSummaryForSession as buildSummaryForSessionPayload,
} from "./useChat.context";
import {
  buildAgentCapabilityActions,
  buildAgentGuideExamples,
  type AgentCapabilityItem,
  type AgentGuideExample,
} from "./useChat.agentGuide";
import { pickLatestAssistantText } from "./useChat.agentActions";
import type { ActionMemoryMap } from "./useChat.actionMemory";
import type { InChatAssessmentState } from "./useChat.assessment";

type UseChatDerivedStateOptions = {
  active: ChatSession | null;
  activeId: string | null;
  profile: UserProfile | undefined;
  orders: any[];
  assessResult: any | null;
  checkAiResult: any | null;
  sessions: ChatSession[];
  localAssessCats: string[];
  localCheckAi: string[];
  pageContext: ChatPageAgentContext | null;
  inChatAssessment: InChatAssessmentState | null;
  interactiveActionsLength: number;
  actionMemory: ActionMemoryMap;
  actorLoggedIn: boolean;
  actorPhoneLinked: boolean;
};

type UseChatDerivedStateResult = {
  runtimeContextText: string;
  userContextSummary: ReturnType<typeof buildSummaryForSessionPayload>;
  showAgentGuide: boolean;
  showAgentCapabilityHub: boolean;
  agentCapabilityActions: AgentCapabilityItem[];
  agentGuideExamples: AgentGuideExample[];
  buildSummaryForSession: (
    sessionId: string | null
  ) => ReturnType<typeof buildSummaryForSessionPayload>;
  buildActionContextText: (sessionId: string | null) => string;
  buildContextPayload: (sessionId: string | null) => ReturnType<
    typeof buildChatContextPayload
  >;
  buildRuntimeContextPayload: () => ReturnType<
    typeof buildRuntimeContextPayloadValue
  >;
};

export function useChatDerivedState(
  options: UseChatDerivedStateOptions
): UseChatDerivedStateResult {
  const {
    active,
    activeId,
    profile,
    orders,
    assessResult,
    checkAiResult,
    sessions,
    localAssessCats,
    localCheckAi,
    pageContext,
    inChatAssessment,
    interactiveActionsLength,
    actionMemory,
    actorLoggedIn,
    actorPhoneLinked,
  } = options;

  const latestAssistantTextInActive = useMemo(
    () => pickLatestAssistantText(active?.messages || []),
    [active?.messages]
  );

  const runtimeContextText = useMemo(
    () =>
      typeof pageContext?.runtimeContextText === "string"
        ? pageContext.runtimeContextText.trim()
        : "",
    [pageContext]
  );

  const pageContextActionSet = useMemo(
    () => new Set<ChatActionType>(pageContext?.preferredActions || []),
    [pageContext]
  );

  const agentCapabilityActions = useMemo<AgentCapabilityItem[]>(() => {
    return buildAgentCapabilityActions({
      latestAssistantText: latestAssistantTextInActive,
      inAssessmentMode: inChatAssessment?.mode ?? null,
      pageContextActionSet,
      actionMemory,
    });
  }, [
    actionMemory,
    inChatAssessment?.mode,
    latestAssistantTextInActive,
    pageContextActionSet,
  ]);

  const agentGuideExamples = useMemo<AgentGuideExample[]>(() => {
    return buildAgentGuideExamples({
      latestAssistantText: latestAssistantTextInActive,
      pageSuggestedPrompts: pageContext?.suggestedPrompts ?? null,
      agentCapabilityActions,
    });
  }, [agentCapabilityActions, latestAssistantTextInActive, pageContext]);

  const showAgentGuide = useMemo(() => {
    if (!active) return false;
    if (inChatAssessment && inChatAssessment.sessionId === active.id) return false;
    const userMessageCount = active.messages.filter(
      (message) => message.role === "user"
    ).length;

    if (userMessageCount <= 2) return true;
    return userMessageCount <= 4 && interactiveActionsLength === 0;
  }, [active, interactiveActionsLength, inChatAssessment]);

  const showAgentCapabilityHub = useMemo(() => {
    if (!active) return false;
    if (inChatAssessment && inChatAssessment.sessionId === active.id) return false;
    const userMessageCount = active.messages.filter(
      (message) => message.role === "user"
    ).length;
    return userMessageCount <= 8;
  }, [active, inChatAssessment]);

  const buildContextDeps = useCallback(
    (sessionId: string | null) => ({
      profile,
      orders,
      assessResult,
      checkAiResult,
      sessions,
      currentSessionId: sessionId,
      localAssessCats,
      localCheckAi,
      actorContext: {
        loggedIn: actorLoggedIn,
        phoneLinked: actorPhoneLinked,
      },
    }),
    [
      assessResult,
      actorLoggedIn,
      actorPhoneLinked,
      checkAiResult,
      localAssessCats,
      localCheckAi,
      orders,
      profile,
      sessions,
    ]
  );

  const buildSummaryForSession = useCallback(
    (sessionId: string | null) => {
      return buildSummaryForSessionPayload(buildContextDeps(sessionId));
    },
    [buildContextDeps]
  );

  const buildActionContextText = useCallback(
    (sessionId: string | null) => {
      return buildActionContextTextPayload({
        ...buildContextDeps(sessionId),
        runtimeContextText,
      });
    },
    [buildContextDeps, runtimeContextText]
  );

  const userContextSummary = useMemo(
    () => buildSummaryForSession(activeId),
    [activeId, buildSummaryForSession]
  );

  const buildContextPayload = useCallback(
    (sessionId: string | null) =>
      buildChatContextPayload(buildContextDeps(sessionId)),
    [buildContextDeps]
  );

  const buildRuntimeContextPayload = useCallback(
    () =>
      buildRuntimeContextPayloadValue({
        pageContext,
        runtimeContextText,
      }),
    [pageContext, runtimeContextText]
  );

  return {
    runtimeContextText,
    userContextSummary,
    showAgentGuide,
    showAgentCapabilityHub,
    agentCapabilityActions,
    agentGuideExamples,
    buildSummaryForSession,
    buildActionContextText,
    buildContextPayload,
    buildRuntimeContextPayload,
  };
}
