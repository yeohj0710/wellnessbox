"use client";

import type { MutableRefObject } from "react";
import type { ChatActionType } from "@/lib/chat/agent-actions";
import type { ChatSession, UserProfile } from "@/types/chat";
import MessageBubble from "@/app/chat/components/MessageBubble";
import ProfileBanner from "@/app/chat/components/ProfileBanner";
import ReferenceData from "@/app/chat/components/ReferenceData";
import RecommendedProductActions from "@/app/chat/components/RecommendedProductActions";
import AssessmentActionCard from "@/app/chat/components/AssessmentActionCard";
import AgentCapabilityHub from "@/app/chat/components/AgentCapabilityHub";
import type { AssistantLoadingMeta } from "./DesktopChatDockPanel.loading";

type DesktopChatDockMessageFeedProps = {
  messagesContainerRef: MutableRefObject<HTMLDivElement | null>;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  profileLoaded: boolean;
  profile: UserProfile | undefined;
  showProfileBanner: boolean;
  onEditProfile: () => void;
  onCloseProfileBanner: () => void;
  bootstrapPending: boolean;
  active: ChatSession | null;
  orders: any[];
  assessResult: any | null;
  checkAiResult: any | null;
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
};

export default function DesktopChatDockMessageFeed({
  messagesContainerRef,
  messagesEndRef,
  profileLoaded,
  profile,
  showProfileBanner,
  onEditProfile,
  onCloseProfileBanner,
  bootstrapPending,
  active,
  orders,
  assessResult,
  checkAiResult,
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
}: DesktopChatDockMessageFeedProps) {
  return (
    <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#f8fafc_38%,_#ffffff_100%)]">
      <div
        className="h-full overflow-y-auto overscroll-contain px-3 pb-4 pt-3"
        ref={messagesContainerRef}
      >
        {profileLoaded && !profile ? (
          <ProfileBanner
            profile={profile}
            show={showProfileBanner}
            onEdit={onEditProfile}
            onClose={onCloseProfileBanner}
          />
        ) : null}

        <div className="space-y-3">
          {bootstrapPending && (!active || active.messages.length === 0) ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
                <p className="text-xs font-medium text-slate-700">AI 상담 준비 중...</p>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="h-2 w-11/12 animate-pulse rounded bg-slate-200" />
                <div className="h-2 w-4/5 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ) : null}

          {active && active.messages.length > 0
            ? active.messages.map((message, index) => (
                <div key={message.id}>
                  {index === 0 ? (
                    <ReferenceData
                      orders={orders}
                      assessResult={assessResult}
                      checkAiResult={checkAiResult}
                    />
                  ) : null}
                  <MessageBubble
                    role={message.role}
                    content={message.content}
                    loadingContextText={
                      message.role === "assistant"
                        ? assistantLoadingMetaByIndex.get(index)?.contextText || ""
                        : ""
                    }
                    loadingUserTurnCount={
                      message.role === "assistant"
                        ? assistantLoadingMetaByIndex.get(index)?.userTurnCountBefore ?? 0
                        : 0
                    }
                  />
                  {message.role === "assistant" ? (
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
        </div>
      </div>
    </div>
  );
}
