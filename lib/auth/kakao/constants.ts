export const KAKAO_STATE_COOKIE = "wb_kakao_state";
export const KAKAO_CONTEXT_COOKIE = "wb_kakao_ctx";

export const KAKAO_WEB_LOGIN_PATH = "/api/auth/kakao/login";
export const KAKAO_APP_LOGIN_PATH = "/api/auth/kakao/login/app";

export const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || "wellnessbox";
export const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST || "oauth";

export function buildAppDeepLink(token: string) {
  return `${APP_SCHEME}://${APP_HOST}/kakao/${token}`;
}
