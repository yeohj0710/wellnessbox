import type { WorkflowStep } from "./types";

export const NHIS_LOGIN_ORG = "kakao";

export const NHIS_WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "status", title: "연동 상태", subtitle: "연결 준비 확인" },
  { id: "auth", title: "카카오 인증", subtitle: "인증 요청 후 승인" },
  { id: "sync", title: "데이터 동기화", subtitle: "진료/투약/건강나이 조회" },
];

export const NHIS_ERR_CODE_HEALTHIN_REQUIRED = "C0012-001";
export const NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE = "C0009-001";
