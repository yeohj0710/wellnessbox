import type { ChatActionType } from "@/lib/chat/agent-actions";
import {
  canHandlePageActionInPath,
  dispatchChatPageAction,
  type ChatPageActionDetail,
} from "@/lib/chat/page-action-events";
import type { ChatMessage } from "@/types/chat";
import type { InChatAssessmentMode } from "./useChat.assessment";

type CartExecutionResult = {
  executed: boolean;
  summary: string;
  hasAddress: boolean;
  openCartAfterSave?: boolean;
};

export type InteractiveActionResult = {
  executed: boolean;
  message: string;
  summary: string;
  navigated?: boolean;
  hasAddress?: boolean;
};

export type RunSingleInteractiveActionParams = {
  action: ChatActionType;
  sessionMessages: ChatMessage[];
  executeCartCommandText: (params: {
    commandText: string;
    sessionMessages: ChatMessage[];
  }) => Promise<CartExecutionResult>;
  openCart: () => void;
  clearCart: () => void;
  openProfileSettings: () => void;
  resetInChatAssessment: () => void;
  startInChatAssessment: (mode: InChatAssessmentMode) => string | null;
  navigateTo: (path: string) => boolean;
  openExternalLink: (url: string) => boolean;
};

type NavigationActionConfig = {
  path: string;
  message: string;
};

const NAVIGATION_ACTIONS: Partial<Record<ChatActionType, NavigationActionConfig>> = {
  open_my_orders: {
    path: "/my-orders",
    message: "I will move to the order lookup page.",
  },
  open_me: {
    path: "/me",
    message: "I will move to your profile page.",
  },
  open_my_data: {
    path: "/my-data",
    message: "I will open your unified data page.",
  },
  open_check_ai: {
    path: "/check-ai",
    message: "I will move to the quick-check page.",
  },
  open_assess: {
    path: "/assess",
    message: "I will move to the deep assessment page.",
  },
  open_explore: {
    path: "/explore#home-products",
    message: "I will move to product explore.",
  },
  open_home: {
    path: "/",
    message: "I will move to the home page.",
  },
  open_home_products: {
    path: "/#home-products",
    message: "I will move to the home products section.",
  },
  open_7day_purchase: {
    path: "/?package=7#home-products",
    message: "I will move to the 7-day purchase section.",
  },
  open_chat_page: {
    path: "/chat",
    message: "I will open the full AI chat page.",
  },
  open_about: {
    path: "/about",
    message: "I will open the about page.",
  },
  open_contact: {
    path: "/about/contact",
    message: "I will open the contact page.",
  },
  open_terms: {
    path: "/about/terms",
    message: "I will open the terms page.",
  },
  open_privacy: {
    path: "/about/privacy",
    message: "I will open the privacy page.",
  },
  open_refund_policy: {
    path: "/about/refund-policy",
    message: "I will open the refund policy page.",
  },
  open_auth_phone: {
    path: "/auth/phone",
    message: "I will open the phone verification page.",
  },
  open_pharm_dashboard: {
    path: "/pharm",
    message: "I will open the pharmacy dashboard.",
  },
  open_pharm_manage_products: {
    path: "/pharm/manage-products",
    message: "I will open pharmacy product management.",
  },
  open_rider_dashboard: {
    path: "/rider",
    message: "I will open the rider dashboard.",
  },
  open_admin_login: {
    path: "/admin-login",
    message: "I will open the admin login page.",
  },
  open_admin_dashboard: {
    path: "/admin",
    message: "I will open the admin dashboard.",
  },
};

function buildNoopResult(): InteractiveActionResult {
  return { executed: false, message: "", summary: "" };
}

function runPageActionOrFallback(
  detail: ChatPageActionDetail,
  fallbackPath: string,
  fallbackMessage: string,
  navigateTo: (path: string) => boolean
): InteractiveActionResult {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname || "/" : "/";

  if (canHandlePageActionInPath(detail, pathname)) {
    dispatchChatPageAction(detail);
    return {
      executed: true,
      message: "I applied that action directly in the current page.",
      summary: "",
    };
  }

  const moved = navigateTo(fallbackPath);
  return {
    executed: moved,
    navigated: moved,
    message: fallbackMessage,
    summary: "",
  };
}

export async function runSingleInteractiveAction(
  params: RunSingleInteractiveActionParams
): Promise<InteractiveActionResult> {
  const {
    action,
    sessionMessages,
    executeCartCommandText,
    openCart,
    clearCart,
    openProfileSettings,
    resetInChatAssessment,
    startInChatAssessment,
    navigateTo,
    openExternalLink,
  } = params;

  if (action === "add_recommended_all" || action === "buy_recommended_all") {
    const result = await executeCartCommandText({
      commandText:
        action === "buy_recommended_all"
          ? "추천 상품 전체 바로 구매"
          : "추천 상품 전체 담아줘",
      sessionMessages,
    });
    return {
      executed: result.executed,
      message: result.executed
        ? result.hasAddress
          ? action === "buy_recommended_all"
            ? "I will open checkout with all recommended items."
            : "I added all recommended items to cart."
          : "Address is required first, so I will open address input."
        : "",
      summary: result.summary,
      hasAddress: result.hasAddress,
    };
  }

  if (action === "open_cart") {
    openCart();
    return { executed: true, message: "I opened the cart.", summary: "" };
  }

  if (action === "clear_cart") {
    clearCart();
    return { executed: true, message: "I cleared the cart.", summary: "" };
  }

  if (action === "open_profile") {
    openProfileSettings();
    return { executed: true, message: "I opened profile settings.", summary: "" };
  }

  if (action === "focus_home_products") {
    return runPageActionOrFallback(
      { action: "focus_home_products" },
      "/#home-products",
      "I moved to the home product section.",
      navigateTo
    );
  }

  if (action === "focus_manual_order_lookup") {
    return runPageActionOrFallback(
      { action: "focus_manual_order_lookup" },
      "/my-orders#manual-form",
      "I moved to the manual order lookup form.",
      navigateTo
    );
  }

  if (action === "focus_linked_order_lookup") {
    return runPageActionOrFallback(
      { action: "focus_linked_order_lookup" },
      "/my-orders",
      "I moved to the linked-phone order lookup section.",
      navigateTo
    );
  }

  if (action === "open_support_email") {
    resetInChatAssessment();
    const opened = openExternalLink("mailto:wellnessbox.me@gmail.com");
    return {
      executed: opened,
      navigated: opened,
      message: "I opened the support email composer.",
      summary: "",
    };
  }

  if (action === "open_support_call") {
    resetInChatAssessment();
    const opened = openExternalLink("tel:0262415530");
    return {
      executed: opened,
      navigated: opened,
      message: "I attempted to open support phone call.",
      summary: "",
    };
  }

  if (action === "start_chat_quick_check" || action === "start_chat_assess") {
    const mode: InChatAssessmentMode =
      action === "start_chat_quick_check" ? "quick" : "deep";
    const initializedText = startInChatAssessment(mode);
    if (!initializedText) return buildNoopResult();
    return { executed: true, message: initializedText, summary: "" };
  }

  const navigation = NAVIGATION_ACTIONS[action];
  if (navigation) {
    resetInChatAssessment();
    const moved = navigateTo(navigation.path);
    return {
      executed: moved,
      navigated: moved,
      message: navigation.message,
      summary: "",
    };
  }

  return buildNoopResult();
}
