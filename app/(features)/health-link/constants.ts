import type { WorkflowStep } from "./types";

export const NHIS_LOGIN_ORG = "kakao";

export const NHIS_WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "status", title: "연동 준비", subtitle: "본인 정보 입력 후 인증 요청" },
  { id: "auth", title: "카카오 인증", subtitle: "카카오에서 인증 완료 확인" },
  { id: "sync", title: "검진 수치 동기화", subtitle: "건강검진 핵심 수치만 불러오기" },
];

export const NHIS_ERR_CODE_HEALTHIN_REQUIRED = "C0012-001";
export const NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE = "C0009-001";
