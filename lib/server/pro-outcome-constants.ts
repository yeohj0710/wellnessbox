/**
 * KPI-2 접수에서 화면과 스크립트가 함께 쓰는 상수.
 *
 * 라우트에는 `server-only` 가 걸려 있어 스크립트에서 못 읽는다. 그렇다고 스크립트에
 * 값을 베껴 두면 한쪽만 바뀌었을 때 조용히 어긋난다. 동의문 판이 어긋나면 어떤 문구에
 * 동의받은 응답인지 알 수 없게 되므로, 한 곳에 두고 양쪽이 가져다 쓴다.
 */

/** 지금 받고 있는 동의문 판. 문구가 바뀌면 이 값을 올리고 옛 판은 그대로 둔다. */
export const PRO_CONSENT_VERSION = "pro-consent-2026-08-25";

/** 목표는 성분이 아니라 상태로 받는다. 성분으로 받으면 엔진 추천을 되묻는 꼴이 된다. */
export const PRO_GOAL_KEYS = [
  "sleep",
  "fatigue",
  "digestion",
  "immunity",
  "joint",
  "stress",
  "blood_sugar",
  "other",
] as const;

export const PRO_TOKEN_MIN_LENGTH = 16;
export const PRO_TOKEN_MAX_LENGTH = 64;

/** 이만큼도 안 드셨으면 복용했다고 보기 어려워 유효 쌍에서 뺀다. */
export const PRO_MIN_DAYS_TAKEN = 7;
