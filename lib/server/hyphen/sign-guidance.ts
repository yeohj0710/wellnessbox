const STALE_SIGN_ERROR_CODES = new Set(["LOGIN-999", "C0012-001"]);
const SIGN_PENDING_ERROR_CODES = new Set(["HYPHEN_TIMEOUT", "HYF-0002", "HYF-9999"]);
const SIGN_PENDING_DELAY_KEYWORDS = ["timed out", "timeout", "지연", "시간 초과"];

export type SignGuidance =
  | {
      nextAction: "init" | "sign";
      reason: "nhis_auth_expired" | "nhis_sign_init_required" | "nhis_sign_pending";
      status: 409;
      error: string;
    }
  | null;

function normalizeCode(code: string | null | undefined) {
  return (code || "").trim().toUpperCase();
}

function normalizeMessage(message: string | null | undefined) {
  return (message || "").trim().toLowerCase();
}

export function isStaleSignErrorCode(code: string | null | undefined) {
  const normalized = normalizeCode(code);
  if (!normalized) return false;
  return STALE_SIGN_ERROR_CODES.has(normalized);
}

function isSignPendingDelayError(
  code: string | null | undefined,
  message: string | null | undefined
) {
  const normalizedCode = normalizeCode(code);
  if (normalizedCode && SIGN_PENDING_ERROR_CODES.has(normalizedCode)) return true;

  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage) return false;
  return SIGN_PENDING_DELAY_KEYWORDS.some((keyword) =>
    normalizedMessage.includes(keyword)
  );
}

export function resolveSignGuidance(input: {
  code: string | null | undefined;
  message: string | null | undefined;
}): SignGuidance {
  const code = normalizeCode(input.code);
  const message = normalizeMessage(input.message);

  if (isStaleSignErrorCode(code)) {
    return {
      nextAction: "init",
      reason: "nhis_auth_expired",
      status: 409,
      error:
        "인증 세션이 만료되었습니다. 카카오 인증 요청(init)부터 다시 진행해 주세요.",
    };
  }

  if (
    message.includes("요청") &&
    (message.includes("없") || message.includes("만료"))
  ) {
    return {
      nextAction: "init",
      reason: "nhis_sign_init_required",
      status: 409,
      error:
        "인증 요청 정보가 없거나 만료되었습니다. 카카오 인증 요청(init)을 다시 진행해 주세요.",
    };
  }

  if (isSignPendingDelayError(code, message)) {
    return {
      nextAction: "sign",
      reason: "nhis_sign_pending",
      status: 409,
      error:
        "인증 응답이 지연되고 있습니다. 카카오 인증 완료 후 '인증 완료 확인'을 눌러 다시 확인해 주세요.",
    };
  }

  if (
    message.includes("승인") ||
    message.includes("대기") ||
    message.includes("카카오톡")
  ) {
    return {
      nextAction: "sign",
      reason: "nhis_sign_pending",
      status: 409,
      error:
        "카카오톡 인증 승인 대기 중입니다. 승인 후 '연동 완료 확인'을 다시 진행해 주세요.",
    };
  }

  return null;
}
