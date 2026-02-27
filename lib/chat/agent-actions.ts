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

export const CHAT_CAPABILITY_ACTIONS: ChatCapabilityAction[] = [
  {
    type: "add_recommended_all",
    label: "추천 전체 담기",
    prompt: "추천 상품 전체 장바구니에 담아줘",
    category: "cart",
    description: "추천된 제품을 한 번에 장바구니에 추가",
  },
  {
    type: "buy_recommended_all",
    label: "추천 전체 바로 구매",
    prompt: "추천 상품 전체 바로 구매 진행해줘",
    category: "cart",
    description: "추천 제품을 즉시 주문 흐름으로 이동",
  },
  {
    type: "clear_cart",
    label: "장바구니 비우기",
    prompt: "장바구니 비워줘",
    category: "cart",
    description: "장바구니 아이템을 모두 삭제",
  },
  {
    type: "open_cart",
    label: "장바구니 보기",
    prompt: "장바구니 열어줘",
    category: "cart",
    description: "현재 담긴 제품을 확인",
  },
  {
    type: "start_chat_quick_check",
    label: "대화형 빠른검사",
    prompt: "빠른검사를 페이지 이동 없이 대화로 시작해줘",
    category: "assessment",
    description: "채팅 내에서 빠르게 문항 검사 진행",
  },
  {
    type: "start_chat_assess",
    label: "대화형 정밀검사",
    prompt: "정밀검사를 페이지 이동 없이 대화로 진행해줘",
    category: "assessment",
    description: "채팅 내에서 정밀 문항 검사 진행",
  },
  {
    type: "open_check_ai",
    label: "빠른검사로 이동",
    prompt: "빠른검사 페이지로 이동해줘",
    category: "assessment",
    description: "빠른 검사 전용 페이지로 이동",
  },
  {
    type: "open_assess",
    label: "정밀검사 페이지",
    prompt: "정밀검사 페이지로 이동해줘",
    category: "assessment",
    description: "정밀 검사 전용 페이지로 이동",
  },
  {
    type: "open_profile",
    label: "프로필 설정",
    prompt: "프로필 설정 열어줘",
    category: "account",
    description: "채팅 내 프로필 편집 모달 열기",
  },
  {
    type: "open_me",
    label: "내 정보 열기",
    prompt: "내 정보 페이지로 이동해줘",
    category: "account",
    description: "마이페이지로 이동",
  },
  {
    type: "open_my_orders",
    label: "내 주문 조회",
    prompt: "내 주문 조회 화면으로 이동해줘",
    category: "account",
    description: "주문 내역/배송 상태 조회 페이지로 이동",
  },
  {
    type: "open_my_data",
    label: "내 데이터 열기",
    prompt: "내 데이터 페이지 열어줘",
    category: "account",
    description: "검사/상담/주문 데이터 통합 조회",
  },
  {
    type: "open_auth_phone",
    label: "전화 인증 페이지",
    prompt: "전화번호 인증 테스트 페이지로 이동해줘",
    category: "account",
    description: "휴대폰 OTP 인증 화면으로 이동",
  },
  {
    type: "open_home",
    label: "홈으로 이동",
    prompt: "홈으로 이동해줘",
    category: "navigation",
    description: "메인 랜딩으로 이동",
  },
  {
    type: "open_home_products",
    label: "홈 상품으로 이동",
    prompt: "홈 상품 섹션으로 이동해줘",
    category: "navigation",
    description: "홈의 상품 목록 앵커로 이동",
  },
  {
    type: "focus_home_products",
    label: "상품 목록으로 이동",
    prompt: "현재 페이지에서 상품 섹션으로 바로 이동해줘",
    category: "page",
    description: "홈/탐색 페이지라면 이동 없이 상품 섹션으로 스크롤",
  },
  {
    type: "focus_linked_order_lookup",
    label: "연결 번호 주문조회",
    prompt: "현재 페이지에서 연결된 번호 주문 조회 영역으로 이동해줘",
    category: "page",
    description: "내 주문 페이지의 연결 번호 조회 영역으로 포커스",
  },
  {
    type: "focus_manual_order_lookup",
    label: "수동 주문조회 폼",
    prompt: "현재 페이지에서 수동 주문 조회 폼으로 이동해줘",
    category: "page",
    description: "내 주문 페이지의 수동 조회 입력 폼으로 포커스",
  },
  {
    type: "focus_me_profile",
    label: "내 정보 프로필 영역",
    prompt: "현재 페이지에서 내 정보 프로필 설정 영역으로 이동해줘",
    category: "page",
    description: "/me 페이지에서 프로필/연락처 수정 영역으로 포커스",
  },
  {
    type: "focus_me_orders",
    label: "내 정보 주문 영역",
    prompt: "현재 페이지에서 내 정보의 주문 내역 영역으로 이동해줘",
    category: "page",
    description: "/me 페이지에서 주문 내역 섹션으로 포커스",
  },
  {
    type: "focus_my_data_account",
    label: "내 데이터 계정 정보",
    prompt: "현재 페이지에서 계정 정보 섹션으로 이동해줘",
    category: "page",
    description: "/my-data 페이지의 계정 요약 영역으로 포커스",
  },
  {
    type: "focus_my_data_orders",
    label: "내 데이터 주문 내역",
    prompt: "현재 페이지에서 주문 내역 섹션으로 이동해줘",
    category: "page",
    description: "/my-data 페이지의 주문 내역 아코디언으로 포커스",
  },
  {
    type: "focus_check_ai_form",
    label: "빠른검사 문항 영역",
    prompt: "현재 페이지에서 빠른검사 문항 영역으로 이동해줘",
    category: "page",
    description: "/check-ai 페이지의 질문 폼/제출 버튼 영역으로 포커스",
  },
  {
    type: "focus_assess_flow",
    label: "정밀검사 진행 영역",
    prompt: "현재 페이지에서 정밀검사 진행 영역으로 이동해줘",
    category: "page",
    description: "/assess 페이지의 현재 검사 단계로 포커스",
  },
  {
    type: "open_7day_purchase",
    label: "7일 패키지 보기",
    prompt: "7일치 구매 섹션으로 이동해줘",
    category: "navigation",
    description: "7일 패키지 구매 시작 화면으로 이동",
  },
  {
    type: "open_explore",
    label: "상품 둘러보기",
    prompt: "상품 둘러보기 페이지로 이동해줘",
    category: "navigation",
    description: "탐색 페이지 상품 섹션으로 이동",
  },
  {
    type: "open_chat_page",
    label: "AI 상담 전체화면",
    prompt: "AI 맞춤 상담 페이지로 이동해줘",
    category: "navigation",
    description: "채팅 전체 화면으로 이동",
  },
  {
    type: "open_about",
    label: "회사 소개",
    prompt: "회사 소개 페이지 열어줘",
    category: "support",
    description: "브랜드 소개 페이지 열기",
  },
  {
    type: "open_contact",
    label: "문의하기",
    prompt: "문의하기 페이지 열어줘",
    category: "support",
    description: "고객 문의 페이지로 이동",
  },
  {
    type: "open_terms",
    label: "이용약관",
    prompt: "이용약관 페이지 열어줘",
    category: "support",
    description: "서비스 이용약관 페이지로 이동",
  },
  {
    type: "open_privacy",
    label: "개인정보처리방침",
    prompt: "개인정보처리방침 페이지 열어줘",
    category: "support",
    description: "개인정보 처리방침 페이지로 이동",
  },
  {
    type: "open_refund_policy",
    label: "환불 규정",
    prompt: "환불 규정 페이지 열어줘",
    category: "support",
    description: "취소/환불 정책 페이지로 이동",
  },
  {
    type: "open_support_email",
    label: "문의 이메일",
    prompt: "문의 이메일 열어줘",
    category: "support",
    description: "기본 메일앱에서 문의 메일 작성",
  },
  {
    type: "open_support_call",
    label: "고객센터 전화",
    prompt: "고객센터 전화 연결해줘",
    category: "support",
    description: "전화 앱으로 문의 연결",
  },
  {
    type: "open_pharm_dashboard",
    label: "약국 주문 관리",
    prompt: "약국 주문 관리 페이지로 이동해줘",
    category: "operations",
    description: "약국 대시보드로 이동",
  },
  {
    type: "open_pharm_manage_products",
    label: "약국 상품 관리",
    prompt: "약국 상품 등록/관리 페이지로 이동해줘",
    category: "operations",
    description: "약국 상품 등록/수정 페이지로 이동",
  },
  {
    type: "open_rider_dashboard",
    label: "라이더 배송 관리",
    prompt: "라이더 배송 관리 페이지로 이동해줘",
    category: "operations",
    description: "라이더 대시보드로 이동",
  },
  {
    type: "open_admin_login",
    label: "관리자 로그인",
    prompt: "관리자 로그인 페이지로 이동해줘",
    category: "operations",
    description: "관리자 로그인 페이지로 이동",
  },
  {
    type: "open_admin_dashboard",
    label: "사이트 관리",
    prompt: "사이트 관리 페이지로 이동해줘",
    category: "operations",
    description: "관리자 대시보드로 이동",
  },
];

export const CHAT_ACTION_LABELS: Record<ChatActionType, string> =
  CHAT_CAPABILITY_ACTIONS.reduce((acc, item) => {
    acc[item.type] = item.label;
    return acc;
  }, {} as Record<ChatActionType, string>);

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
