import {
  NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE,
  NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED,
} from "./constants";
import { parseErrorMessage } from "./utils-format";

const SESSION_EXPIRED_MESSAGE_PATTERN =
  /세션이 만료|다시 로그인|토큰 유효 시간 만료|토큰 만료|token expired|expired token/i;

export function isNhisSessionExpiredError(errCd?: string | null, errMsg?: string | null) {
  if ((errCd || "").trim().toUpperCase() === NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED) return true;
  return SESSION_EXPIRED_MESSAGE_PATTERN.test((errMsg || "").trim());
}

export function hasNhisSessionExpiredFailure(
  failures: Array<{ errCd?: string | null; errMsg?: string | null }>
) {
  return failures.some((failure) =>
    isNhisSessionExpiredError(failure.errCd, failure.errMsg)
  );
}

export function describeFetchFailure(failure: {
  target: string;
  errCd?: string | null;
  errMsg?: string | null;
}) {
  if (isNhisSessionExpiredError(failure.errCd, failure.errMsg)) {
    return "검진 서비스 세션이 만료되었습니다. 카카오 인증을 다시 진행해 주세요.";
  }
  if (
    failure.target === "healthAge" &&
    (failure.errCd || "").trim() === NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE
  ) {
    return "건강나이 데이터는 건강보험공단 기록에 제공된 경우에만 조회할 수 있습니다.";
  }
  return parseErrorMessage(failure.errMsg || undefined, "요청에 실패했습니다.");
}
