import type { ChatActionType } from "@/lib/chat/agent-actions";

type SearchLike = {
  get(name: string): string | null;
};

export type ChatPageAgentContext = {
  routeKey: string;
  routePath: string;
  title: string;
  summary: string;
  suggestedPrompts: string[];
  preferredActions: ChatActionType[];
  runtimeContextText: string;
};

type BuildContextParams = {
  pathname?: string | null;
  searchParams?: SearchLike | null;
};

function normalizePath(pathname: string | null | undefined) {
  if (!pathname || typeof pathname !== "string") return "/";
  const trimmed = pathname.trim();
  return trimmed || "/";
}

function pickHomeSummary(searchParams?: SearchLike | null) {
  const packageQuery = searchParams?.get("package") || "";
  const categoryQuery = searchParams?.get("category") || "";
  const categoriesQuery = searchParams?.get("categories") || "";

  const hints: string[] = [];
  if (packageQuery) hints.push(`package=${packageQuery}`);
  if (categoryQuery) hints.push(`category=${categoryQuery}`);
  if (categoriesQuery) hints.push(`categories=${categoriesQuery}`);

  return hints.length > 0
    ? `홈 상품 필터 컨텍스트: ${hints.join(", ")}`
    : "홈 상품 탐색 컨텍스트.";
}

function buildRouteContext(
  routePath: string,
  title: string,
  summary: string,
  suggestedPrompts: string[],
  preferredActions: ChatActionType[]
): ChatPageAgentContext {
  const contextLines = [
    `route_path: ${routePath}`,
    `route_title: ${title}`,
    `route_summary: ${summary}`,
    `suggested_prompts: ${suggestedPrompts.join(" | ")}`,
    `preferred_actions: ${preferredActions.join(", ")}`,
  ];

  return {
    routeKey: routePath,
    routePath,
    title,
    summary,
    suggestedPrompts,
    preferredActions,
    runtimeContextText: contextLines.join("\n"),
  };
}

export function buildPageAgentContext(
  params: BuildContextParams = {}
): ChatPageAgentContext | null {
  const pathname = normalizePath(params.pathname);

  if (pathname.startsWith("/chat")) {
    return buildRouteContext(
      "chat",
      "AI 채팅 워크스페이스",
      "전체 화면 채팅입니다. 실행 가능한 액션과 후속 계획 중심으로 안내합니다.",
      [
        "이 페이지에서 가능한 작업을 요약해줘.",
        "지금 상태에서 다음으로 할 일을 추천해줘.",
        "추천 장바구니-주문 흐름을 실행해줘.",
      ],
      ["open_explore", "open_my_orders", "open_me", "open_cart"]
    );
  }

  if (pathname === "/" || pathname.startsWith("/explore")) {
    return buildRouteContext(
      "home-products",
      "홈 상품 탐색",
      pickHomeSummary(params.searchParams),
      [
        "7일치 패키지 상품 보여줘.",
        "홈 상품 섹션으로 이동해줘.",
        "장바구니 열고 결제 계속 진행해줘.",
      ],
      ["focus_home_products", "open_7day_purchase", "open_cart", "open_check_ai"]
    );
  }

  if (pathname.startsWith("/my-orders")) {
    return buildRouteContext(
      "my-orders",
      "주문 조회",
      "연결된 번호 조회와 수동 번호+비밀번호 조회를 지원합니다.",
      [
        "연결 번호 주문조회 영역으로 이동해줘.",
        "수동 주문조회 폼으로 이동해줘.",
        "주문 상태 확인을 단계별로 도와줘.",
      ],
      ["focus_linked_order_lookup", "focus_manual_order_lookup", "open_contact", "open_me"]
    );
  }

  if (pathname.startsWith("/me")) {
    return buildRouteContext(
      "me",
      "내 정보",
      "프로필, 전화번호 연동, 계정 설정을 관리합니다.",
      [
        "현재 페이지에서 프로필 수정 영역으로 이동해줘.",
        "현재 페이지에서 내 주문 영역으로 이동해줘.",
        "전화번호 연동 상태를 점검해줘.",
      ],
      ["focus_me_profile", "focus_me_orders", "open_profile", "open_my_orders"]
    );
  }

  if (pathname.startsWith("/my-data")) {
    return buildRouteContext(
      "my-data",
      "내 데이터 대시보드",
      "검사/빠른검사/주문/상담 데이터를 통합 조회합니다.",
      [
        "현재 페이지에서 계정 요약 섹션으로 이동해줘.",
        "현재 페이지에서 주문 내역 섹션으로 이동해줘.",
        "최근 데이터 기반으로 다음 액션 추천해줘.",
      ],
      [
        "focus_my_data_account",
        "focus_my_data_orders",
        "open_my_orders",
        "open_assess",
      ]
    );
  }

  if (pathname.startsWith("/assess")) {
    return buildRouteContext(
      "assess",
      "정밀검사",
      "정밀검사 진행 화면입니다. 페이지 내 진행 또는 채팅형 검사 전환이 가능합니다.",
      [
        "현재 페이지에서 정밀검사 진행 영역으로 이동해줘.",
        "채팅에서 정밀검사를 진행해줘.",
        "빠른검사로 전환해줘.",
        "검사 결과 기반 상품 추천해줘.",
      ],
      ["focus_assess_flow", "start_chat_assess", "open_check_ai", "open_explore"]
    );
  }

  if (pathname.startsWith("/check-ai")) {
    return buildRouteContext(
      "check-ai",
      "빠른검사",
      "빠른검사 진행 화면입니다. 페이지 내 진행 또는 정밀검사 전환이 가능합니다.",
      [
        "현재 페이지에서 빠른검사 문항 영역으로 이동해줘.",
        "채팅에서 빠른검사를 진행해줘.",
        "정밀검사 페이지로 이동해줘.",
        "결과 기반 추천 상품 열어줘.",
      ],
      [
        "focus_check_ai_form",
        "start_chat_quick_check",
        "open_assess",
        "open_explore",
      ]
    );
  }

  if (pathname.startsWith("/pharm")) {
    return buildRouteContext(
      "pharm",
      "약국 운영",
      "약국 대시보드와 상품 관리를 지원합니다.",
      [
        "약국 주문 관리 화면으로 이동해줘.",
        "약국 상품 관리 화면으로 이동해줘.",
        "대기 주문 처리 순서를 안내해줘.",
      ],
      ["open_pharm_dashboard", "open_pharm_manage_products", "open_contact", "open_chat_page"]
    );
  }

  if (pathname.startsWith("/rider")) {
    return buildRouteContext(
      "rider",
      "라이더 운영",
      "라이더 배송 대시보드와 상태 처리를 지원합니다.",
      [
        "라이더 배송 관리 화면으로 이동해줘.",
        "배송 상태 처리 순서를 안내해줘.",
        "문의 페이지 열어줘.",
      ],
      ["open_rider_dashboard", "open_contact", "open_chat_page", "open_my_orders"]
    );
  }

  if (pathname.startsWith("/admin")) {
    return buildRouteContext(
      "admin",
      "관리자 운영",
      "관리자 로그인 및 사이트 운영 컨텍스트입니다.",
      [
        "관리자 로그인 페이지 열어줘.",
        "관리자 대시보드 열어줘.",
        "운영 관련 바로가기 보여줘.",
      ],
      ["open_admin_login", "open_admin_dashboard", "open_contact", "open_chat_page"]
    );
  }

  if (pathname.startsWith("/about")) {
    return buildRouteContext(
      "about",
      "문의 및 정책",
      "문의, 약관, 개인정보, 환불 정책 페이지 컨텍스트입니다.",
      [
        "문의 페이지 열어줘.",
        "약관/개인정보 페이지 열어줘.",
        "환불 정책 페이지 열어줘.",
      ],
      ["open_contact", "open_terms", "open_privacy", "open_refund_policy"]
    );
  }

  return buildRouteContext(
    "generic",
    "일반 페이지",
    "일반 탐색 컨텍스트입니다. 필요 시 가이드 액션과 이동 바로가기를 제공합니다.",
    [
      "이 페이지에서 가능한 작업을 알려줘.",
      "AI 전체 채팅 화면으로 이동해줘.",
      "상품 탐색 화면으로 이동해줘.",
    ],
    ["open_chat_page", "open_explore", "open_my_orders", "open_contact"]
  );
}
