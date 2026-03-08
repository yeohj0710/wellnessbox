import type { ChatActionType } from "@/lib/chat/agent-actions";
import type { ChatAgentExample, ChatQuickAction } from "./chatInput.actions";

export interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  loading: boolean;
  disabled?: boolean;
  quickActionLoading?: boolean;
  suggestions?: string[];
  onSelectSuggestion?: (q: string) => void;
  showAgentGuide?: boolean;
  agentExamples?: ChatAgentExample[];
  onSelectAgentExample?: (prompt: string) => void;
  onStop?: () => void;
  mode?: "fixed" | "embedded";
  quickActions?: ChatQuickAction[];
  onSelectQuickAction?: (type: ChatActionType) => void;
}
