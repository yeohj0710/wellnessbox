import type { ChatActionType } from "@/lib/chat/agent-actions";

export type LastInteractiveAction = {
  type: ChatActionType;
  at: number;
} | null;

const DEFAULT_DEBOUNCE_MS = 900;

export function shouldBlockInteractiveAction(params: {
  recent: LastInteractiveAction;
  nextType: ChatActionType;
  now: number;
  debounceMs?: number;
}) {
  const debounceMs = params.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  return Boolean(
    params.recent &&
      params.recent.type === params.nextType &&
      params.now - params.recent.at < debounceMs
  );
}

export function nextInteractiveActionMark(type: ChatActionType, now: number) {
  return { type, at: now } as const;
}
