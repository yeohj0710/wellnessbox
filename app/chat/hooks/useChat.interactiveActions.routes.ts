import type { ChatActionType } from "@/lib/chat/agent-actions";
import {
  canHandlePageActionInPath,
  dispatchChatPageAction,
  type ChatPageActionDetail,
} from "@/lib/chat/page-action-events";
import type { InteractiveActionResult } from "./useChat.interactiveActions.types";

type NavigationActionConfig = {
  path: string;
  message: string;
};

type PageFocusActionConfig = {
  detail: ChatPageActionDetail;
  fallbackPath: string;
  fallbackMessage: string;
};

type ExternalLinkActionConfig = {
  url: string;
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

const PAGE_FOCUS_ACTIONS: Partial<Record<ChatActionType, PageFocusActionConfig>> = {
  focus_home_products: {
    detail: { action: "focus_home_products" },
    fallbackPath: "/#home-products",
    fallbackMessage: "현재 페이지에서 홈 상품 섹션으로 이동해둘게요.",
  },
  focus_manual_order_lookup: {
    detail: { action: "focus_manual_order_lookup" },
    fallbackPath: "/my-orders#manual-form",
    fallbackMessage: "수동 주문 조회 폼으로 이동해둘게요.",
  },
  focus_linked_order_lookup: {
    detail: { action: "focus_linked_order_lookup" },
    fallbackPath: "/my-orders",
    fallbackMessage: "연결 번호 주문 조회 영역으로 이동해둘게요.",
  },
  focus_me_profile: {
    detail: { action: "focus_me_profile" },
    fallbackPath: "/me#me-profile-section",
    fallbackMessage: "현재 페이지에서 프로필 영역으로 이동해둘게요.",
  },
  focus_me_orders: {
    detail: { action: "focus_me_orders" },
    fallbackPath: "/me#me-orders-section",
    fallbackMessage: "현재 페이지에서 내 주문 영역으로 이동해둘게요.",
  },
  focus_my_data_account: {
    detail: { action: "focus_my_data_account" },
    fallbackPath: "/my-data#my-data-account",
    fallbackMessage: "계정 요약 섹션으로 이동해둘게요.",
  },
  focus_my_data_orders: {
    detail: { action: "focus_my_data_orders" },
    fallbackPath: "/my-data#my-data-orders",
    fallbackMessage: "주문 내역 섹션으로 이동해둘게요.",
  },
  focus_check_ai_form: {
    detail: { action: "focus_check_ai_form" },
    fallbackPath: "/check-ai#check-ai-form",
    fallbackMessage: "빠른검사 문항 영역으로 이동해둘게요.",
  },
  focus_assess_flow: {
    detail: { action: "focus_assess_flow" },
    fallbackPath: "/assess#assess-flow",
    fallbackMessage: "정밀검사 진행 영역으로 이동해둘게요.",
  },
};

const EXTERNAL_LINK_ACTIONS: Partial<Record<ChatActionType, ExternalLinkActionConfig>> = {
  open_support_email: {
    url: "mailto:wellnessbox.me@gmail.com",
    message: "문의 이메일 작성 창을 열어둘게요.",
  },
  open_support_call: {
    url: "tel:0262415530",
    message: "고객센터 전화 연결을 시도해둘게요.",
  },
};

export function buildNoopInteractiveActionResult(): InteractiveActionResult {
  return { executed: false, message: "", summary: "" };
}

function runPageActionOrFallback(
  config: PageFocusActionConfig,
  navigateTo: (path: string) => boolean
): InteractiveActionResult {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname || "/" : "/";

  if (canHandlePageActionInPath(config.detail, pathname)) {
    dispatchChatPageAction(config.detail);
    return {
      executed: true,
      message: "현재 페이지에서 바로 실행해둘게요.",
      summary: "",
    };
  }

  const moved = navigateTo(config.fallbackPath);
  return {
    executed: moved,
    navigated: moved,
    message: config.fallbackMessage,
    summary: "",
  };
}

export function runPageFocusInteractiveAction(input: {
  action: ChatActionType;
  navigateTo: (path: string) => boolean;
}): InteractiveActionResult | null {
  const config = PAGE_FOCUS_ACTIONS[input.action];
  if (!config) return null;
  return runPageActionOrFallback(config, input.navigateTo);
}

export function runExternalLinkInteractiveAction(input: {
  action: ChatActionType;
  resetInChatAssessment: () => void;
  openExternalLink: (url: string) => boolean;
}): InteractiveActionResult | null {
  const config = EXTERNAL_LINK_ACTIONS[input.action];
  if (!config) return null;

  input.resetInChatAssessment();
  const opened = input.openExternalLink(config.url);
  return {
    executed: opened,
    navigated: opened,
    message: config.message,
    summary: "",
  };
}

export function runNavigationInteractiveAction(input: {
  action: ChatActionType;
  resetInChatAssessment: () => void;
  navigateTo: (path: string) => boolean;
}): InteractiveActionResult | null {
  const config = NAVIGATION_ACTIONS[input.action];
  if (!config) return null;

  input.resetInChatAssessment();
  const moved = input.navigateTo(config.path);
  return {
    executed: moved,
    navigated: moved,
    message: config.message,
    summary: "",
  };
}
