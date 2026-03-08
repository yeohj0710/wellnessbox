import type { ChatActionType } from "@/lib/chat/agent-actions";
import type { ChatMessage } from "@/types/chat";
import type { InChatAssessmentMode } from "./useChat.assessment";

export type CartExecutionResult = {
  executed: boolean;
  summary: string;
  hasAddress: boolean;
  openCartAfterSave?: boolean;
};

export type InteractiveActionResult = {
  executed: boolean;
  message: string;
  summary: string;
  navigated?: boolean;
  hasAddress?: boolean;
};

export type RunSingleInteractiveActionParams = {
  action: ChatActionType;
  sessionMessages: ChatMessage[];
  executeCartCommandText: (params: {
    commandText: string;
    sessionMessages: ChatMessage[];
  }) => Promise<CartExecutionResult>;
  openCart: () => void;
  clearCart: () => void;
  openProfileSettings: () => void;
  resetInChatAssessment: () => void;
  startInChatAssessment: (mode: InChatAssessmentMode) => string | null;
  navigateTo: (path: string) => boolean;
  openExternalLink: (url: string) => boolean;
};
