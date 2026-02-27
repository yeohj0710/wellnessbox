import { useRef } from "react";
import type { LastInteractiveAction } from "./useChat.interactionGuard";

export type UseChatRefs = {
  firstUserMessageRef: React.MutableRefObject<string>;
  firstAssistantMessageRef: React.MutableRefObject<string>;
  firstAssistantReplyRef: React.MutableRefObject<string>;
  activeIdRef: React.MutableRefObject<string | null>;
  messagesContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
  stickToBottomRef: React.MutableRefObject<boolean>;
  initStartedRef: React.MutableRefObject<Record<string, boolean>>;
  abortRef: React.MutableRefObject<AbortController | null>;
  savedKeysRef: React.MutableRefObject<Set<string>>;
  readyToPersistRef: React.MutableRefObject<Record<string, boolean>>;
  actorAppUserIdRef: React.MutableRefObject<string | null>;
  actorLoggedInRef: React.MutableRefObject<boolean>;
  actorPhoneLinkedRef: React.MutableRefObject<boolean>;
  suggestionHistoryRef: React.MutableRefObject<Record<string, string[]>>;
  lastInteractiveActionRef: React.MutableRefObject<LastInteractiveAction>;
};

export function useChatRefs(): UseChatRefs {
  const firstUserMessageRef = useRef<string>("");
  const firstAssistantMessageRef = useRef<string>("");
  const firstAssistantReplyRef = useRef<string>("");
  const activeIdRef = useRef<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const initStartedRef = useRef<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const savedKeysRef = useRef<Set<string>>(new Set());
  const readyToPersistRef = useRef<Record<string, boolean>>({});
  const actorAppUserIdRef = useRef<string | null>(null);
  const actorLoggedInRef = useRef(false);
  const actorPhoneLinkedRef = useRef(false);
  const suggestionHistoryRef = useRef<Record<string, string[]>>({});
  const lastInteractiveActionRef = useRef<LastInteractiveAction>(null);

  return {
    firstUserMessageRef,
    firstAssistantMessageRef,
    firstAssistantReplyRef,
    activeIdRef,
    messagesContainerRef,
    messagesEndRef,
    stickToBottomRef,
    initStartedRef,
    abortRef,
    savedKeysRef,
    readyToPersistRef,
    actorAppUserIdRef,
    actorLoggedInRef,
    actorPhoneLinkedRef,
    suggestionHistoryRef,
    lastInteractiveActionRef,
  };
}
