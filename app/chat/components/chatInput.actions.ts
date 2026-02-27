import type { ChatActionType } from "@/lib/chat/agent-actions";

export type ChatQuickAction = {
  type: ChatActionType;
  label: string;
  reason?: string;
};

export type ChatAgentExample = {
  id: string;
  label: string;
  prompt: string;
};

export type UnifiedAction = {
  id: string;
  label: string;
  title?: string;
  kind: "quick" | "agent" | "suggestion";
  run: () => void;
};

function normalizeActionKey(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

type BuildUnifiedActionsInput = {
  quickActions: ChatQuickAction[];
  agentExamples: ChatAgentExample[];
  suggestions: string[];
  onSelectQuickAction?: (type: ChatActionType) => void;
  onSelectAgentExample?: (prompt: string) => void;
  onSelectSuggestion?: (query: string) => void;
};

export function buildUnifiedActions({
  quickActions,
  agentExamples,
  suggestions,
  onSelectQuickAction,
  onSelectAgentExample,
  onSelectSuggestion,
}: BuildUnifiedActionsInput): UnifiedAction[] {
  const rows: UnifiedAction[] = [];
  const seen = new Set<string>();
  const pushUnique = (item: UnifiedAction) => {
    const key = normalizeActionKey(item.label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push(item);
  };

  quickActions.slice(0, 4).forEach((action) => {
    pushUnique({
      id: `quick-${action.type}`,
      label: action.label,
      title: action.reason || action.label,
      kind: "quick",
      run: () => onSelectQuickAction?.(action.type),
    });
  });

  agentExamples.slice(0, 4).forEach((example) => {
    pushUnique({
      id: `agent-${example.id}`,
      label: example.label,
      title: example.prompt,
      kind: "agent",
      run: () => onSelectAgentExample?.(example.prompt),
    });
  });

  suggestions.slice(0, 2).forEach((suggestion, index) => {
    pushUnique({
      id: `suggest-${index}-${suggestion}`,
      label: suggestion,
      title: suggestion,
      kind: "suggestion",
      run: () => onSelectSuggestion?.(suggestion),
    });
  });

  return rows.slice(0, 8);
}
