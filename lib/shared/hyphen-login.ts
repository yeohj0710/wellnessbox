export const HYPHEN_EASY_LOGIN_ORG_OPTIONS = [
  { value: "pass", label: "PASS" },
  { value: "kakao", label: "KAKAO" },
  { value: "toss", label: "TOSS" },
] as const;

export type HyphenEasyLoginOrg =
  (typeof HYPHEN_EASY_LOGIN_ORG_OPTIONS)[number]["value"];

export const HYPHEN_PASS_MOBILE_CO_OPTIONS = [
  { value: "SKT", label: "SKT" },
  { value: "KT", label: "KT" },
  { value: "LGT", label: "LG U+" },
] as const;

export type HyphenPassMobileCo =
  (typeof HYPHEN_PASS_MOBILE_CO_OPTIONS)[number]["value"];

const LOGIN_ORG_LOOKUP: Record<string, HyphenEasyLoginOrg> = {
  pass: "pass",
  kakao: "kakao",
  toss: "toss",
};

const PASS_MOBILE_CO_LOOKUP: Record<string, HyphenPassMobileCo> = {
  SKT: "SKT",
  KT: "KT",
  LGT: "LGT",
  LGU: "LGT",
  "LGU+": "LGT",
  LGUPLUS: "LGT",
};

function normalizeAlphaNumUpper(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9+]/g, "");
}

export function normalizeHyphenEasyLoginOrg(
  value: string | null | undefined
): HyphenEasyLoginOrg | null {
  const key = (value || "").trim().toLowerCase();
  return LOGIN_ORG_LOOKUP[key] ?? null;
}

export function normalizeHyphenPassMobileCo(
  value: string | null | undefined
): HyphenPassMobileCo | null {
  const key = normalizeAlphaNumUpper(value || "");
  return PASS_MOBILE_CO_LOOKUP[key] ?? null;
}

export function getHyphenLoginOrgLabel(
  value: string | null | undefined
): string {
  const normalized = normalizeHyphenEasyLoginOrg(value);
  if (!normalized) return value || "-";
  const found = HYPHEN_EASY_LOGIN_ORG_OPTIONS.find(
    (option) => option.value === normalized
  );
  return found?.label ?? normalized.toUpperCase();
}
