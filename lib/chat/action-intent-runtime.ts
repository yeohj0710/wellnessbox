import type { ChatActionType } from "@/lib/chat/agent-actions";

export const NAVIGATION_ACTIONS = new Set<ChatActionType>([
  "open_my_orders",
  "open_me",
  "open_my_data",
  "open_check_ai",
  "open_assess",
  "open_explore",
  "open_home",
  "open_home_products",
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
]);

export const CART_ACTIONS = new Set<ChatActionType>([
  "add_recommended_all",
  "buy_recommended_all",
  "open_cart",
  "clear_cart",
]);

export const FALLBACK_ACTION_FEEDBACK: Partial<Record<ChatActionType, string>> = {
  open_check_ai: "빠른검진 페이지로 이동해둘게요.",
  open_assess: "정밀검진 페이지로 이동해둘게요.",
  open_my_orders: "내 주문 조회 화면으로 이동해둘게요.",
  open_my_data: "마이데이터 페이지로 이동해둘게요.",
  open_7day_purchase: "7일치 구매 섹션으로 이동해둘게요.",
  open_home_products: "홈 상품 섹션으로 이동해둘게요.",
  open_explore: "상품 탐색 화면으로 이동해둘게요.",
  open_home: "홈으로 이동해둘게요.",
  open_chat_page: "AI 상담 전체 화면으로 이동해둘게요.",
  open_me: "내 정보 페이지로 이동해둘게요.",
  open_auth_phone: "전화번호 인증 페이지로 이동해둘게요.",
  open_contact: "문의하기 페이지를 열어둘게요.",
  open_terms: "이용약관 페이지를 열어둘게요.",
  open_privacy: "개인정보처리방침 페이지를 열어둘게요.",
  open_refund_policy: "환불 규정 페이지를 열어둘게요.",
  open_about: "회사 소개 페이지를 열어둘게요.",
  open_support_email: "문의 이메일 작성 창을 열어둘게요.",
  open_support_call: "고객센터 전화 연결을 도와드릴게요.",
  open_pharm_dashboard: "약국 주문 관리 페이지로 이동해둘게요.",
  open_pharm_manage_products: "약국 상품 관리 페이지로 이동해둘게요.",
  open_rider_dashboard: "라이더 배송 관리 페이지로 이동해둘게요.",
  open_admin_login: "관리자 로그인 페이지로 이동해둘게요.",
  open_admin_dashboard: "관리자 대시보드로 이동해둘게요.",
  open_profile: "프로필 설정 창을 열어둘게요.",
  open_cart: "장바구니를 열어 확인할 수 있게 해둘게요.",
  clear_cart: "장바구니를 비워둘게요.",
  start_chat_quick_check: "페이지 이동 없이 대화형 빠른검진을 시작해둘게요.",
  start_chat_assess: "페이지 이동 없이 대화형 정밀검진을 시작해둘게요.",
  focus_home_products: "현재 페이지에서 상품 섹션으로 이동해둘게요.",
  focus_manual_order_lookup: "현재 페이지에서 수동 주문 조회 입력으로 이동해둘게요.",
  focus_linked_order_lookup: "현재 페이지에서 연결 번호 주문 조회 영역으로 이동해둘게요.",
  focus_me_profile: "현재 페이지에서 내 정보 프로필 영역으로 이동해둘게요.",
  focus_me_orders: "현재 페이지에서 내 주문 내역 영역으로 이동해둘게요.",
  focus_my_data_account: "현재 페이지에서 마이데이터 계정 정보 영역으로 이동해둘게요.",
  focus_my_data_orders: "현재 페이지에서 마이데이터 주문 내역 영역으로 이동해둘게요.",
  focus_check_ai_form: "현재 페이지에서 빠른검진 문항 영역으로 이동해둘게요.",
  focus_assess_flow: "현재 페이지에서 정밀검진 진행 영역으로 이동해둘게요.",
};

export type RuntimeContextFlags = {
  inMyOrders: boolean;
  inHomeProducts: boolean;
  inMe: boolean;
  inMyData: boolean;
  inCheckAi: boolean;
  inAssess: boolean;
};

export function buildRuntimeContextFlags(
  runtimeContextText: string
): RuntimeContextFlags {
  const text = runtimeContextText.toLowerCase();
  return {
    inMyOrders:
      text.includes("/my-orders") ||
      text.includes("my-orders") ||
      text.includes("order lookup") ||
      text.includes("route_key: my-orders") ||
      text.includes("route_path: my-orders"),
    inHomeProducts:
      text.includes("home-products") ||
      text.includes("/explore") ||
      text.includes("home product") ||
      text.includes("product browsing") ||
      text.includes("route_key: home-products") ||
      text.includes("route_path: home-products"),
    inMe:
      text.includes("/me") ||
      text.includes("route_key: me") ||
      text.includes("route_path: me") ||
      text.includes("my profile"),
    inMyData:
      text.includes("/my-data") ||
      text.includes("route_key: my-data") ||
      text.includes("route_path: my-data") ||
      text.includes("data dashboard"),
    inCheckAi:
      text.includes("/check-ai") ||
      text.includes("route_key: check-ai") ||
      text.includes("route_path: check-ai") ||
      text.includes("quick check"),
    inAssess:
      text.includes("/assess") ||
      text.includes("route_key: assess") ||
      text.includes("route_path: assess") ||
      text.includes("deep assessment"),
  };
}
