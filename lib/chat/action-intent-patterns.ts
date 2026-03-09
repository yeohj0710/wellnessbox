export const ADD_REGEX =
  /(장바구니|카트|담아|담기|추가|넣어|넣기|add\s*(to)?\s*cart|put\s*in\s*cart)/i;
export const BUY_REGEX =
  /(바로\s*구매|구매\s*(해줘|진행|할래|하고\s*싶어)?|결제|주문(?!\s*(내역|조회|번호))\s*(해줘|진행|할래)?|checkout|pay\s*now|buy\s*now)/i;
export const OPEN_CART_REGEX =
  /((장바구니|카트).*(열어|보여|보기|확인)|결제창.*(열어|보여)|open\s*cart|show\s*cart)/i;
export const CLEAR_CART_REGEX =
  /((장바구니|카트).*(비워|초기화|모두\s*삭제|삭제.*clear)|clear\s*cart)/i;
export const MANUAL_ORDER_LOOKUP_REGEX = /(manual|수동|다른\s*번호|직접\s*입력)/i;
export const LINKED_ORDER_LOOKUP_REGEX = /(연결된?\s*번호|인증된?\s*번호|linked\s*phone)/i;
export const HOME_SECTION_FOCUS_REGEX =
  /(상품\s*섹션|상품\s*목록|제품\s*목록|home\s*products|home-products)/i;
export const ME_PROFILE_FOCUS_REGEX =
  /(프로필\s*(설정|영역|섹션)|내\s*정보\s*(설정|영역|섹션)|account\s*profile|profile\s*section)/i;
export const ME_ORDERS_FOCUS_REGEX =
  /(내\s*정보.*주문|주문\s*내역\s*(영역|섹션)?|my\s*orders?\s*section|order\s*section)/i;
export const MY_DATA_ACCOUNT_FOCUS_REGEX =
  /(내\s*데이터.*계정|계정\s*정보|account\s*summary|profile\s*summary)/i;
export const MY_DATA_ORDERS_FOCUS_REGEX =
  /(내\s*데이터.*주문|주문\s*내역\s*(영역|섹션)|order\s*history\s*section)/i;
export const CHECK_AI_FORM_FOCUS_REGEX =
  /(빠른\s*검진.*(문항|질문|폼|문항\s*영역|질문\s*영역|제출\s*버튼|quick\s*check\s*(form|question)))/i;
export const ASSESS_FLOW_FOCUS_REGEX =
  /(정밀\s*검진.*(진행|문항|질문|섹션)|설문\s*진행|assessment\s*(flow|question))/i;
export const IN_PAGE_FOCUS_HINT_REGEX =
  /(현재\s*페이지|이\s*페이지|여기서.*페이지\s*안에서|scroll|스크롤)/i;
export const PROFILE_REGEX = /(프로필\s*설정|프로필|내\s*프로필|profile)/i;
export const MY_ORDERS_REGEX =
  /(내\s*주문|주문\s*(내역|조회)|배송\s*조회|my-orders|order\s*lookup)/i;
export const OPEN_ME_REGEX =
  /(내\s*정보|마이\s*페이지|내\s*프로필|\/me\b|my\s*profile)/i;
export const MY_DATA_REGEX =
  /(내\s*데이터|마이\s*데이터|통합\s*데이터|my-data|data\s*dashboard)/i;
export const QUICK_CHECK_REGEX =
  /(빠른\s*검진|간단\s*검진|체크AI|check\s*ai|quick\s*check)/i;
export const DEEP_ASSESS_REGEX =
  /(정밀\s*검진|상세\s*검진|심층\s*검진|deep\s*assess|deep\s*assessment)/i;
export const GENERIC_ASSESS_REGEX =
  /(진단|건강\s*검진|검진\s*진행|검진\s*시작|검진\s*페이지)/i;
export const EXPLORE_REGEX =
  /(상품\s*(목록|보기|둘러|탐색)|제품\s*(목록|보기|탐색)|둘러보기|탐색\s*페이지|구매\s*페이지|explore)/i;
export const HOME_REGEX =
  /(홈(으로)?\s*(가|이동)|메인(으로)?\s*(가|이동)|첫\s*페이지|landing|home)/i;
export const HOME_PRODUCTS_REGEX =
  /(홈\s*상품|상품\s*섹션|상품\s*리스트|제품\s*섹션|home-products|home\s*products)/i;
export const START_7DAY_REGEX = /(7일치\s*구매|7일\s*패키지|7일치\s*시작|7-day|7day)/i;
export const CHAT_PAGE_REGEX =
  /(채팅\s*페이지|상담\s*페이지|ai\s*맞춤\s*상담|전체\s*화면\s*채팅|full\s*chat)/i;
export const ABOUT_REGEX = /(회사\s*소개|브랜드\s*소개|about)/i;
export const CONTACT_REGEX = /(문의(하기)?|고객\s*센터|contact|연락처)/i;
export const TERMS_REGEX = /(이용\s*약관|약관|terms)/i;
export const PRIVACY_REGEX = /(개인정보(처리방침)?|프라이버시|privacy)/i;
export const REFUND_REGEX = /(환불|취소\s*규정|refund)/i;
export const PHONE_AUTH_REGEX = /(번호\s*인증|전화\s*인증|otp|인증번호|phone\s*auth)/i;
export const SUPPORT_EMAIL_REGEX =
  /(문의\s*이메일|이메일\s*문의|support\s*email|wellnessbox\.me@gmail\.com)/i;
export const SUPPORT_CALL_REGEX =
  /(전화\s*연결|전화\s*문의|고객\s*센터\s*전화|대표\s*전화|02-?6241-?5530|support\s*call)/i;
export const PHARM_PRODUCTS_REGEX =
  /(약국\s*상품\s*(등록|관리)|약국\s*상품\s*등록\/?관리|pharm\s*manage\s*products)/i;
export const PHARM_DASHBOARD_REGEX = /(약국\s*(주문\s*)?관리|pharm)/i;
export const RIDER_DASHBOARD_REGEX = /(라이더\s*배송\s*관리|rider)/i;
export const ADMIN_LOGIN_REGEX = /(관리자\s*로그인|admin\s*login)/i;
export const ADMIN_DASHBOARD_REGEX = /(사이트\s*관리|관리자\s*대시보드|admin\s*dashboard)/i;
export const PURCHASE_PAGE_REGEX =
  /(구매\s*페이지|구매\s*화면|상품\s*페이지|쇼핑\s*페이지|7일치\s*구매|7일\s*패키지|checkout)/i;
export const CHAT_MODE_REGEX =
  /(대화로|채팅으로|여기서.*페이지\s*이동\s*(말고|없이)|문항.*(물어|질문)|질문.*(해줘|해주실까요)|같이\s*검진)/i;
export const NAVIGATION_INTENT_REGEX = /(페이지|이동|들어가|가줘|열어|오픈|navigate|open)/i;
export const AFFIRM_REGEX =
  /^(응|좋아|그래|네|예|알겠어|ok|go|진행해|맞아|좋습니다)\s*[!.?]*$/i;
export const RECOMMENDATION_SECTION_REGEX =
  /추천\s*상품\s*\(7일\s*기준\s*가격\)/i;
