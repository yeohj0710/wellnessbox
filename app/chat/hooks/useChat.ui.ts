import type { RefObject } from "react";

export function openChatDrawer(
  setDrawerVisible: (visible: boolean) => void,
  setDrawerOpen: (open: boolean) => void
) {
  setDrawerVisible(true);
  setTimeout(() => setDrawerOpen(true), 0);
}

export function closeChatDrawer(
  setDrawerVisible: (visible: boolean) => void,
  setDrawerOpen: (open: boolean) => void
) {
  setDrawerOpen(false);
  setTimeout(() => setDrawerVisible(false), 200);
}

/**
 * Which element actually scrolls the transcript.
 *
 * The two chat surfaces differ: the desktop dock gives the feed a fixed height
 * so the feed scrolls itself, while the full-page route lets the feed grow and
 * the document scrolls. It is declared rather than sniffed, because a dock with
 * a short conversation looks identical to the page layout - and guessing wrong
 * measures the page behind the dock.
 */
export type ChatScrollMode = "container" | "document";

export function resolveChatScrollElement(
  containerRef: RefObject<HTMLElement | null>,
  mode: ChatScrollMode
): HTMLElement | null {
  if (mode === "container") return containerRef.current;
  if (typeof document === "undefined") return null;
  return (
    (document.scrollingElement as HTMLElement | null) ?? document.documentElement
  );
}

export function scrollContainerToBottom(
  containerRef: RefObject<HTMLElement | null>,
  mode: ChatScrollMode,
  behavior: ScrollBehavior = "auto"
) {
  const target = resolveChatScrollElement(containerRef, mode);
  if (!target) return;

  // The site sets `scroll-behavior: smooth` globally, which would animate every
  // one of the many scrolls a streaming answer triggers - the view ends up
  // permanently chasing the text. Auto-follow therefore asks for "instant"
  // explicitly; smooth is reserved for the deliberate jump-to-bottom tap.
  if (typeof target.scrollTo === "function") {
    target.scrollTo({
      top: target.scrollHeight,
      behavior: behavior === "smooth" ? "smooth" : "instant",
    });
    return;
  }
  target.scrollTop = target.scrollHeight;
}

export function isContainerAtBottom(
  containerRef: RefObject<HTMLElement | null>,
  mode: ChatScrollMode,
  threshold = 80
) {
  const target = resolveChatScrollElement(containerRef, mode);
  // Nothing to scroll yet - treat as pinned so the first message is followed.
  if (!target) return true;
  return (
    target.scrollHeight - target.scrollTop - target.clientHeight <= threshold
  );
}
