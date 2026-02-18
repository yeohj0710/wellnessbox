export const CHAT_PAGE_ACTION_EVENT = "wb:chat-page-action";

export type ChatPageActionDetail =
  | { action: "focus_home_products" }
  | { action: "focus_manual_order_lookup" }
  | { action: "focus_linked_order_lookup" };

function normalizePath(pathname: string) {
  const trimmed = (pathname || "").trim();
  return trimmed || "/";
}

function isHomeLikePath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/" || path.startsWith("/explore");
}

function isOrdersPath(pathname: string) {
  const path = normalizePath(pathname);
  return path.startsWith("/my-orders");
}

export function canHandlePageActionInPath(
  detail: ChatPageActionDetail,
  pathname: string
) {
  if (detail.action === "focus_home_products") {
    return isHomeLikePath(pathname);
  }
  if (
    detail.action === "focus_manual_order_lookup" ||
    detail.action === "focus_linked_order_lookup"
  ) {
    return isOrdersPath(pathname);
  }
  return false;
}

export function dispatchChatPageAction(detail: ChatPageActionDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ChatPageActionDetail>(CHAT_PAGE_ACTION_EVENT, { detail })
  );
}
