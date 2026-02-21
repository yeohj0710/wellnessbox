import "server-only";

const HYPHEN_BASE_URL = "https://api.hyphen.im";

export const HYPHEN_PROVIDER = "HYPHEN_NHIS";

export const NHIS_ENDPOINTS = {
  CHECKUP_LIST: "/in0002000977",
  CHECKUP_DETAIL_0978: "/in0002000978",
  CHECKUP_DETAIL_0979: "/in0002000979",
  CHECKUP_DETAIL_0980: "/in0002000980",
  LIFESTYLE: "/in0002000981",
  HEALTH_AGE: "/in0002000982",
  DETAIL_0983: "/in0002000983",
  DETAIL_0984: "/in0002000984",
  DETAIL_0985: "/in0002000985",
  DETAIL_0986: "/in0002000986",
  DETAIL_0987: "/in0002000987",
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
  stepMode?: HyphenStepMode;
  step?: HyphenStep;
  step_data?: unknown;
  showCookie?: "Y";
  cookieData?: unknown;
  [key: string]: unknown;
};

type HyphenRequestOptions = {
  userTrNo?: string;
};

type HyphenRecord = Record<string, unknown>;

function asRecord(value: unknown): HyphenRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as HyphenRecord;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseYesNoFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "y";
}

function resolveHyphenAuthHeaders(): Record<string, string> {
  const mode = (process.env.HYPHEN_AUTH_MODE || "header").toLowerCase();
  if (mode === "oauth") {
    const token = asNonEmptyString(process.env.HYPHEN_ACCESS_TOKEN);
    if (!token) {
      throw new Error(
        "HYPHEN_ACCESS_TOKEN must be configured when HYPHEN_AUTH_MODE=oauth"
      );
    }
    return { Authorization: `Bearer ${token}` };
  }

  const userId = asNonEmptyString(process.env.HYPHEN_USER_ID);
  const hkey = asNonEmptyString(process.env.HYPHEN_HKEY);
  if (!userId || !hkey) {
    throw new Error("HYPHEN_USER_ID and HYPHEN_HKEY must be configured");
  }
  return {
    "User-Id": userId,
    Hkey: hkey,
  };
}

function shouldUseGustationHeader() {
  return parseYesNoFlag(process.env.HYPHEN_USE_GUSTATION);
}

function normalizeCommon(payload: unknown): HyphenCommon {
  const root = asRecord(payload) ?? {};
  const common = asRecord(root.common) ?? {};
  return {
    userTrNo: asNonEmptyString(common.userTrNo),
    hyphenTrNo: asNonEmptyString(common.hyphenTrNo),
    errYn: asNonEmptyString(common.errYn),
    errCd: asNonEmptyString(common.errCd),
    errMsg: asNonEmptyString(common.errMsg),
  };
}

export class HyphenApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly errCd?: string;
  readonly errMsg?: string;
  readonly hyphenTrNo?: string;
  readonly userTrNo?: string;
  readonly body?: unknown;

  constructor(options: {
    status: number;
    endpoint: string;
    errCd?: string;
    errMsg?: string;
    hyphenTrNo?: string;
    userTrNo?: string;
    body?: unknown;
  }) {
    super(options.errMsg || "Hyphen API request failed");
    this.name = "HyphenApiError";
    this.status = options.status;
    this.endpoint = options.endpoint;
    this.errCd = options.errCd;
    this.errMsg = options.errMsg;
    this.hyphenTrNo = options.hyphenTrNo;
    this.userTrNo = options.userTrNo;
    this.body = options.body;
  }
}

export function isHyphenApiError(error: unknown): error is HyphenApiError {
  return error instanceof HyphenApiError;
}

async function hyphenPost<TData = Record<string, unknown>>(
  endpoint: HyphenEndpointPath,
  body: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
): Promise<HyphenApiResponse<TData>> {
  const authHeaders = resolveHyphenAuthHeaders();
  const headers = new Headers({
    "Content-Type": "application/json",
    ...authHeaders,
  });

  if (shouldUseGustationHeader()) {
    headers.set("Hyphen-Gustation", "Y");
  }
  if (options.userTrNo) {
    headers.set("user-tr-no", options.userTrNo);
  }

  const response = await fetch(`${HYPHEN_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new HyphenApiError({
      status: response.status || 502,
      endpoint,
      errMsg: "Hyphen API returned invalid JSON",
      body: text,
    });
  }

  const common = normalizeCommon(payload);
  const hasCommonError = common.errYn === "Y";
  if (!response.ok || hasCommonError) {
    throw new HyphenApiError({
      status: response.status || 502,
      endpoint,
      errCd: common.errCd,
      errMsg: common.errMsg || `Hyphen endpoint ${endpoint} failed`,
      hyphenTrNo: common.hyphenTrNo,
      userTrNo: common.userTrNo,
      body: payload,
    });
  }

  return payload as HyphenApiResponse<TData>;
}

export function extractStepData(payload: unknown): unknown {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  return data?.stepData ?? data?.step_data ?? root?.stepData ?? root?.step_data;
}

export function extractCookieData(payload: unknown): unknown {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  return data?.cookieData ?? data?.cookie_data ?? root?.cookieData ?? root?.cookie_data;
}

export function getHyphenCommon(payload: unknown): HyphenCommon {
  return normalizeCommon(payload);
}

export async function fetchCheckupList(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.CHECKUP_LIST, payload, options);
}

export async function fetchLifestyle(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.LIFESTYLE, payload, options);
}

export async function fetchHealthAge(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.HEALTH_AGE, payload, options);
}

export async function fetchNhis0978(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.CHECKUP_DETAIL_0978, payload, options);
}

export async function fetchNhis0979(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.CHECKUP_DETAIL_0979, payload, options);
}

export async function fetchNhis0980(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.CHECKUP_DETAIL_0980, payload, options);
}

export async function fetchNhis0983(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.DETAIL_0983, payload, options);
}

export async function fetchNhis0984(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.DETAIL_0984, payload, options);
}

export async function fetchNhis0985(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.DETAIL_0985, payload, options);
}

export async function fetchNhis0986(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.DETAIL_0986, payload, options);
}

export async function fetchNhis0987(
  payload: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
) {
  return hyphenPost(NHIS_ENDPOINTS.DETAIL_0987, payload, options);
}
