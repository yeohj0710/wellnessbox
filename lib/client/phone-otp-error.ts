"use client";

type ResolvePhoneOtpErrorInput = {
  status?: number;
  error?: string;
  retryAfterSec?: number;
  fallback?: string;
};

function hasKorean(text: string) {
  return /[ㄱ-ㅎ가-힣]/.test(text);
}

function normalizeMessage(text: string | undefined) {
  return (text || "").trim();
}

export function resolvePhoneOtpError({
  status,
  error,
  retryAfterSec,
  fallback = "요청 처리 중 오류가 발생했어요.",
}: ResolvePhoneOtpErrorInput) {
  const raw = normalizeMessage(error);

  if (raw && hasKorean(raw)) {
    return raw;
  }

  if (status === 429) {
    const waitSec =
      Number.isFinite(retryAfterSec) && (retryAfterSec as number) > 0
        ? Math.max(1, Math.ceil(retryAfterSec as number))
        : 0;
    if (waitSec > 0) {
      return `인증번호 재요청은 ${waitSec}초 후에 가능해요.`;
    }
    return "요청이 너무 빨라요. 잠시 후 다시 시도해 주세요.";
  }

  if (status === 401 || raw === "Unauthorized") {
    return "로그인 정보가 확인되지 않았어요. 다시 로그인 후 시도해 주세요.";
  }

  switch (raw) {
    case "Invalid JSON":
      return "요청 형식이 올바르지 않아요.";
    case "Invalid phone":
      return "전화번호 형식을 확인해 주세요.";
    case "Invalid input":
      return "입력값을 다시 확인해 주세요.";
    case "Too many requests":
      return "요청이 너무 빨라요. 잠시 후 다시 시도해 주세요.";
    case "Too many attempts":
      return "인증번호 입력 횟수를 초과했어요. 인증번호를 다시 받아 주세요.";
    case "OTP not found":
      return "인증번호를 찾을 수 없어요. 인증번호를 다시 요청해 주세요.";
    case "Invalid code":
      return "인증번호가 일치하지 않아요. 다시 확인해 주세요.";
    case "DB table missing":
      return "서버 설정 문제로 인증을 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
    case "Unexpected error":
      return "인증 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
    default:
      break;
  }

  if (raw.startsWith("HTTP ")) {
    return "요청 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
  }

  return raw || fallback;
}
