import {
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { ChatSession } from "@/types/chat";
import {
  isContainerAtBottom,
  scrollContainerToBottom,
  scrollContainerToTop,
} from "./useChat.ui";

type ScrollEffectInput = {
  active: ChatSession | null;
  activeId: string | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  stickToBottomRef: MutableRefObject<boolean>;
};

export function useActiveSessionScrollEffect({
  active,
  activeId,
  messagesContainerRef,
  stickToBottomRef,
}: ScrollEffectInput) {
  const prevActiveIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    const msgLength = active.messages.length;
    if (prevActiveIdRef.current !== activeId) {
      requestAnimationFrame(() => {
        scrollContainerToTop(messagesContainerRef);
      });
      prevActiveIdRef.current = activeId;
      prevMsgCountRef.current = msgLength;
      return;
    }

    if (msgLength > prevMsgCountRef.current) {
      requestAnimationFrame(() => {
        if (stickToBottomRef.current) {
          scrollContainerToBottom(messagesContainerRef);
        }
      });
      prevMsgCountRef.current = msgLength;
    }
  }, [active, activeId, messagesContainerRef, stickToBottomRef]);
}

type AutoInitInput = {
  enableAutoInit: boolean;
  resultsLoaded: boolean;
  profileLoaded: boolean;
  activeId: string | null;
  sessions: ChatSession[];
  startInitialAssistantMessage: (sessionId: string) => void | Promise<void>;
};

export function useAutoInitAssistantEffect({
  enableAutoInit,
  resultsLoaded,
  profileLoaded,
  activeId,
  sessions,
  startInitialAssistantMessage,
}: AutoInitInput) {
  const startInitialRef = useRef(startInitialAssistantMessage);
  useEffect(() => {
    startInitialRef.current = startInitialAssistantMessage;
  }, [startInitialAssistantMessage]);

  useEffect(() => {
    if (!enableAutoInit) return;
    if (!resultsLoaded || !profileLoaded) return;
    if (!activeId) return;

    const session = sessions.find((item) => item.id === activeId);
    if (!session || session.messages.length > 0) return;

    void startInitialRef.current(activeId);
  }, [
    enableAutoInit,
    resultsLoaded,
    profileLoaded,
    activeId,
    sessions,
  ]);
}

type StickToBottomInput = {
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  stickToBottomRef: MutableRefObject<boolean>;
};

export function useStickToBottomTrackingEffect({
  messagesContainerRef,
  stickToBottomRef,
}: StickToBottomInput) {
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      stickToBottomRef.current = isContainerAtBottom(messagesContainerRef);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [messagesContainerRef, stickToBottomRef]);
}
