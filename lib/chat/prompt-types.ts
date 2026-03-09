import type { UserContextSummary } from "@/lib/chat/context";

export type PromptRole = "system" | "user" | "assistant";

export type PromptMessage = {
  role: PromptRole;
  content: string;
};

export type PromptHistoryMessage = {
  role?: string | null;
  content?: unknown;
};

export type BuildSystemPromptInput = {
  mode?: "init" | "chat";
  hasRagContext?: boolean;
  summary?: UserContextSummary;
};

export type BuildMessagesInput = {
  mode: "init" | "chat";
  contextSummary: UserContextSummary;
  chatHistory?: PromptHistoryMessage[];
  userText?: string;
  knownContext?: string;
  ragText?: string;
  ragSourcesJson?: string;
  productBrief?: string;
  runtimeContextText?: string;
  maxHistoryMessages?: number;
};

export type BuildSuggestionPromptInput = {
  contextSummary: UserContextSummary;
  lastAssistantReply: string;
  recentMessages?: PromptHistoryMessage[];
  count: number;
  topicHint?: string | null;
  excludeSuggestions?: string[];
};
