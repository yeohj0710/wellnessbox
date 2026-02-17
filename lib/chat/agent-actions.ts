export const CHAT_ACTION_TYPES = [
  "add_recommended_all",
  "buy_recommended_all",
  "open_cart",
  "open_profile",
  "open_my_orders",
  "open_me",
] as const;

export type ChatActionType = (typeof CHAT_ACTION_TYPES)[number];

export const CHAT_ACTION_LABELS: Record<ChatActionType, string> = {
  add_recommended_all: "추천 전체 담기",
  buy_recommended_all: "추천 전체 바로 구매",
  open_cart: "장바구니 보기",
  open_profile: "프로필 설정",
  open_my_orders: "내 주문 조회",
  open_me: "내 정보 열기",
};

export type ChatAgentCartIntentMode =
  | "none"
  | "add_all"
  | "buy_all"
  | "add_named"
  | "buy_named";

export type ChatAgentCartIntent = {
  mode: ChatAgentCartIntentMode;
  targetProductName?: string;
  quantity?: number;
};

export type ChatAgentExecuteDecision = {
  handled: boolean;
  assistantReply: string;
  actions: ChatActionType[];
  cartIntent: ChatAgentCartIntent;
  confidence: number;
  reason?: string;
};

export type ChatAgentSuggestedAction = {
  type: ChatActionType;
  label: string;
  reason?: string;
  confidence?: number;
};
