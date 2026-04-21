"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import EmployeeReportBootSkeleton from "./_components/EmployeeReportBootSkeleton";
import EmbeddedEmployeeSurveyPanel, {
  clearEmployeeSurveyDraftState,
} from "./_components/EmbeddedEmployeeSurveyPanel";
import { EMPLOYEE_REPORT_RESET_EVENT_KEY } from "@/lib/b2b/employee-report-browser-storage";
import {
  deleteEmployeeSession,
  fetchEmployeeSession,
  fetchEmployeeWorkspace,
  requestNhisSign,
  startEmployeeWorkspace,
  upsertEmployeeSession,
} from "./_lib/api";
import type {
  EmployeeWorkspaceResponse,
  IdentityInput,
} from "./_lib/client-types";
import {
  clearStoredIdentity,
  isValidIdentityInput,
  readStoredIdentityWithSource,
  saveStoredIdentity,
  toIdentityPayload,
} from "./_lib/client-utils.identity";
import { formatDateTime, formatRelativeTime } from "./_lib/client-utils.format";

type WorkflowTone = "on" | "warn" | "off";
type WorkflowStepState = "done" | "current" | "pending" | "error";

type WorkflowStepItem = {
  label: string;
  caption: string;
  state: WorkflowStepState;
};

function syncStatusText(workspace: EmployeeWorkspaceResponse | null) {
  const sync = workspace?.sync;
  if (!sync) {
    return {
      badge: "준비 전",
      tone: "off" as const,
      message: "건강 정보를 확인할 준비를 하고 있어요.",
    };
  }

  if (sync.status === "completed") {
    return {
      badge: "확인 완료",
      tone: "on" as const,
      message:
        "건강검진과 복약 정보 확인이 끝났어요. 설문까지 마치면 최신 리포트가 준비됩니다.",
    };
  }
  if (sync.status === "failed") {
    return {
      badge: "다시 확인 필요",
      tone: "warn" as const,
      message:
        sync.lastErrorMessage ||
        "건강 정보를 아직 확인하지 못했어요. 다시 시도해 주세요.",
    };
  }
  if (sync.status === "awaiting_sign") {
    return {
      badge: "인증 확인 중",
      tone: "warn" as const,
      message: "카카오 인증이 끝나면 다음 단계가 바로 이어집니다.",
    };
  }
  if (sync.step === "init" || (sync.status === "queued" && !sync.step)) {
    return {
      badge: "인증 요청 중",
      tone: "warn" as const,
      message:
        "먼저 카카오톡 인증 요청을 준비하고 있어요. 휴대폰 알림이 오면 인증을 완료해 주세요.",
    };
  }
  if (sync.step === "fetch") {
    return {
      badge: "정보 확인 중",
      tone: "on" as const,
      message: "건강검진과 복약 정보를 확인하고 있어요.",
    };
  }
  if (sync.step === "report") {
    return {
      badge: "리포트 정리 중",
      tone: "on" as const,
      message: "확인한 내용을 바탕으로 리포트를 정리하고 있어요.",
    };
  }
  return {
    badge: "진행 중",
    tone: "off" as const,
    message: "건강 정보 확인을 시작했어요. 안내에 따라 차례대로 진행됩니다.",
  };
}

function reportOptionLabel(input: {
  id: string;
  periodKey?: string | null;
  variantIndex: number;
  updatedAt: string;
}) {
  const periodLabel = input.periodKey || "최근";
  return `${periodLabel} · v${input.variantIndex} · ${formatDateTime(
    input.updatedAt
  )}`;
}

function getHealthWorkflowToneBadgeClass(
  tone: WorkflowTone,
  allStyles: typeof styles
) {
  if (tone === "on") return allStyles.statusOn;
  if (tone === "warn") return allStyles.statusWarn;
  return allStyles.statusOff;
}

function getHealthWorkflowCardClass(
  tone: WorkflowTone,
  allStyles: typeof styles
) {
  if (tone === "on") return allStyles.workflowCardOn;
  if (tone === "warn") return allStyles.workflowCardWarn;
  return allStyles.workflowCardOff;
}

function buildHealthWorkflowSteps(
  workspace: EmployeeWorkspaceResponse | null
): WorkflowStepItem[] {
  const sync = workspace?.sync;
  const isHealthComplete =
    workspace?.currentStatus?.health.complete === true ||
    sync?.status === "completed";
  const currentIndex = isHealthComplete
    ? 4
    : sync?.step === "report"
    ? 4
    : sync?.step === "fetch"
    ? 3
    : sync?.status === "awaiting_sign" || sync?.step === "sign"
    ? 2
    : sync?.active
    ? 1
    : 0;
  const failedIndex =
    sync?.step === "report"
      ? 4
      : sync?.step === "fetch"
      ? 3
      : sync?.status === "awaiting_sign" || sync?.step === "sign"
      ? 2
      : 1;

  const steps = [
    { label: "시작", caption: "건강 정보 확인을 시작했어요." },
    { label: "카카오 인증", caption: "인증이 끝나면 다음 단계로 넘어가요." },
    { label: "정보 확인", caption: "건강검진과 복약 정보를 확인해요." },
    { label: "리포트 정리", caption: "확인한 내용을 리포트에 담아요." },
  ];

  return steps.map((step, index) => {
    const stepIndex = index + 1;
    let state: WorkflowStepState = "pending";

    if (isHealthComplete) {
      state = "done";
    } else if (sync?.status === "failed") {
      state =
        stepIndex < failedIndex
          ? "done"
          : stepIndex === failedIndex
          ? "error"
          : "pending";
    } else if (currentIndex > 0) {
      state =
        stepIndex < currentIndex
          ? "done"
          : stepIndex === currentIndex
          ? "current"
          : "pending";
    }

    return {
      ...step,
      state,
    };
  });
}

function buildHealthWorkflow(workspace: EmployeeWorkspaceResponse | null) {
  const sync = workspace?.sync;
  const isHealthComplete =
    workspace?.currentStatus?.health.complete === true ||
    sync?.status === "completed";

  if (isHealthComplete) {
    return {
      badge: "완료",
      tone: "on" as const,
      active: false,
      stepLabel: "리포트 정리 완료",
      title: "건강 정보 확인이 끝났어요.",
      description: "이제 최신 리포트를 바로 확인할 수 있어요.",
    };
  }

  if (sync?.status === "failed") {
    return {
      badge: "다시 확인 필요",
      tone: "warn" as const,
      active: false,
      stepLabel: null,
      title: "건강 정보를 아직 확인하지 못했어요.",
      description:
        sync.lastErrorMessage || "다시 시도하면 이어서 확인할 수 있어요.",
    };
  }

  if (sync?.step === "report") {
    return {
      badge: "마무리 중",
      tone: "on" as const,
      active: true,
      stepLabel: "리포트 정리",
      title: "리포트를 거의 다 정리했어요.",
      description: "조금만 기다리면 최신 내용이 반영됩니다.",
    };
  }

  if (sync?.step === "fetch") {
    return {
      badge: "확인 중",
      tone: "on" as const,
      active: true,
      stepLabel: "건강 정보 확인",
      title: "건강검진과 복약 정보를 확인하고 있어요.",
      description: "확인이 끝나면 리포트에 차례대로 반영됩니다.",
    };
  }

  if (sync?.status === "awaiting_sign" || sync?.step === "sign") {
    return {
      badge: "인증 필요",
      tone: "warn" as const,
      active: true,
      stepLabel: "카카오 인증",
      title: "카카오 인증을 마쳐 주세요.",
      description: "인증이 확인되면 바로 다음 단계로 넘어갑니다.",
    };
  }

  if (sync?.step === "init" || (sync?.status === "queued" && !sync?.step)) {
    return {
      badge: "인증 요청 중",
      tone: "warn" as const,
      active: true,
      stepLabel: "카카오톡 인증 요청",
      title: "카카오톡 인증 요청을 준비하고 있어요.",
      description:
        "휴대폰 알림이 오면 인증을 완료해 주세요. 인증 전에는 건강 정보를 조회하지 않습니다.",
    };
  }

  if (sync?.active) {
    return {
      badge: "시작됨",
      tone: "off" as const,
      active: true,
      stepLabel: "확인 시작",
      title: "건강 정보 확인을 준비하고 있어요.",
      description: "안내에 따라 차례대로 진행됩니다.",
    };
  }

  return {
    badge: "진행 필요",
    tone: "off" as const,
    active: false,
    stepLabel: null,
    title: "건강 정보 확인을 먼저 시작해 주세요.",
    description: "먼저 시작해 두면 설문과 함께 리포트를 더 빨리 볼 수 있어요.",
  };
}

function buildSurveyWorkflow(
  workspace: EmployeeWorkspaceResponse | null,
  showSurvey: boolean
) {
  if (showSurvey) {
    return {
      badge: "작성 중",
      tone: "on" as const,
      title: "설문을 이어서 작성하고 있어요.",
      description: "답변은 자동 저장되고 제출 후 리포트로 돌아옵니다.",
    };
  }

  if (workspace?.currentStatus?.survey.complete) {
    return {
      badge: "제출 완료",
      tone: "on" as const,
      title: "이번 주기 설문이 제출되었습니다.",
      description: "확인된 내용이 최신 리포트에 반영됩니다.",
    };
  }

  return {
    badge: "진행 필요",
    tone: "warn" as const,
    title: "설문을 먼저 끝내 두면 좋아요.",
    description: "지금 여기서 바로 작성할 수 있고 답변은 자동 저장됩니다.",
  };
}

function buildReportWorkflow(workspace: EmployeeWorkspaceResponse | null) {
  if (workspace?.currentStatus?.ready) {
    return {
      badge: "최신본 준비 완료",
      tone: "on" as const,
      title: "지금 보고 있는 내용이 최신 리포트예요.",
      description: "필요하면 아래에서 지난 리포트도 같이 볼 수 있어요.",
    };
  }

  if (workspace?.currentStatus?.report.available) {
    return {
      badge: "이전 리포트 있음",
      tone: "warn" as const,
      title: "먼저 만들어진 리포트를 볼 수 있어요.",
      description: "새 내용이 반영되면 다음 리포트가 이어서 추가돼요.",
    };
  }

  return {
    badge: "준비 중",
    tone: "off" as const,
    title: "건강 정보 확인과 설문이 끝나면 리포트가 준비돼요.",
    description:
      "두 단계 중 하나라도 먼저 끝내 두면 다음 진행이 한결 빨라집니다.",
  };
}

function getHealthSyncProgress(workspace: EmployeeWorkspaceResponse | null) {
  const sync = workspace?.sync;
  if (workspace?.currentStatus?.health.complete || sync?.status === "completed") {
    return 100;
  }
  if (sync?.status === "failed") return 100;
  if (sync?.step === "report") return 88;
  if (sync?.step === "fetch") return 68;
  if (sync?.status === "awaiting_sign" || sync?.step === "sign") return 42;
  if (sync?.step === "init" || sync?.status === "queued") return 22;
  if (sync?.active) return 12;
  return 0;
}

function getHealthSyncModalCopy(input: {
  workspace: EmployeeWorkspaceResponse | null;
  healthComplete: boolean;
}) {
  const sync = input.workspace?.sync;
  if (input.healthComplete || sync?.status === "completed") {
    return {
      title: "건강 정보 연동이 완료됐어요.",
      description: "최신 리포트에 반영할 준비가 끝났습니다.",
      status: "완료",
    };
  }
  if (sync?.status === "failed") {
    return {
      title: "건강 정보 연동을 완료하지 못했어요.",
      description:
        sync.lastErrorMessage || "다시 시작하면 카카오톡 인증부터 이어서 확인합니다.",
      status: "확인 필요",
    };
  }
  if (sync?.step === "fetch") {
    return {
      title: "인증이 확인되어 건강 정보를 가져오고 있어요.",
      description: "건강검진과 복약 정보를 조회하는 중입니다. 이 화면에서 완료까지 확인합니다.",
      status: "정보 조회 중",
    };
  }
  if (sync?.step === "report") {
    return {
      title: "가져온 정보를 리포트에 반영하고 있어요.",
      description: "거의 끝났습니다. 완료되면 자동으로 최신 상태가 표시됩니다.",
      status: "리포트 반영 중",
    };
  }
  if (sync?.status === "awaiting_sign" || sync?.step === "sign") {
    return {
      title: "휴대폰 카카오톡 인증을 완료해 주세요.",
      description: "인증이 끝나면 이 화면이 자동으로 확인하고 다음 단계로 넘어갑니다.",
      status: "인증 대기 중",
    };
  }
  return {
    title: "카카오톡 인증 요청을 준비하고 있어요.",
    description:
      "인증 전에는 건강 정보를 조회하지 않습니다. 휴대폰 알림이 오면 인증을 완료해 주세요.",
    status: "인증 요청 중",
  };
}

export default function EmployeeReportClient({
  initialIsAdminLoggedIn,
}: {
  initialIsAdminLoggedIn: boolean;
}) {
  void initialIsAdminLoggedIn;

  const [booting, setBooting] = useState(true);
  const [identity, setIdentity] = useState<IdentityInput>({
    name: "",
    birthDate: "",
    phone: "",
  });
  const [workspace, setWorkspace] = useState<EmployeeWorkspaceResponse | null>(
    null
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showHealthSyncModal, setShowHealthSyncModal] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollingError, setPollingError] = useState("");
  const [optimisticHealthState, setOptimisticHealthState] = useState<
    "checking" | "refreshing" | "verifying" | null
  >(null);
  const [pendingAction, setPendingAction] = useState<
    "start" | "health" | "refresh" | "report" | "sign" | null
  >(null);

  const validIdentity = useMemo(
    () => isValidIdentityInput(toIdentityPayload(identity)),
    [identity]
  );
  const syncStatus = useMemo(() => syncStatusText(workspace), [workspace]);
  const healthWorkflow = useMemo(
    () => buildHealthWorkflow(workspace),
    [workspace]
  );
  const healthWorkflowSteps = useMemo(
    () => buildHealthWorkflowSteps(workspace),
    [workspace]
  );
  const surveyWorkflow = useMemo(
    () => buildSurveyWorkflow(workspace, showSurvey),
    [workspace, showSurvey]
  );
  const reportWorkflow = useMemo(
    () => buildReportWorkflow(workspace),
    [workspace]
  );
  const healthComplete = workspace?.currentStatus?.health.complete === true;
  const surveyComplete = workspace?.currentStatus?.survey.complete === true;
  const coreStepCount = Number(healthComplete) + Number(surveyComplete);
  const coreProgressRatio = coreStepCount / 2;
  const coreProgressLabel =
    coreStepCount === 2
      ? "리포트 준비 완료"
      : coreStepCount === 1
        ? "한 단계 끝났어요"
        : "이제 시작하면 돼요";
  const syncStepLabel =
    workspace?.sync?.step === "init"
      ? "연동 준비"
      : workspace?.sync?.step === "sign"
        ? "카카오 인증 확인"
        : workspace?.sync?.step === "fetch"
          ? "건강 정보 가져오는 중"
          : workspace?.sync?.step === "report"
            ? "리포트 반영 중"
            : "대기 중";

  const isAwaitingKakaoAuth =
    workspace?.sync?.status === "awaiting_sign" ||
    workspace?.sync?.step === "sign";
  const isHealthRequestPending =
    optimisticHealthState !== null ||
    pendingAction === "start" ||
    pendingAction === "health" ||
    pendingAction === "refresh";
  const healthCoreIsActive =
    !healthComplete && (healthWorkflow.active || isHealthRequestPending);
  const healthSyncProgress = useMemo(
    () => getHealthSyncProgress(workspace),
    [workspace]
  );
  const healthSyncModalCopy = useMemo(
    () => getHealthSyncModalCopy({ workspace, healthComplete }),
    [healthComplete, workspace]
  );

  const applyWorkspace = useCallback(
    (
      next: EmployeeWorkspaceResponse | null,
      options?: { preserveSurvey?: boolean }
    ) => {
      setWorkspace(next);
      setSelectedReportId(next?.selectedReportId ?? null);
      setPolling(next?.sync?.active === true);
      if (
        !options?.preserveSurvey &&
        next?.currentStatus?.hasAnyWorkspaceData === true
      ) {
        setShowSurvey(false);
      }
    },
    []
  );

  const loadWorkspace = useCallback(
    async (input?: {
      reportId?: string | null;
      preserveSurvey?: boolean;
      driveSync?: boolean;
    }) => {
      const next = await fetchEmployeeWorkspace({
        reportId: input?.reportId ?? undefined,
        driveSync: input?.driveSync,
      });
      setPollingError("");
      applyWorkspace(next, { preserveSurvey: input?.preserveSurvey });
      return next;
    },
    [applyWorkspace]
  );

  const resetIdentityFlow = useCallback(async () => {
    await deleteEmployeeSession().catch(() => null);
    clearStoredIdentity();
    clearEmployeeSurveyDraftState();
    setWorkspace(null);
    setSelectedReportId(null);
    setShowSurvey(false);
    setShowHealthSyncModal(false);
    setPolling(false);
    setPollingError("");
    setOptimisticHealthState(null);
    setNotice("");
    setError("");
    setIdentity({
      name: "",
      birthDate: "",
      phone: "",
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const session = await fetchEmployeeSession();
        if (!mounted) return;

        if (session.authenticated && session.employee) {
          const nextIdentity = {
            name: session.employee.name,
            birthDate: session.employee.birthDate,
            phone: session.employee.phoneNormalized,
          };
          setIdentity(nextIdentity);
          saveStoredIdentity(nextIdentity);
          const nextWorkspace = await loadWorkspace();
          if (!mounted) return;
          if (!nextWorkspace.currentStatus?.hasAnyWorkspaceData) {
            clearEmployeeSurveyDraftState();
            setShowSurvey(false);
          }
          return;
        }

        const stored = readStoredIdentityWithSource().identity;
        if (stored) {
          setIdentity(stored);
          const loginResult = await upsertEmployeeSession(stored).catch(
            () => null
          );
          if (!mounted) return;
          if (loginResult?.found) {
            saveStoredIdentity(stored);
            const nextWorkspace = await loadWorkspace();
            if (!mounted) return;
            if (!nextWorkspace.currentStatus?.hasAnyWorkspaceData) {
              clearEmployeeSurveyDraftState();
              setShowSurvey(false);
            }
            return;
          }
        }
      } catch (bootstrapError) {
        if (!mounted) return;
        setError(
          bootstrapError instanceof Error
            ? bootstrapError.message
            : "리포트 상태를 불러오지 못했습니다."
        );
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [loadWorkspace]);

  useEffect(() => {
    const handleResetEvent = (event: StorageEvent) => {
      if (event.key !== EMPLOYEE_REPORT_RESET_EVENT_KEY || !event.newValue) {
        return;
      }
      void resetIdentityFlow();
    };

    window.addEventListener("storage", handleResetEvent);
    return () => {
      window.removeEventListener("storage", handleResetEvent);
    };
  }, [resetIdentityFlow]);

  useEffect(() => {
    if (workspace?.sync?.active || workspace?.sync?.status === "failed") {
      setShowSyncDetails(true);
    }
  }, [workspace?.sync?.active, workspace?.sync?.status]);

  useEffect(() => {
    if (!showSurvey && !showHealthSyncModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showSurvey) {
        setShowSurvey(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showHealthSyncModal, showSurvey]);

  useEffect(() => {
    if (workspace?.sync?.active && !healthComplete) {
      setShowSurvey(false);
      setShowHealthSyncModal(true);
      return;
    }
    if (healthComplete) {
      const timer = window.setTimeout(() => {
        setShowHealthSyncModal(false);
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [healthComplete, workspace?.sync?.active]);

  useEffect(() => {
    if (!polling) return;
    const refreshWorkspace = () => {
      const verifyingSign =
        workspace?.sync?.status === "awaiting_sign" ||
        workspace?.sync?.step === "sign";

      if (verifyingSign) {
        setOptimisticHealthState("verifying");
      }

      return loadWorkspace({
        reportId: selectedReportId,
        preserveSurvey: showSurvey,
        driveSync: showHealthSyncModal,
      })
        .then((nextWorkspace) => {
          setPollingError("");
          return nextWorkspace;
        })
        .catch((pollError) => {
          setPollingError(
            pollError instanceof Error
              ? pollError.message
              : "최신 진행 상태 확인이 잠시 지연되고 있어요."
          );
        })
        .finally(() => {
          if (!verifyingSign) return;
          window.setTimeout(() => {
            setOptimisticHealthState((current) =>
              current === "verifying" ? null : current
            );
          }, 4500);
        });
    };

    const visible = document.visibilityState === "visible";
    const intervalMs =
      showHealthSyncModal
        ? visible
          ? 1200
          : 4000
        : workspace?.sync?.status === "awaiting_sign"
        ? visible
          ? 3000
          : 8000
        : visible
          ? 2500
          : 6000;

    const timer = window.setTimeout(() => {
      void refreshWorkspace();
    }, intervalMs);

    const handleResume = () => {
      if (document.visibilityState !== "visible") return;
      void refreshWorkspace();
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [
    loadWorkspace,
    polling,
    selectedReportId,
    showHealthSyncModal,
    showSurvey,
    workspace?.sync?.status,
    workspace?.sync?.step,
  ]);

  const handleIdentityChange = useCallback(
    (key: keyof IdentityInput, value: string) => {
      setIdentity((prev) => ({
        ...prev,
        [key]:
          key === "name"
            ? value
            : value.replace(/\D/g, "").slice(0, key === "birthDate" ? 8 : 11),
      }));
    },
    []
  );

  const handleStartWorkspace = useCallback(
    async (options?: { restartHealth?: boolean }) => {
      if (!validIdentity) {
        setError("이름, 생년월일 8자리, 전화번호를 정확히 입력해 주세요.");
        return;
      }

      setPendingAction(options?.restartHealth ? "health" : "start");
      setOptimisticHealthState("checking");
      setShowHealthSyncModal(true);
      setShowSurvey(false);
      setBusy(true);
      setError("");
      setPollingError("");
      setNotice("");

      try {
        const next = await startEmployeeWorkspace({
          identity,
          restartHealth: options?.restartHealth === true,
        });
        saveStoredIdentity(identity);
        applyWorkspace(next);
        if (options?.restartHealth) {
          setShowSurvey(false);
          setNotice(
            "건강 정보를 다시 확인하고 있어요. 준비되면 이 화면에서 이어서 볼 수 있습니다."
          );
        } else if (next.currentStatus?.hasAnyWorkspaceData) {
          setShowSurvey(false);
          setNotice("이전에 확인한 내용을 불러왔어요.");
        } else {
          clearEmployeeSurveyDraftState();
          setShowSurvey(false);
          setNotice(
            next.scheduledHealthSync
              ? "건강 정보 확인을 백그라운드에서 시작했어요. 아래에서 진행 상황을 보면서 설문도 이어서 작성할 수 있어요."
              : "기록을 확인했어요. 건강 정보 확인이나 설문 중 원하는 단계부터 진행해 주세요."
          );
        }
      } catch (workspaceError) {
        setError(
          workspaceError instanceof Error
            ? workspaceError.message
            : "리포트를 시작하지 못했습니다."
        );
      } finally {
        setPendingAction(null);
        setOptimisticHealthState(null);
        setBusy(false);
      }
    },
    [applyWorkspace, identity, validIdentity]
  );

  const handleSelectReport = useCallback(
    async (nextReportId: string) => {
      setPendingAction("report");
      setBusy(true);
      setError("");
      try {
        const nextWorkspace = await loadWorkspace({
          reportId: nextReportId || null,
          preserveSurvey: false,
        });
        setSelectedReportId(nextWorkspace.selectedReportId ?? null);
      } catch (selectError) {
        setError(
          selectError instanceof Error
            ? selectError.message
            : "선택한 리포트를 불러오지 못했습니다."
        );
      } finally {
        setPendingAction(null);
        setBusy(false);
      }
    },
    [loadWorkspace]
  );

  const handleSurveyCompleted = useCallback(
    async (_periodKey: string | null) => {
      setShowSurvey(false);
      setSelectedReportId(null);
      setNotice("설문이 저장되었어요. 리포트를 새로 확인하고 있어요.");
      setPolling(true);
      try {
        const nextWorkspace = await loadWorkspace({ reportId: null });
        if (
          !nextWorkspace.currentStatus?.ready &&
          nextWorkspace.sync?.active !== true
        ) {
          setNotice(
            "설문은 저장됐어요. 이제 건강 정보 확인을 시작하면 최신 리포트가 준비됩니다."
          );
        }
      } catch (completionError) {
        setError(
          completionError instanceof Error
            ? completionError.message
            : "최신 리포트를 다시 불러오지 못했습니다."
        );
      }
    },
    [loadWorkspace]
  );

  const handleRefreshWorkspace = useCallback(async () => {
    setPendingAction("refresh");
    setOptimisticHealthState(isAwaitingKakaoAuth ? "verifying" : "refreshing");
    setBusy(true);
    setError("");
    setPollingError("");
    try {
      await loadWorkspace({
        reportId: selectedReportId,
        preserveSurvey: showSurvey,
        driveSync: showHealthSyncModal || workspace?.sync?.active === true,
      });
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "최신 상태를 불러오지 못했습니다.";
      if (workspace?.sync?.active) {
        setPollingError(message);
      } else {
        setError(message);
      }
    } finally {
      setPendingAction(null);
      setOptimisticHealthState(null);
      setBusy(false);
    }
  }, [
    isAwaitingKakaoAuth,
    loadWorkspace,
    selectedReportId,
    showHealthSyncModal,
    showSurvey,
    workspace?.sync?.active,
  ]);

  const handleConfirmKakaoAuth = useCallback(async () => {
    setPendingAction("sign");
    setOptimisticHealthState("verifying");
    setShowHealthSyncModal(true);
    setShowSurvey(false);
    setError("");
    setPollingError("");
    setBusy(true);

    try {
      const signResult = await requestNhisSign();
      if (!signResult.linked) {
        setPollingError(
          "카카오톡 인증 완료가 아직 확인되지 않았어요. 휴대폰에서 인증을 마친 뒤 다시 눌러 주세요."
        );
        return;
      }

      setPolling(true);
      await loadWorkspace({
        reportId: selectedReportId,
        preserveSurvey: false,
        driveSync: true,
      });
    } catch (signError) {
      setPollingError(
        signError instanceof Error
          ? signError.message
          : "카카오톡 인증 완료 여부를 확인하지 못했습니다."
      );
    } finally {
      setPendingAction(null);
      setOptimisticHealthState(null);
      setBusy(false);
    }
  }, [loadWorkspace, selectedReportId]);

  useEffect(() => {
    if (!showHealthSyncModal || !isAwaitingKakaoAuth || busy) return;

    const confirmOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      void handleConfirmKakaoAuth();
    };

    window.addEventListener("focus", confirmOnReturn);
    window.addEventListener("pageshow", confirmOnReturn);
    document.addEventListener("visibilitychange", confirmOnReturn);

    return () => {
      window.removeEventListener("focus", confirmOnReturn);
      window.removeEventListener("pageshow", confirmOnReturn);
      document.removeEventListener("visibilitychange", confirmOnReturn);
    };
  }, [
    busy,
    handleConfirmKakaoAuth,
    isAwaitingKakaoAuth,
    showHealthSyncModal,
  ]);

  const healthToneBadgeClass = getHealthWorkflowToneBadgeClass(
    healthWorkflow.tone,
    styles
  );
  const healthToneCardClass = getHealthWorkflowCardClass(
    healthWorkflow.tone,
    styles
  );
  const surveyToneBadgeClass = getHealthWorkflowToneBadgeClass(
    surveyWorkflow.tone,
    styles
  );
  const surveyToneCardClass = getHealthWorkflowCardClass(
    surveyWorkflow.tone,
    styles
  );
  const reportToneBadgeClass = getHealthWorkflowToneBadgeClass(
    reportWorkflow.tone,
    styles
  );
  const reportToneCardClass = getHealthWorkflowCardClass(
    reportWorkflow.tone,
    styles
  );
  const healthButtonLabel =
    healthWorkflow.active && healthWorkflow.stepLabel
      ? `${healthWorkflow.stepLabel} \uC9C4\uD589 \uC911`
      : healthComplete
      ? "\uAC74\uAC15 \uC815\uBCF4 \uB2E4\uC2DC \uD655\uC778"
      : "\uAC74\uAC15 \uC815\uBCF4 \uD655\uC778 \uC2DC\uC791";
  const healthButtonBusyLabel =
    pendingAction === "health"
      ? "\uB2E4\uC2DC \uD655\uC778 \uC911"
      : "\uC9C4\uD589 \uC0C1\uD0DC \uD655\uC778 \uC911";
  const surveyButtonLabel = showSurvey
    ? "\uC124\uBB38 \uB2EB\uAE30"
    : surveyComplete
    ? "\uC124\uBB38 \uB2E4\uC2DC\uD558\uAE30"
    : "\uC124\uBB38 \uC9C4\uD589\uD558\uAE30";
  const healthButtonDisabled =
    busy || pendingAction === "health" || workspace?.sync?.active === true;
  const healthCoreActionText = workspace?.sync?.active
    ? "상태 새로고침"
    : healthComplete
    ? "다시 확인"
    : "확인 시작";
  const surveyCoreActionText = showSurvey
    ? "설문 닫기"
    : surveyComplete
    ? "다시 작성"
    : "작성 시작";
  const healthCoreHint = workspace?.sync?.active
    ? "지금 진행 중인 연동 상태를 다시 불러옵니다."
    : healthComplete
    ? "최근 반영 시간과 최신 상태를 다시 확인합니다."
    : "연동을 시작하고 반영 여부를 이 화면에서 바로 보여드립니다.";
  const surveyCoreHint = showSurvey
    ? "열려 있는 설문 창을 닫습니다."
    : "설문 창을 열고 바로 이어서 작성합니다.";
  const workflowFeedback = useMemo(() => {
    const sync = workspace?.sync;
    if (sync?.active) {
      if (pollingError) {
        return {
          tone: "info" as const,
          label: "서버 처리 계속 확인 중",
          message:
            "방금 상태 확인이 잠시 지연됐지만 건강정보 연동은 서버에서 이어지고 있어요. 화면을 닫거나 새로고침해도 같은 상태에서 다시 확인합니다.",
          loading: true,
        };
      }
      if (sync.status === "awaiting_sign" || sync.step === "sign") {
        return {
          tone: "success" as const,
          label: "카카오톡 인증 대기 중",
          message:
            "카카오톡 인증을 완료하면 이 화면이 자동으로 완료 여부를 확인합니다. 웹 탭으로 돌아와도 새 인증을 다시 보내지 않고 이어서 확인해요.",
          loading: optimisticHealthState === "verifying",
        };
      }
      if (sync.step === "init" || (sync.status === "queued" && !sync.step)) {
        return {
          tone: "info" as const,
          label: "카카오톡 인증 요청 중",
          message:
            "먼저 휴대폰 카카오톡 인증을 요청하고 있어요. 인증을 완료하기 전에는 건강 정보를 조회하지 않습니다.",
          loading: true,
        };
      }
      if (sync.step === "fetch") {
        return {
          tone: "info" as const,
          label: "건강 정보 조회 중",
          message:
            "인증은 확인됐고 건강검진/복약 정보를 서버에서 가져오고 있어요. 페이지를 새로고침해도 이 단계에서 이어집니다.",
          loading: true,
        };
      }
      if (sync.step === "report") {
        return {
          tone: "info" as const,
          label: "리포트 반영 중",
          message:
            "받아온 건강 정보를 리포트에 반영하고 있어요. 완료되면 진행 상태와 리포트가 자동으로 갱신됩니다.",
          loading: true,
        };
      }
      return {
        tone: "info" as const,
        label: "서버에서 연동 준비 중",
        message:
          "건강정보 연동 작업을 서버에서 이어가고 있어요. 설문을 작성하거나 페이지를 다시 열어도 현재 상태를 계속 불러옵니다.",
        loading: true,
      };
    }
    if (error) {
      return {
        tone: "error" as const,
        label: "\uD655\uC778 \uD544\uC694",
        message: error,
        loading: false,
      };
    }
    if (optimisticHealthState === "verifying") {
      return {
        tone: "info" as const,
        label: "인증 완료 여부 확인 중",
        message:
          "카카오톡 인증 완료 여부를 다시 확인하고 있어요. 확인되면 건강 정보 조회로 바로 이어집니다.",
        loading: true,
      };
    }
    if (isAwaitingKakaoAuth) {
      return {
        tone: "success" as const,
        label: "카카오톡 인증을 완료해 주세요",
        message:
          "휴대폰 카카오톡에서 인증을 완료하면 이 화면이 자동으로 다음 단계를 확인합니다.",
        loading: false,
      };
    }
    if (pendingAction === "health" || pendingAction === "start") {
      return {
        tone: "info" as const,
        label: "\uAC74\uAC15 \uC815\uBCF4 \uD655\uC778 \uC911",
        message:
          "\uC5F0\uB3D9 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694. \uBC18\uC601\uB418\uBA74 \uC9C4\uD589 \uC0C1\uD0DC\uC640 \uBC18\uC601 \uC2DC\uAC04\uC774 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
        loading: true,
      };
    }
    if (pendingAction === "refresh") {
      return {
        tone: "info" as const,
        label: "\uC0C1\uD0DC \uC0C8\uB85C\uACE0\uCE68 \uC911",
        message:
          "\uCD5C\uC2E0 \uC5F0\uB3D9 \uC0C1\uD0DC\uC640 \uB9AC\uD3EC\uD2B8 \uC900\uBE44 \uC5EC\uBD80\uB97C \uB2E4\uC2DC \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694.",
        loading: true,
      };
    }
    if (showSurvey) {
      return {
        tone: "info" as const,
        label: "\uC124\uBB38 \uC785\uB825 \uC548\uB0B4",
        message:
          "설문 창에서 이어서 작성할 수 있어요. 제출되면 최신 리포트 준비 상태가 다시 갱신됩니다.",
        loading: false,
      };
    }
    if (workspace?.currentStatus?.health.fetchedAt) {
      return {
        tone: "success" as const,
        label: "\uAC74\uAC15 \uC815\uBCF4 \uBC18\uC601\uB428",
        message: `${formatDateTime(
          workspace.currentStatus.health.fetchedAt
        )} \uAE30\uC900 \uAC74\uAC15 \uC815\uBCF4\uAC00 \uBC18\uC601\uB418\uC5C8\uC5B4\uC694.`,
        loading: false,
      };
    }
    if (notice) {
      return {
        tone: "info" as const,
        label: "\uC548\uB0B4",
        message: notice,
        loading: false,
      };
    }
    return {
      tone: "info" as const,
      label: "\uB2E4\uC74C \uB2E8\uACC4 \uC548\uB0B4",
      message:
        "\uAC74\uAC15 \uC815\uBCF4 \uD655\uC778\uC744 \uBA3C\uC800 \uB20C\uB7EC \uC5F0\uB3D9 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uACE0, \uC124\uBB38\uC740 \uAC19\uC740 \uD654\uBA74\uC5D0\uC11C \uC774\uC5B4\uC11C \uC791\uC131\uD574 \uC8FC\uC138\uC694.",
      loading: false,
    };
  }, [
    error,
    notice,
    optimisticHealthState,
    pendingAction,
    pollingError,
    showSurvey,
    isAwaitingKakaoAuth,
    workspace?.currentStatus?.health.fetchedAt,
    workspace?.sync,
  ]);

  const handleHealthCoreClick = useCallback(() => {
    if (busy && pendingAction !== "refresh") {
      return;
    }

    setError("");
    setNotice(
      workspace?.sync?.active
        ? "최신 연동 상태를 다시 확인하고 있어요. 반영되면 이 자리에서 바로 보여드릴게요."
        : healthComplete
        ? "건강 정보를 다시 확인하고 있어요. 최신 반영 시간을 곧 보여드릴게요."
        : "건강 정보 확인을 시작했어요. 연동되면 진행 상태와 반영 시간이 바로 표시됩니다."
    );
    setShowSurvey(false);
    setShowHealthSyncModal(true);

    if (workspace?.sync?.active) {
      setOptimisticHealthState("refreshing");
      void handleRefreshWorkspace();
      return;
    }

    setOptimisticHealthState("checking");
    void handleStartWorkspace({ restartHealth: true });
  }, [
    busy,
    handleRefreshWorkspace,
    handleStartWorkspace,
    healthComplete,
    pendingAction,
    workspace?.sync?.active,
  ]);

  const handleSurveyCoreClick = useCallback(() => {
    setError("");
    setNotice(
      showSurvey
        ? "설문 입력창을 닫았어요. 다시 누르면 이어서 작성할 수 있어요."
        : "설문 입력창을 열었어요. 작성 후 제출하면 최신 리포트에 바로 반영됩니다."
    );
    setShowSurvey((prev) => !prev);
  }, [showSurvey]);

  const workflowFeedbackClass =
    workflowFeedback.tone === "success"
      ? styles.workflowFeedbackSuccess
      : workflowFeedback.tone === "error"
      ? styles.workflowFeedbackError
      : styles.workflowFeedbackInfo;
  const healthSyncModalLocked =
    workspace?.sync?.active === true && !healthComplete;

  if (booting) {
    return <EmployeeReportBootSkeleton />;
  }

  return (
    <div className={styles.pageBackdrop}>
      <div
        className={`${styles.page} ${styles.pageNoBg} ${styles.compactPage} ${styles.stack}`}
      >
        <header className={styles.heroCard}>
          <p className={styles.kicker}>EMPLOYEE REPORT</p>
          <h1 className={styles.title}>임직원 건강 리포트</h1>
          <p className={styles.description}>
            이름, 생년월일, 전화번호를 입력하면 먼저 확인 가능한 리포트를
            보여드리고, 필요한 다음 단계도 바로 이어서 진행할 수 있어요.
          </p>
          <div className={styles.statusRow}>
            {!workspace ? (
              <span className={styles.statusOff}>본인 확인 필요</span>
            ) : workspace.currentStatus?.ready ? (
              <span className={styles.statusOn}>
                현재 주기 리포트 확인 가능
              </span>
            ) : (
              <span className={styles.statusWarn}>{syncStatus.badge}</span>
            )}
            {workspace?.currentPeriodKey ? (
              <span className={styles.pill}>{workspace.currentPeriodKey}</span>
            ) : null}
          </div>
        </header>

        {!workspace ? (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>1. 본인 정보 입력</h2>
                <p className={styles.sectionDescription}>
                  정보를 입력하면 먼저 확인 가능한 내용을 보여드리고, 필요한
                  단계도 바로 이어서 안내해 드려요.
                </p>
              </div>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>이름</span>
                <input
                  className={styles.input}
                  value={identity.name}
                  disabled={busy}
                  placeholder="홍길동"
                  onChange={(event) =>
                    handleIdentityChange("name", event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>생년월일 8자리</span>
                <input
                  className={styles.input}
                  value={identity.birthDate}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={busy}
                  placeholder="19900101"
                  onChange={(event) =>
                    handleIdentityChange("birthDate", event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>전화번호</span>
                <input
                  className={styles.input}
                  value={identity.phone}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={busy}
                  placeholder="01012345678"
                  onChange={(event) =>
                    handleIdentityChange("phone", event.target.value)
                  }
                />
              </label>
            </div>
            <div className={styles.actionRow}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void handleStartWorkspace();
                }}
                className={styles.buttonPrimary}
              >
                {busy ? (
                  <InlineSpinnerLabel
                    label="조회 중"
                    spinnerClassName="text-current"
                  />
                ) : (
                  "\uC870\uD68C \uC2DC\uC791"
                )}
              </button>
            </div>
            {busy ? (
              <div
                className={`${styles.workflowFeedback} ${styles.workflowFeedbackInfo}`}
                aria-live="polite"
              >
                <InlineSpinnerLabel
                  label="입력 정보 확인 중"
                  className="text-[11px] font-extrabold text-sky-700"
                  spinnerClassName="text-sky-500"
                />
                <p className={styles.workflowFeedbackText}>
                  일치하는 조회 기록과 최신 리포트 준비 상태를 찾고 있어요.
                </p>
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>
                    {workspace.employee?.name || identity.name}님의 진행 상태
                  </h2>
                  <p className={styles.sectionDescription}>
                    마지막 동기화{" "}
                    {formatRelativeTime(workspace.employee?.lastSyncedAt)}
                  </p>
                </div>
              </div>

              <div className={styles.workflowOverview}>
                <div className={styles.workflowOverviewTop}>
                  <div>
                    <h3 className={styles.workflowOverviewTitle}>
                      이번 리포트 준비 상태
                    </h3>
                    <p className={styles.workflowOverviewText}>
                      건강 정보와 설문이 모이면 최신 내용으로 바로 갱신돼요.
                    </p>
                  </div>
                  <div className={styles.workflowCoreCount}>
                    <span className={styles.workflowCoreCountLabel}>진행 현황</span>
                    <strong>{coreStepCount}/2</strong>
                    <span className={styles.workflowCoreCountMeta}>
                      {coreProgressLabel}
                    </span>
                    <span className={styles.workflowCoreCountBar} aria-hidden>
                      <span
                        className={styles.workflowCoreCountBarFill}
                        style={{ width: `${coreProgressRatio * 100}%` }}
                      />
                    </span>
                  </div>
                </div>
                <div className={styles.workflowCoreBar}>
                  <button
                    type="button"
                    onClick={handleHealthCoreClick}
                    aria-label={`건강 정보 ${healthCoreActionText}`}
                    className={`${styles.workflowCorePill} ${
                      healthComplete
                        ? styles.workflowCorePillDone
                        : healthCoreIsActive
                        ? styles.workflowCorePillActive
                        : healthWorkflow.tone === "warn"
                        ? styles.workflowCorePillWarn
                        : styles.workflowCorePillPending
                    }`}
                  >
                    <span className={styles.workflowCorePillTop}>
                      <strong>1. 건강 정보</strong>
                      <span
                        className={styles.workflowCorePillCaret}
                        aria-hidden
                      >
                        →
                      </span>
                    </span>
                    <span className={styles.workflowCorePillStatus}>
                      {optimisticHealthState === "verifying" ? (
                        <InlineSpinnerLabel
                          label="인증 완료 확인 중"
                          size="sm"
                          className={styles.workflowInlineSpinnerLabel}
                          spinnerClassName="text-sky-500"
                        />
                      ) : isAwaitingKakaoAuth ? (
                        <span className={styles.workflowAuthCompleteLabel}>
                          카카오톡 인증을 완료해 주세요
                        </span>
                      ) : isHealthRequestPending ? (
                        <InlineSpinnerLabel
                          label={
                            optimisticHealthState === "refreshing"
                              ? "상태 확인 중"
                              : "인증 요청 중"
                          }
                          size="sm"
                          className={styles.workflowInlineSpinnerLabel}
                          spinnerClassName="text-sky-500"
                        />
                      ) : healthComplete ? (
                        "완료"
                      ) : (
                        healthWorkflow.stepLabel || healthWorkflow.badge
                      )}
                    </span>
                    <span className={styles.workflowCorePillFooter}>
                      <small className={styles.workflowCorePillHint}>
                        {healthCoreHint}
                      </small>
                      <span className={styles.workflowCorePillAction}>
                        {healthCoreActionText}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSurveyCoreClick}
                    aria-label={`설문 ${surveyCoreActionText}`}
                    aria-pressed={showSurvey}
                    className={`${styles.workflowCorePill} ${
                      surveyComplete
                        ? styles.workflowCorePillDone
                        : showSurvey
                        ? styles.workflowCorePillActive
                        : styles.workflowCorePillWarn
                    }`}
                  >
                    <span className={styles.workflowCorePillTop}>
                      <strong>2. 설문</strong>
                      <span
                        className={styles.workflowCorePillCaret}
                        aria-hidden
                      >
                        →
                      </span>
                    </span>
                    <span className={styles.workflowCorePillStatus}>
                      {showSurvey
                        ? "작성 중"
                        : surveyComplete
                        ? "완료"
                        : "진행 필요"}
                    </span>
                    <span className={styles.workflowCorePillFooter}>
                      <small className={styles.workflowCorePillHint}>
                        {surveyCoreHint}
                      </small>
                      <span className={styles.workflowCorePillAction}>
                        {surveyCoreActionText}
                      </span>
                    </span>
                  </button>
                </div>
                <div
                  className={`${styles.workflowFeedback} ${workflowFeedbackClass}`}
                  aria-live="polite"
                >
                  {workflowFeedback.loading ? (
                    <InlineSpinnerLabel
                      label={workflowFeedback.label}
                      className="text-[11px] font-extrabold text-sky-700"
                      spinnerClassName="text-sky-500"
                    />
                  ) : (
                    <span className={styles.workflowFeedbackLabel}>
                      {workflowFeedback.label}
                    </span>
                  )}
                  <p className={styles.workflowFeedbackText}>
                    {workflowFeedback.message}
                  </p>
                </div>
                {isAwaitingKakaoAuth ? (
                  <div className={styles.kakaoAuthWaitPanel} aria-live="polite">
                    <div
                      className={`${styles.kakaoAuthWaitSpinner} ${
                        optimisticHealthState === "verifying"
                          ? styles.kakaoAuthWaitSpinnerChecking
                          : ""
                      }`}
                      aria-hidden
                    >
                      <span />
                    </div>
                    <div>
                      <strong>
                        {optimisticHealthState === "verifying"
                          ? "인증 완료 여부를 확인하고 있어요."
                          : "카카오톡 인증을 완료해 주세요."}
                      </strong>
                      <p>
                        {optimisticHealthState === "verifying"
                          ? "확인되면 건강 정보 조회로 바로 이어집니다. 잠시만 기다려 주세요."
                          : "휴대폰에서 인증을 완료하면 자동으로 다음 단계로 넘어갑니다. 보통 몇 초 안에 반영돼요."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {workspace.sync &&
              (workspace.sync.active ||
                workspace.sync.status === "failed" ||
                workspace.sync.status === "completed") ? (
                <div
                  className={`${styles.workflowBanner} ${healthToneCardClass}`}
                >
                  <div className={styles.workflowBannerTop}>
                    <div className={styles.workflowLiveRow}>
                      {healthWorkflow.active ? (
                        <span className={styles.workflowLiveBadge}>
                          <span className={styles.workflowLiveDot} />
                          현재 단계 {healthWorkflow.stepLabel}
                        </span>
                      ) : null}
                      <span className={healthToneBadgeClass}>
                        {healthWorkflow.badge}
                      </span>
                    </div>
                    <div className={styles.workflowBannerActions}>
                      {workspace.sync.nextRetryAt ? (
                        <span className={styles.workflowMetaItem}>
                          다음 재시도 {formatDateTime(workspace.sync.nextRetryAt)}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={styles.workflowSyncToggle}
                        onClick={() => setShowSyncDetails((prev) => !prev)}
                        aria-expanded={showSyncDetails}
                      >
                        {showSyncDetails ? "진행상황 접기" : "진행상황 보기"}
                      </button>
                    </div>
                  </div>
                  <p className={styles.workflowBannerTitle}>
                    {healthWorkflow.title}
                  </p>
                  <p className={styles.workflowBannerText}>
                    {syncStatus.message}
                  </p>
                  {showSyncDetails ? (
                    <div className={styles.workflowSyncDetails}>
                      <div className={styles.workflowSyncDetailGrid}>
                        <div className={styles.workflowSyncDetailItem}>
                          <span className={styles.workflowSyncDetailLabel}>
                            현재 단계
                          </span>
                          <strong className={styles.workflowSyncDetailValue}>
                            {syncStepLabel}
                          </strong>
                        </div>
                        <div className={styles.workflowSyncDetailItem}>
                          <span className={styles.workflowSyncDetailLabel}>
                            요청 시각
                          </span>
                          <strong className={styles.workflowSyncDetailValue}>
                            {workspace.sync.requestedAt
                              ? formatDateTime(workspace.sync.requestedAt)
                              : "-"}
                          </strong>
                        </div>
                        <div className={styles.workflowSyncDetailItem}>
                          <span className={styles.workflowSyncDetailLabel}>
                            마지막 확인
                          </span>
                          <strong className={styles.workflowSyncDetailValue}>
                            {workspace.sync.lastAttemptAt
                              ? formatDateTime(workspace.sync.lastAttemptAt)
                              : "-"}
                          </strong>
                        </div>
                        <div className={styles.workflowSyncDetailItem}>
                          <span className={styles.workflowSyncDetailLabel}>
                            시도 횟수
                          </span>
                          <strong className={styles.workflowSyncDetailValue}>
                            {workspace.sync.attemptCount}회
                          </strong>
                        </div>
                      </div>
                      <p className={styles.workflowSyncHint}>
                        이 상태는 백그라운드에서 계속 갱신되고, 새로고침하거나
                        다시 들어와도 이어서 불러와요.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.workflowGrid}>
                <article
                  className={`${styles.workflowCard} ${healthToneCardClass}`}
                >
                  <div className={styles.workflowCardHeader}>
                    <div className={styles.workflowLabelBlock}>
                      <span className={styles.workflowIndex}>필수 1</span>
                      <h3 className={styles.workflowCardTitle}>건강 정보</h3>
                    </div>
                    <span className={healthToneBadgeClass}>
                      {healthWorkflow.badge}
                    </span>
                  </div>

                  <p className={styles.workflowLead}>{healthWorkflow.title}</p>
                  <p className={styles.workflowText}>
                    {healthWorkflow.description}
                  </p>

                  <div className={styles.workflowStepList}>
                    {healthWorkflowSteps.map((step) => (
                      <div
                        key={step.label}
                        className={`${styles.workflowStep} ${
                          step.state === "done"
                            ? styles.workflowStepDone
                            : step.state === "current"
                            ? styles.workflowStepCurrent
                            : step.state === "error"
                            ? styles.workflowStepError
                            : styles.workflowStepPending
                        }`}
                      >
                        <strong>{step.label}</strong>
                        <span>{step.caption}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.workflowActionStack}>
                    <button
                      type="button"
                      disabled={healthButtonDisabled}
                      onClick={() => {
                        void handleStartWorkspace({ restartHealth: true });
                      }}
                      className={
                        healthComplete || healthWorkflow.active
                          ? styles.buttonSecondary
                          : styles.buttonPrimary
                      }
                    >
                      {pendingAction === "health" || healthWorkflow.active ? (
                        <InlineSpinnerLabel
                          label={
                            pendingAction === "health"
                              ? healthButtonBusyLabel
                              : healthButtonLabel
                          }
                          spinnerClassName="text-current"
                        />
                      ) : (
                        healthButtonLabel
                      )}
                    </button>
                    <div className={styles.workflowMetaRow}>
                      {workspace.sync?.requestedAt ? (
                        <span className={styles.workflowMetaItem}>
                          요청 {formatDateTime(workspace.sync.requestedAt)}
                        </span>
                      ) : null}
                      {workspace.currentStatus?.health.fetchedAt ? (
                        <span className={styles.workflowMetaItem}>
                          반영{" "}
                          {formatDateTime(
                            workspace.currentStatus.health.fetchedAt
                          )}
                        </span>
                      ) : null}
                      {!workspace.currentStatus?.health.fetchedAt &&
                      workspace.sync?.nextRetryAt ? (
                        <span className={styles.workflowMetaItem}>
                          다음 확인 {formatDateTime(workspace.sync.nextRetryAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>

                <article
                  className={`${styles.workflowCard} ${surveyToneCardClass}`}
                >
                  <div className={styles.workflowCardHeader}>
                    <div className={styles.workflowLabelBlock}>
                      <span className={styles.workflowIndex}>필수 2</span>
                      <h3 className={styles.workflowCardTitle}>설문</h3>
                    </div>
                    <span className={surveyToneBadgeClass}>
                      {surveyWorkflow.badge}
                    </span>
                  </div>

                  <p className={styles.workflowLead}>{surveyWorkflow.title}</p>
                  <p className={styles.workflowText}>
                    {surveyWorkflow.description}
                  </p>

                  <div className={styles.workflowMetaRow}>
                    <span className={styles.workflowMetaItem}>
                      같은 페이지에서 진행
                    </span>
                    <span className={styles.workflowMetaItem}>자동 저장</span>
                    <span className={styles.workflowMetaItem}>
                      완료 즉시 리포트 갱신
                    </span>
                    {workspace.currentStatus?.survey.submittedAt ? (
                      <span className={styles.workflowMetaItem}>
                        제출{" "}
                        {formatDateTime(
                          workspace.currentStatus.survey.submittedAt
                        )}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.workflowActionStack}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setShowSurvey((prev) => !prev);
                      }}
                      className={
                        showSurvey || !surveyComplete
                          ? styles.buttonPrimary
                          : styles.buttonSecondary
                      }
                    >
                      {surveyButtonLabel}
                    </button>
                    <p className={styles.workflowText}>
                      {showSurvey
                        ? "아래 설문 영역 안에서 스크롤하며 바로 이어서 작성할 수 있습니다."
                        : "설문을 먼저 마치면 최신 리포트를 더 빨리 확인할 수 있어요."}
                    </p>
                  </div>
                </article>
              </div>

              <article
                className={`${styles.workflowReportCard} ${reportToneCardClass}`}
              >
                <div className={styles.workflowReportTop}>
                  <div className={styles.workflowLabelBlock}>
                    <span className={styles.workflowIndex}>리포트</span>
                    <h3 className={styles.workflowCardTitle}>리포트 기록</h3>
                  </div>
                  <span className={reportToneBadgeClass}>
                    {reportWorkflow.badge}
                  </span>
                </div>

                <p className={styles.workflowLead}>{reportWorkflow.title}</p>
                <p className={styles.workflowText}>
                  {reportWorkflow.description}
                </p>

                {workspace.reports && workspace.reports.length > 0 ? (
                  <div className={styles.workflowReportSelector}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>저장된 리포트</span>
                      <select
                        className={`${styles.select} ${styles.summaryPeriodSelect}`}
                        value={workspace.selectedReportId ?? ""}
                        disabled={busy}
                        onChange={(event) => {
                          void handleSelectReport(event.target.value);
                        }}
                      >
                        {workspace.reports.map((report) => (
                          <option key={report.id} value={report.id}>
                            {reportOptionLabel(report)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className={styles.inlineHint}>
                      버전 번호는 누적 이력이라 중간 번호가 비어 보여도
                      정상입니다. 각 기간별 최근 보관본만 남겨요.
                    </p>
                  </div>
                ) : null}

                <div className={styles.workflowAuxRow}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void handleRefreshWorkspace();
                    }}
                    className={styles.buttonGhost}
                  >
                    {pendingAction === "refresh" ? (
                      <InlineSpinnerLabel
                        label="확인 중"
                        spinnerClassName="text-current"
                      />
                    ) : (
                      "\uC0C1\uD0DC \uC0C8\uB85C\uACE0\uCE68"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void resetIdentityFlow();
                    }}
                    className={styles.buttonGhost}
                  >
                    다른 이름으로 조회
                  </button>
                </div>

                <p className={styles.inlineHint}>
                  {workspace.currentStatus?.ready
                    ? "현재 주기의 최신본을 보고 있습니다."
                    : workspace.sync?.nextRetryAt
                    ? `다음 확인 예정 시각 ${formatDateTime(
                        workspace.sync.nextRetryAt
                      )}`
                    : syncStatus.message}
                </p>
              </article>
            </section>

            {workspace.report ? (
              <section className={styles.reportCanvas}>
                <div className={styles.reportCanvasHeader}>
                  <div className={styles.reportCanvasMeta}>
                    <p className={styles.reportCanvasEyebrow}>리포트</p>
                    <h3>
                      {workspace.selectedPeriodKey ||
                        workspace.report.periodKey ||
                        "최근"}{" "}
                      리포트
                    </h3>
                    <p>
                      생성 시각 {formatDateTime(workspace.report.updatedAt)} ·
                      버전 v{workspace.report.variantIndex}
                    </p>
                  </div>
                  <div className={styles.reportCanvasBadgeRow}>
                    <span
                      className={
                        workspace.currentStatus?.ready
                          ? styles.statusOn
                          : styles.statusWarn
                      }
                    >
                      {workspace.currentStatus?.ready
                        ? "현재 주기 최신본"
                        : "부분 데이터 반영본"}
                    </span>
                  </div>
                </div>
                <div
                  className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide} ${styles.reportCanvasBoardScrollable}`}
                >
                  <div className={styles.reportCaptureSurface}>
                    <ReportSummaryCards payload={workspace.report.payload} />
                  </div>
                </div>
              </section>
            ) : (
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>리포트 준비 중</h2>
                    <p className={styles.sectionDescription}>
                      건강 정보 확인과 설문 진행 상황에 따라 최신 리포트가
                      추가됩니다.
                    </p>
                  </div>
                </div>
                <p className={styles.inlineHint}>{syncStatus.message}</p>
              </section>
            )}
          </>
        )}

        {!workspace && notice ? (
          <section className={styles.sectionCard}>
            <p className={styles.inlineHint}>{notice}</p>
          </section>
        ) : null}
        {!workspace && error ? (
          <section className={styles.sectionCard}>
            <p className={styles.statusWarn}>{error}</p>
          </section>
        ) : null}
      </div>
      {workspace && showHealthSyncModal ? (
        <div
          className={styles.healthSyncModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="건강 정보 연동"
        >
          <div className={styles.healthSyncModalShell}>
            <div className={styles.healthSyncModalHeader}>
              <span className={healthToneBadgeClass}>
                {healthSyncModalCopy.status}
              </span>
              {!healthSyncModalLocked ? (
                <button
                  type="button"
                  className={styles.healthSyncModalCloseButton}
                  onClick={() => setShowHealthSyncModal(false)}
                  aria-label="건강 정보 연동 창 닫기"
                >
                  ×
                </button>
              ) : null}
            </div>
            <div className={styles.healthSyncModalHero}>
              <div className={styles.healthSyncModalSpinner} aria-hidden>
                <span />
              </div>
              <div>
                <h2>{healthSyncModalCopy.title}</h2>
                <p>{healthSyncModalCopy.description}</p>
              </div>
            </div>
            <div className={styles.healthSyncModalProgressTrack}>
              <span
                className={styles.healthSyncModalProgressFill}
                style={{ width: `${healthSyncProgress}%` }}
              />
            </div>
            <p className={styles.healthSyncModalProgressText}>
              {healthSyncProgress}% · {syncStepLabel}
            </p>
            <div className={styles.healthSyncModalSteps}>
              {healthWorkflowSteps.map((step) => (
                <div
                  key={`health-sync-modal-${step.label}`}
                  className={`${styles.healthSyncModalStep} ${
                    step.state === "done"
                      ? styles.healthSyncModalStepDone
                      : step.state === "current"
                      ? styles.healthSyncModalStepCurrent
                      : step.state === "error"
                      ? styles.healthSyncModalStepError
                      : styles.healthSyncModalStepPending
                  }`}
                >
                  <strong>{step.label}</strong>
                  <span>{step.caption}</span>
                </div>
              ))}
            </div>
            {pollingError ? (
              <p className={styles.healthSyncModalWarning}>{pollingError}</p>
            ) : null}
            <div className={styles.healthSyncModalActions}>
              {isAwaitingKakaoAuth ? (
                <button
                  type="button"
                  className={styles.buttonPrimary}
                  disabled={busy}
                  onClick={() => {
                    void handleConfirmKakaoAuth();
                  }}
                >
                  {pendingAction === "sign" ? (
                    <InlineSpinnerLabel
                      label="인증 확인 중"
                      spinnerClassName="text-current"
                    />
                  ) : (
                    "인증 완료했어요"
                  )}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={busy}
                onClick={() => {
                  void handleRefreshWorkspace();
                }}
              >
                {pendingAction === "refresh" ? (
                  <InlineSpinnerLabel
                    label="다시 확인 중"
                    spinnerClassName="text-current"
                  />
                ) : (
                  "지금 다시 확인"
                )}
              </button>
              {workspace.sync?.status === "failed" ? (
                <button
                  type="button"
                  className={styles.buttonPrimary}
                  disabled={busy}
                  onClick={() => {
                    void handleStartWorkspace({ restartHealth: true });
                  }}
                >
                  다시 시작
                </button>
              ) : null}
            </div>
            {healthSyncModalLocked ? (
              <p className={styles.healthSyncModalLockText}>
                연동이 끝나거나 실패 응답이 오면 이 창을 닫을 수 있습니다.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {workspace && showSurvey ? (
        <div
          className={styles.surveyModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="임직원 건강 설문"
        >
          <div className={styles.surveyModalShell}>
            <EmbeddedEmployeeSurveyPanel
              onCompleted={handleSurveyCompleted}
              onClose={() => setShowSurvey(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
