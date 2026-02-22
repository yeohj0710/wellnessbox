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

export function scrollContainerToBottom(containerRef: RefObject<HTMLDivElement | null>) {
  const container = containerRef.current;
  if (container) container.scrollTop = container.scrollHeight;
}

export function scrollContainerToTop(containerRef: RefObject<HTMLDivElement | null>) {
  const container = containerRef.current;
  if (container) container.scrollTop = 0;
}

export function isContainerAtBottom(
  containerRef: RefObject<HTMLDivElement | null>,
  threshold = 80
) {
  const container = containerRef.current;
  if (!container) return false;
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <=
    threshold
  );
}
