import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { ChatSession } from "@/types/chat";
import {
  isContainerAtBottom,
  scrollContainerToBottom,
  type ChatScrollMode,
} from "./useChat.ui";

type ScrollAnchorInput = {
  active: ChatSession | null;
  activeId: string | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  stickToBottomRef: MutableRefObject<boolean>;
  scrollMode: ChatScrollMode;
};

/**
 * Identity of the rendered conversation that changes on every streamed chunk.
 * Message count alone misses the growth of the message being written, which is
 * exactly when the view needs to follow along.
 */
function getTranscriptSignature(active: ChatSession | null) {
  if (!active) return "";
  const messages = active.messages;
  const last = messages[messages.length - 1];
  return `${messages.length}:${last?.id ?? ""}:${last?.content.length ?? 0}`;
}

/**
 * Keeps the transcript pinned to the newest message and reports whether it is.
 *
 * Measuring and scrolling live in one hook on purpose: they share the
 * stick-to-bottom decision, and splitting them let the measurement run once
 * against a half-rendered transcript and then never correct itself.
 */
export function useChatScrollAnchor({
  active,
  activeId,
  messagesContainerRef,
  stickToBottomRef,
  scrollMode,
}: ScrollAnchorInput) {
  const [atBottom, setAtBottom] = useState(true);
  const prevActiveIdRef = useRef<string | null>(null);
  const signature = getTranscriptSignature(active);

  const sync = useCallback(() => {
    const next = isContainerAtBottom(messagesContainerRef, scrollMode);
    stickToBottomRef.current = next;
    setAtBottom(next);
  }, [messagesContainerRef, scrollMode, stickToBottomRef]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    sync();

    // The dock scrolls its own container, the full-page route scrolls the
    // document; only one of the two emits the event, so listen to both.
    container?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    // Markdown, images and product cards settle after the commit, changing
    // height without firing a scroll event. While pinned, follow that growth -
    // measuring alone would leave the view stranded just above the last line.
    const onResize = () => {
      if (stickToBottomRef.current) {
        scrollContainerToBottom(messagesContainerRef, scrollMode);
      }
      sync();
    };
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    if (container) observer?.observe(container);

    return () => {
      container?.removeEventListener("scroll", sync);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      observer?.disconnect();
    };
  }, [messagesContainerRef, scrollMode, stickToBottomRef, sync]);

  useLayoutEffect(() => {
    // Keyed on the transcript signature, never on the session object: the
    // sessions array is replaced by persistence and follow-up fetches too, and
    // re-pinning on those would drag the user down while they are reading.
    if (!signature) return;

    // Opening a conversation should land on the newest message - where the
    // user left it - not at the first line of a long history.
    if (prevActiveIdRef.current !== activeId) {
      prevActiveIdRef.current = activeId;
      stickToBottomRef.current = true;
    }

    // Once the user scrolls up to re-read something, stop yanking them down.
    if (!stickToBottomRef.current) {
      sync();
      return;
    }

    scrollContainerToBottom(messagesContainerRef, scrollMode);
    const frame = requestAnimationFrame(() => {
      // Re-pin after late layout, then record the resulting position.
      scrollContainerToBottom(messagesContainerRef, scrollMode);
      sync();
    });
    return () => cancelAnimationFrame(frame);
  }, [
    signature,
    activeId,
    messagesContainerRef,
    scrollMode,
    stickToBottomRef,
    sync,
  ]);

  const scrollToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    setAtBottom(true);
    // Instant, not smooth: the browser abandons an in-flight smooth scroll when
    // it competes with the input that started it, which left the tap doing
    // nothing. An explicit jump should land immediately anyway.
    scrollContainerToBottom(messagesContainerRef, scrollMode);
  }, [messagesContainerRef, scrollMode, stickToBottomRef]);

  return { atBottom, scrollToBottom };
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
