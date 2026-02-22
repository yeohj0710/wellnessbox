import type { WorkflowStep } from "./types";
import { HEALTH_LINK_COPY } from "./copy";

export const NHIS_LOGIN_ORG = "kakao";

export const NHIS_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "status",
    title: HEALTH_LINK_COPY.workflow.statusTitle,
    subtitle: HEALTH_LINK_COPY.workflow.statusSubtitle,
  },
  {
    id: "auth",
    title: HEALTH_LINK_COPY.workflow.authTitle,
    subtitle: HEALTH_LINK_COPY.workflow.authSubtitle,
  },
  {
    id: "sync",
    title: HEALTH_LINK_COPY.workflow.syncTitle,
    subtitle: HEALTH_LINK_COPY.workflow.syncSubtitle,
  },
];

export const NHIS_ERR_CODE_HEALTHIN_REQUIRED = "C0012-001";
export const NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE = "C0009-001";
export const NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED = "LOGIN-999";
