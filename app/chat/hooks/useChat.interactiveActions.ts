import type { ChatActionType } from "@/lib/chat/agent-actions";
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
    message: "내 주문 조회 화면으로 이동할게요.",
  },
  open_me: {
    path: "/me",
    message: "내 정보 화면으로 이동할게요.",
  },
  open_my_data: {
    path: "/my-data",
    message: "내 데이터 페이지로 이동할게요.",
  },
  open_check_ai: {
    path: "/check-ai",
    message: "빠른검사 페이지로 이동할게요.",
  },
  open_assess: {
    path: "/assess",
    message: "정밀검사 페이지로 이동할게요.",
  },
  open_explore: {
    path: "/explore#home-products",
    message: "상품 탐색 화면으로 이동할게요.",
  },
  open_home: {
    path: "/",
    message: "홈 화면으로 이동할게요.",
  },
  open_home_products: {
    path: "/#home-products",
    message: "홈 상품 섹션으로 이동할게요.",
  },
  open_7day_purchase: {
    path: "/?package=7#home-products",
    message: "7일치 구매 시작 위치로 이동할게요.",
  },
  open_chat_page: {
    path: "/chat",
    message: "AI 맞춤 상담 전체 화면으로 이동할게요.",
  },
  open_about: {
    path: "/about",
    message: "회사 소개 페이지로 이동할게요.",
  },
  open_contact: {
    path: "/about/contact",
    message: "문의하기 페이지로 이동할게요.",
  },
  open_terms: {
    path: "/about/terms",
    message: "이용약관 페이지를 열게요.",
  },
  open_privacy: {
    path: "/about/privacy",
    message: "개인정보처리방침 페이지를 열게요.",
  },
  open_refund_policy: {
    path: "/about/refund-policy",
    message: "환불 규정 페이지를 열게요.",
  },
  open_auth_phone: {
    path: "/auth/phone",
    message: "전화 인증 페이지로 이동할게요.",
  },
  open_pharm_dashboard: {
    path: "/pharm",
    message: "약국 주문 관리 페이지로 이동할게요.",
  },
  open_pharm_manage_products: {
    path: "/pharm/manage-products",
    message: "약국 상품 등록/관리 페이지로 이동할게요.",
  },
  open_rider_dashboard: {
    path: "/rider",
    message: "라이더 배송 관리 페이지로 이동할게요.",
  },
  open_admin_login: {
    path: "/admin-login",
    message: "관리자 로그인 페이지로 이동할게요.",
  },
  open_admin_dashboard: {
    path: "/admin",
    message: "사이트 관리 페이지로 이동할게요.",
  },
};

function buildNoopResult(): InteractiveActionResult {
  return { executed: false, message: "", summary: "" };
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
            ? "추천 제품을 주문할 수 있도록 바로 열어둘게요."
            : "추천 제품을 장바구니에 담아둘게요."
          : "주소 입력이 필요해서 주소 입력 창부터 열어둘게요."
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
    return { executed: true, message: "장바구니를 비웠어요.", summary: "" };
  }

  if (action === "open_profile") {
    openProfileSettings();
    return { executed: true, message: "프로필 설정을 열어둘게요.", summary: "" };
  }

  if (action === "open_support_email") {
    resetInChatAssessment();
    const opened = openExternalLink("mailto:wellnessbox.me@gmail.com");
    return {
      executed: opened,
      navigated: opened,
      message: "문의 이메일 작성 창을 열게요.",
      summary: "",
    };
  }

  if (action === "open_support_call") {
    resetInChatAssessment();
    const opened = openExternalLink("tel:0262415530");
    return {
      executed: opened,
      navigated: opened,
      message: "고객센터 전화 연결을 시도할게요.",
      summary: "",
    };
  }

  if (action === "start_chat_quick_check" || action === "start_chat_assess") {
    const mode: InChatAssessmentMode = action === "start_chat_quick_check" ? "quick" : "deep";
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
