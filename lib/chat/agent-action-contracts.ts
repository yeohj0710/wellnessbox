export const CHAT_ACTION_TYPES = [
  "add_recommended_all",
  "buy_recommended_all",
  "clear_cart",
  "open_cart",
  "open_profile",
  "open_my_orders",
  "open_me",
  "open_my_data",
  "open_check_ai",
  "open_assess",
  "start_chat_quick_check",
  "start_chat_assess",
  "open_explore",
  "open_home",
  "open_home_products",
  "focus_home_products",
  "focus_manual_order_lookup",
  "focus_linked_order_lookup",
  "focus_me_profile",
  "focus_me_orders",
  "focus_my_data_account",
  "focus_my_data_orders",
  "focus_check_ai_form",
  "focus_assess_flow",
  "open_7day_purchase",
  "open_chat_page",
  "open_about",
  "open_contact",
  "open_terms",
  "open_privacy",
  "open_refund_policy",
  "open_auth_phone",
  "open_support_email",
  "open_support_call",
  "open_pharm_dashboard",
  "open_pharm_manage_products",
  "open_rider_dashboard",
  "open_admin_login",
  "open_admin_dashboard",
] as const;

export type ChatActionType = (typeof CHAT_ACTION_TYPES)[number];

export type ChatActionCategory =
  | "cart"
  | "assessment"
  | "account"
  | "navigation"
  | "page"
  | "support"
  | "operations";

export type ChatCapabilityAction = {
  type: ChatActionType;
  label: string;
  prompt: string;
  category: ChatActionCategory;
  description?: string;
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
