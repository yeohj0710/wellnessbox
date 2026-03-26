export const BUSINESS_NAME = "웰니스박스";
export const BUSINESS_NAME_EN = "Wellnessbox";
export const BUSINESS_LEGAL_NAME = "주식회사 웰니스박스";
export const BUSINESS_REPRESENTATIVE_NAME = "권혁찬";
export const BUSINESS_REGISTRATION_NUMBER = "728-88-03267";
export const BUSINESS_CORPORATE_REGISTRATION_NUMBER = "110111-0932570";
export const BUSINESS_MAIL_ORDER_REPORT_NUMBER = "제2025-서울동대문-1562호";
export const BUSINESS_SUPPORT_PHONE = "02-6241-5530";
export const BUSINESS_SUPPORT_PHONE_E164 = "+82-2-6241-5530";
export const BUSINESS_SUPPORT_EMAIL = "contact@wellnessbox.kr";
export const BUSINESS_ADDRESS =
  "서울특별시 동대문구 경희대로 26, 2층 211호(회기동, 삼의원창업센터)";

export const BUSINESS_INFO_ROWS = [
  `상호명: ${BUSINESS_LEGAL_NAME}`,
  `대표자: ${BUSINESS_REPRESENTATIVE_NAME}`,
  `사업자등록번호: ${BUSINESS_REGISTRATION_NUMBER}`,
  `법인등록번호: ${BUSINESS_CORPORATE_REGISTRATION_NUMBER}`,
  `통신판매업신고: ${BUSINESS_MAIL_ORDER_REPORT_NUMBER}`,
  `대표 전화번호: ${BUSINESS_SUPPORT_PHONE}`,
  `대표 이메일: ${BUSINESS_SUPPORT_EMAIL}`,
  `주소: ${BUSINESS_ADDRESS}`,
] as const;
