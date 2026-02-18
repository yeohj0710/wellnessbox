export const CHAT_PAGE_ACTION_EVENT = "wb:chat-page-action";

export type ChatPageActionDetail =
  | { action: "focus_home_products" }
  | { action: "focus_manual_order_lookup" }
  | { action: "focus_linked_order_lookup" }
  | { action: "focus_me_profile" }
  | { action: "focus_me_orders" }
  | { action: "focus_my_data_account" }
  | { action: "focus_my_data_orders" }
  | { action: "focus_check_ai_form" }
  | { action: "focus_assess_flow" };

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

function isMePath(pathname: string) {
  const path = normalizePath(pathname);
  return path.startsWith("/me");
}

function isMyDataPath(pathname: string) {
  const path = normalizePath(pathname);
  return path.startsWith("/my-data");
}

function isCheckAiPath(pathname: string) {
  const path = normalizePath(pathname);
  return path.startsWith("/check-ai");
}

function isAssessPath(pathname: string) {
  const path = normalizePath(pathname);
  return path.startsWith("/assess");
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
  if (detail.action === "focus_me_profile" || detail.action === "focus_me_orders") {
    return isMePath(pathname);
  }
  if (
    detail.action === "focus_my_data_account" ||
    detail.action === "focus_my_data_orders"
  ) {
    return isMyDataPath(pathname);
  }
  if (detail.action === "focus_check_ai_form") {
    return isCheckAiPath(pathname);
  }
  if (detail.action === "focus_assess_flow") {
    return isAssessPath(pathname);
  }
  return false;
}

export function dispatchChatPageAction(detail: ChatPageActionDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ChatPageActionDetail>(CHAT_PAGE_ACTION_EVENT, { detail })
  );
}
