export const CHAT_CART_ACTION_REQUEST_EVENT = "wb:chat-cart-action-request";

export type ChatCartActionItem = {
  productId: number;
  productName: string;
  optionType: string;
  quantity: number;
};

export type ChatCartActionRequestDetail = {
  items: ChatCartActionItem[];
  openCartAfterSave?: boolean;
  source?: "chat-command" | "quick-action";
};

export function dispatchChatCartActionRequest(
  detail: ChatCartActionRequestDetail
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ChatCartActionRequestDetail>(
      CHAT_CART_ACTION_REQUEST_EVENT,
      { detail }
    )
  );
}
