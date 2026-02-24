import "server-only";

export const HYPHEN_BASE_URL = "https://api.hyphen.im";
export const HYPHEN_PROVIDER = "HYPHEN_NHIS";

export const NHIS_MEDICAL_INFO_ENDPOINTS = {
  MEDICAL_INFO: "/in0002000427",
  MEDICATION_INFO: "/in0002000428",
  CHECKUP_TARGET: "/in0002000429",
  CHECKUP_RESULT_LIST: "/in0002000430",
  CHECKUP_YEARLY_RESULT: "/in0002000431",
  CHECKUP_OVERVIEW: "/in0002000432",
  SCALING_INFO: "/in0002000433",
  HEALTH_AGE: "/in0002000434",
  INFANT_CHECKUP_TARGET: "/in0002000435",
  INFANT_CHECKUP_RESULT: "/in0002000436",
} as const;

export const NHIS_MEDICAL_INFO2_ENDPOINTS = {
  CHECKUP_LIST: "/in0002000977",
  CHECKUP_DETAIL_0978: "/in0002000978",
  CHECKUP_DETAIL_0979: "/in0002000979",
  CHECKUP_DETAIL_0980: "/in0002000980",
  LIFESTYLE: "/in0002000981",
  HEALTH_AGE_0982: "/in0002000982",
  DETAIL_0983: "/in0002000983",
  DETAIL_0984: "/in0002000984",
  DETAIL_0985: "/in0002000985",
  DETAIL_0986: "/in0002000986",
  DETAIL_0987: "/in0002000987",
} as const;

export const NHIS_ENDPOINTS = {
  ...NHIS_MEDICAL_INFO_ENDPOINTS,
  ...NHIS_MEDICAL_INFO2_ENDPOINTS,
} as const;

export type HyphenEndpointPath =
  (typeof NHIS_ENDPOINTS)[keyof typeof NHIS_ENDPOINTS];

export type HyphenLoginMethod = "EASY" | "CERT";
export type HyphenStepMode = "step";
export type HyphenStep = "init" | "sign";

export type HyphenCommon = {
  userTrNo?: string;
  hyphenTrNo?: string;
  errYn?: string;
  errCd?: string;
  errMsg?: string;
};

export type HyphenApiResponse<TData = Record<string, unknown>> = {
  common?: HyphenCommon;
  data?: TData;
  [key: string]: unknown;
};

export type HyphenNhisRequestPayload = {
  loginMethod?: HyphenLoginMethod;
  loginOrgCd?: string;
  resNm?: string;
  resNo?: string;
  mobileNo?: string;
  mobileCo?: string;
  cloudCertYn?: "Y" | "N";
  subjectType?: "00" | "01" | "02" | string;
  fromDate?: string;
  toDate?: string;
  yyyy?: string;
  detailYn?: "Y" | "N";
  imgYn?: "Y" | "N";
  detailKey?: string;
  detailKey2?: string;
  coption?: string;
  stepMode?: HyphenStepMode;
  step?: HyphenStep;
  step_data?: unknown;
  showCookie?: "Y";
  cookieData?: unknown;
  [key: string]: unknown;
};

export type HyphenRequestOptions = {
  userTrNo?: string;
};
