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
    message: "주문 조회 화면으로 이동해둘게요.",
  },
  open_me: {
    path: "/me",
    message: "내 정보 페이지로 이동해둘게요.",
  },
  open_my_data: {
    path: "/my-data",
    message: "내 데이터 통합 화면을 열어둘게요.",
  },
  open_check_ai: {
    path: "/check-ai",
    message: "빠른검사 페이지로 이동해둘게요.",
  },
  open_assess: {
    path: "/assess",
    message: "정밀검사 페이지로 이동해둘게요.",
  },
  open_explore: {
    path: "/explore#home-products",
    message: "상품 탐색 화면으로 이동해둘게요.",
  },
  open_home: {
    path: "/",
    message: "홈으로 이동해둘게요.",
  },
  open_home_products: {
    path: "/#home-products",
    message: "홈 상품 섹션으로 이동해둘게요.",
  },
  open_7day_purchase: {
    path: "/?package=7#home-products",
    message: "7일치 구매 섹션으로 이동해둘게요.",
  },
  open_chat_page: {
    path: "/chat",
    message: "AI 전체 채팅 화면을 열어둘게요.",
  },
  open_about: {
    path: "/about",
    message: "회사 소개 페이지를 열어둘게요.",
  },
  open_contact: {
    path: "/about/contact",
    message: "문의 페이지를 열어둘게요.",
  },
  open_terms: {
    path: "/about/terms",
    message: "이용약관 페이지를 열어둘게요.",
  },
  open_privacy: {
    path: "/about/privacy",
    message: "개인정보처리방침 페이지를 열어둘게요.",
  },
  open_refund_policy: {
    path: "/about/refund-policy",
    message: "환불 정책 페이지를 열어둘게요.",
  },
  open_auth_phone: {
    path: "/auth/phone",
    message: "전화번호 인증 페이지를 열어둘게요.",
  },
  open_pharm_dashboard: {
    path: "/pharm",
    message: "약국 대시보드를 열어둘게요.",
  },
  open_pharm_manage_products: {
    path: "/pharm/manage-products",
    message: "약국 상품 관리 화면을 열어둘게요.",
  },
  open_rider_dashboard: {
    path: "/rider",
    message: "라이더 대시보드를 열어둘게요.",
  },
  open_admin_login: {
    path: "/admin-login",
    message: "관리자 로그인 페이지를 열어둘게요.",
  },
  open_admin_dashboard: {
    path: "/admin",
    message: "관리자 대시보드를 열어둘게요.",
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
      message: "현재 페이지에서 바로 실행해둘게요.",
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
            ? "추천 상품 전체로 바로 구매할 수 있게 열어둘게요."
            : "추천 상품 전체를 장바구니에 담아둘게요."
          : "주소 입력이 먼저 필요해서 주소 입력부터 열어둘게요."
        : "",
      summary: result.summary,
      hasAddress: result.hasAddress,
    };
  }

  if (action === "open_cart") {
    openCart();
    return { executed: true, message: "장바구니를 열어둘게요.", summary: "" };
  }

  if (action === "clear_cart") {
    clearCart();
    return { executed: true, message: "장바구니를 비워둘게요.", summary: "" };
  }

  if (action === "open_profile") {
    openProfileSettings();
    return { executed: true, message: "프로필 설정 창을 열어둘게요.", summary: "" };
  }

  if (action === "focus_home_products") {
    return runPageActionOrFallback(
      { action: "focus_home_products" },
      "/#home-products",
      "현재 페이지에서 홈 상품 섹션으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_manual_order_lookup") {
    return runPageActionOrFallback(
      { action: "focus_manual_order_lookup" },
      "/my-orders#manual-form",
      "수동 주문 조회 폼으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_linked_order_lookup") {
    return runPageActionOrFallback(
      { action: "focus_linked_order_lookup" },
      "/my-orders",
      "연결 번호 주문 조회 영역으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_me_profile") {
    return runPageActionOrFallback(
      { action: "focus_me_profile" },
      "/me#me-profile-section",
      "현재 페이지에서 프로필 영역으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_me_orders") {
    return runPageActionOrFallback(
      { action: "focus_me_orders" },
      "/me#me-orders-section",
      "현재 페이지에서 내 주문 영역으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_my_data_account") {
    return runPageActionOrFallback(
      { action: "focus_my_data_account" },
      "/my-data#my-data-account",
      "계정 요약 섹션으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_my_data_orders") {
    return runPageActionOrFallback(
      { action: "focus_my_data_orders" },
      "/my-data#my-data-orders",
      "주문 내역 섹션으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_check_ai_form") {
    return runPageActionOrFallback(
      { action: "focus_check_ai_form" },
      "/check-ai#check-ai-form",
      "빠른검사 문항 영역으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "focus_assess_flow") {
    return runPageActionOrFallback(
      { action: "focus_assess_flow" },
      "/assess#assess-flow",
      "정밀검사 진행 영역으로 이동해둘게요.",
      navigateTo
    );
  }

  if (action === "open_support_email") {
    resetInChatAssessment();
    const opened = openExternalLink("mailto:wellnessbox.me@gmail.com");
    return {
      executed: opened,
      navigated: opened,
      message: "문의 이메일 작성 창을 열어둘게요.",
      summary: "",
    };
  }

  if (action === "open_support_call") {
    resetInChatAssessment();
    const opened = openExternalLink("tel:0262415530");
    return {
      executed: opened,
      navigated: opened,
      message: "고객센터 전화 연결을 시도해둘게요.",
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
