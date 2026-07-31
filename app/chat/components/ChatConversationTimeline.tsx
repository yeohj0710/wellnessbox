"use client";

import type { MutableRefObject, ReactNode } from "react";
import type { ChatActionType } from "@/lib/chat/agent-actions";
import type { ChatSession } from "@/types/chat";
import type { AssistantLoadingMeta } from "@/components/chat/DesktopChatDockPanel.loading";
import MessageBubble from "./MessageBubble";
import ReferenceData, { type ReferenceDataProps } from "./ReferenceData";
import RecommendedProductActions from "./RecommendedProductActions";
import AssessmentActionCard from "./AssessmentActionCard";
import AgentCapabilityHub from "./AgentCapabilityHub";

type ChatConversationTimelineProps = Pick<
  ReferenceDataProps,
  "summary" | "orders" | "assessResult" | "checkAiResult" | "healthLink"
> & {
  active: ChatSession | null;
  bootstrapPending: boolean;
  bootstrapFallback?: ReactNode;
  assistantLoadingMetaByIndex: Map<number, AssistantLoadingMeta>;
  showAgentCapabilityHub: boolean;
  agentCapabilityActions: Parameters<typeof AgentCapabilityHub>[0]["actions"];
  loading: boolean;
  actionLoading: boolean;
  onRunPrompt: (prompt: string) => void;
  onRunAction: (actionType: ChatActionType) => void;
  inChatAssessmentPrompt: Parameters<typeof AssessmentActionCard>[0]["prompt"];
  onCancelInChatAssessment: () => void;
  onOpenAssessmentPage: Parameters<typeof AssessmentActionCard>[0]["onOpenPage"];
  onRetryLastTurn: () => void;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
};

export default function ChatConversationTimeline({
  active,
  bootstrapPending,
  bootstrapFallback,
  summary,
  orders,
  assessResult,
  checkAiResult,
  healthLink,
  assistantLoadingMetaByIndex,
  showAgentCapabilityHub,
  agentCapabilityActions,
  loading,
  actionLoading,
  onRunPrompt,
  onRunAction,
  inChatAssessmentPrompt,
  onCancelInChatAssessment,
  onOpenAssessmentPage,
  onRetryLastTurn,
  messagesEndRef,
}: ChatConversationTimelineProps) {
  const lastIndex = active ? active.messages.length - 1 : -1;
  const lastMessage = lastIndex >= 0 ? active?.messages[lastIndex] : undefined;

  // One announcement per turn instead of one per streamed chunk. Failures are
  // already announced by the error card's role="alert".
  const turnStatus = loading
    ? "답변을 생성하고 있어요."
    : lastMessage?.role === "assistant" && lastMessage.status !== "error"
    ? "답변이 도착했어요."
    : "";

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {turnStatus}
      </p>

      {bootstrapPending && (!active || active.messages.length === 0)
        ? bootstrapFallback || null
        : null}

      {active && active.messages.length > 0
        ? active.messages.map((message, index) => (
            <div
              key={message.id}
              aria-label={message.role === "user" ? "내 메시지" : "AI 답변"}
            >
              {index === 0 ? (
                <ReferenceData
                  summary={summary}
                  orders={orders}
                  assessResult={assessResult}
                  checkAiResult={checkAiResult}
                  healthLink={healthLink}
                  onRunPrompt={onRunPrompt}
                />
              ) : null}
              <MessageBubble
                role={message.role}
                content={message.content}
                status={message.status}
                loadingContextText={
                  message.role === "assistant"
                    ? assistantLoadingMetaByIndex.get(index)?.contextText || ""
                    : ""
                }
                // Only the newest turn can be retried: replaying an older one
                // would discard everything said after it.
                onRetry={index === lastIndex ? onRetryLastTurn : undefined}
                retrying={index === lastIndex && loading}
              />
              {message.role === "assistant" && message.status !== "error" ? (
                <RecommendedProductActions content={message.content} />
              ) : null}
            </div>
          ))
        : null}

      <AgentCapabilityHub
        visible={showAgentCapabilityHub}
        actions={agentCapabilityActions}
        disabled={loading || bootstrapPending || actionLoading}
        onRunPrompt={onRunPrompt}
        onRunAction={onRunAction}
      />
      <AssessmentActionCard
        prompt={inChatAssessmentPrompt}
        disabled={loading || bootstrapPending}
        onSelectOption={onRunPrompt}
        onCancel={onCancelInChatAssessment}
        onOpenPage={onOpenAssessmentPage}
      />
      <div ref={messagesEndRef} />
    </>
  );
}
