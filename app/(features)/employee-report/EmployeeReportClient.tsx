"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import EmployeeReportBootSkeleton from "./_components/EmployeeReportBootSkeleton";
import EmbeddedEmployeeSurveyPanel from "./_components/EmbeddedEmployeeSurveyPanel";
import {
  deleteEmployeeSession,
  fetchEmployeeSession,
  fetchEmployeeWorkspace,
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
      message:
        "카카오 인증이 끝나면 다음 단계가 바로 이어집니다.",
    };
  }
  if (sync.step === "fetch") {
    return {
      badge: "정보 확인 중",
      tone: "on" as const,
      message:
        "건강검진과 복약 정보를 확인하고 있어요.",
    };
  }
  if (sync.step === "report") {
    return {
      badge: "리포트 정리 중",
      tone: "on" as const,
      message:
        "확인한 내용을 바탕으로 리포트를 정리하고 있어요.",
    };
  }
  return {
    badge: "진행 중",
    tone: "off" as const,
    message:
      "건강 정보 확인을 시작했어요. 안내에 따라 차례대로 진행됩니다.",
  };
}

function reportOptionLabel(input: {
  id: string;
  periodKey?: string | null;
  variantIndex: number;
  updatedAt: string;
}) {
  const periodLabel = input.periodKey || "최근";
  return `${periodLabel} · v${input.variantIndex} · ${formatDateTime(input.updatedAt)}`;
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
    workspace?.currentStatus?.health.complete === true || sync?.status === "completed";
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
    workspace?.currentStatus?.health.complete === true || sync?.status === "completed";

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
        sync.lastErrorMessage ||
        "다시 시도하면 이어서 확인할 수 있어요.",
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
    description: "두 단계 중 하나라도 먼저 끝내 두면 다음 진행이 한결 빨라집니다.",
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
  const [workspace, setWorkspace] = useState<EmployeeWorkspaceResponse | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "start" | "health" | "refresh" | "report" | null
  >(null);

  const validIdentity = useMemo(
    () => isValidIdentityInput(toIdentityPayload(identity)),
    [identity]
  );
  const syncStatus = useMemo(() => syncStatusText(workspace), [workspace]);
  const healthWorkflow = useMemo(() => buildHealthWorkflow(workspace), [workspace]);
  const healthWorkflowSteps = useMemo(
    () => buildHealthWorkflowSteps(workspace),
    [workspace]
  );
  const surveyWorkflow = useMemo(
    () => buildSurveyWorkflow(workspace, showSurvey),
    [workspace, showSurvey]
  );
  const reportWorkflow = useMemo(() => buildReportWorkflow(workspace), [workspace]);
  const healthComplete = workspace?.currentStatus?.health.complete === true;
  const surveyComplete = workspace?.currentStatus?.survey.complete === true;
  const coreStepCount = Number(healthComplete) + Number(surveyComplete);

  const applyWorkspace = useCallback(
    (next: EmployeeWorkspaceResponse | null, options?: { preserveSurvey?: boolean }) => {
      setWorkspace(next);
      setSelectedReportId(next?.selectedReportId ?? null);
      setPolling(next?.sync?.active === true);
      if (!options?.preserveSurvey && next?.currentStatus?.hasAnyWorkspaceData === true) {
        setShowSurvey(false);
      }
    },
    []
  );

  const loadWorkspace = useCallback(
    async (input?: { reportId?: string | null; preserveSurvey?: boolean }) => {
      const next = await fetchEmployeeWorkspace({
        reportId: input?.reportId ?? undefined,
      });
      applyWorkspace(next, { preserveSurvey: input?.preserveSurvey });
      return next;
    },
    [applyWorkspace]
  );

  const resetIdentityFlow = useCallback(async () => {
    await deleteEmployeeSession().catch(() => null);
    clearStoredIdentity();
    setWorkspace(null);
    setSelectedReportId(null);
    setShowSurvey(false);
    setPolling(false);
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
            setShowSurvey(true);
          }
          return;
        }

        const stored = readStoredIdentityWithSource().identity;
        if (stored) {
          setIdentity(stored);
          const loginResult = await upsertEmployeeSession(stored).catch(() => null);
          if (!mounted) return;
          if (loginResult?.found) {
            saveStoredIdentity(stored);
            const nextWorkspace = await loadWorkspace();
            if (!mounted) return;
            if (!nextWorkspace.currentStatus?.hasAnyWorkspaceData) {
              setShowSurvey(true);
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
    if (!polling) return;
    const timer = window.setTimeout(() => {
      void loadWorkspace({
        reportId: selectedReportId,
        preserveSurvey: showSurvey,
      }).catch((pollError) => {
        setError(
          pollError instanceof Error
            ? pollError.message
            : "최신 상태를 다시 불러오지 못했습니다."
        );
        setPolling(false);
      });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace, polling, selectedReportId, showSurvey]);

  const handleIdentityChange = useCallback(
    (key: keyof IdentityInput, value: string) => {
      setIdentity((prev) => ({
        ...prev,
        [key]:
          key === "name" ? value : value.replace(/\D/g, "").slice(0, key === "birthDate" ? 8 : 11),
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
      setBusy(true);
      setError("");
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
          setShowSurvey(true);
          setNotice(
            "건강 정보 확인을 시작했어요. 설문도 이어서 작성해 주세요."
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
        if (!nextWorkspace.currentStatus?.ready && nextWorkspace.sync?.active !== true) {
          setNotice(
            "설문은 저장되었어요. 건강 정보 확인이 끝나면 최신 리포트가 준비됩니다."
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
    setBusy(true);
    setError("");
    try {
      await loadWorkspace({
        reportId: selectedReportId,
        preserveSurvey: showSurvey,
      });
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "최신 상태를 불러오지 못했습니다."
      );
    } finally {
      setPendingAction(null);
      setBusy(false);
    }
  }, [loadWorkspace, selectedReportId, showSurvey]);

  const healthToneBadgeClass = getHealthWorkflowToneBadgeClass(
    healthWorkflow.tone,
    styles
  );
  const healthToneCardClass = getHealthWorkflowCardClass(healthWorkflow.tone, styles);
  const surveyToneBadgeClass = getHealthWorkflowToneBadgeClass(
    surveyWorkflow.tone,
    styles
  );
  const surveyToneCardClass = getHealthWorkflowCardClass(surveyWorkflow.tone, styles);
  const reportToneBadgeClass = getHealthWorkflowToneBadgeClass(
    reportWorkflow.tone,
    styles
  );
  const reportToneCardClass = getHealthWorkflowCardClass(reportWorkflow.tone, styles);
  const healthButtonLabel =
    pendingAction === "health"
      ? "다시 확인 중..."
      : healthWorkflow.active && healthWorkflow.stepLabel
        ? `${healthWorkflow.stepLabel} 진행 중`
        : healthComplete
          ? "건강 정보 다시 확인"
          : "건강 정보 확인 시작";
  const surveyButtonLabel = showSurvey
    ? "설문 닫기"
    : surveyComplete
      ? "설문 다시하기"
      : "설문 진행하기";
  const healthButtonDisabled =
    busy || pendingAction === "health" || workspace?.sync?.active === true;
  const healthCoreActionText = workspace?.sync?.active
    ? "상태 새로고침"
    : healthComplete
      ? "다시 확인"
      : "확인 시작";
  const surveyCoreActionText = showSurvey
    ? "입력 접기"
    : surveyComplete
      ? "다시 작성"
      : "작성 시작";
  const healthCoreHint = workspace?.sync?.active
    ? "지금 진행 중인 연동 상태를 다시 불러옵니다."
    : healthComplete
      ? "최근 반영 시간과 최신 상태를 다시 확인합니다."
      : "연동을 시작하고 반영 여부를 이 화면에서 바로 보여드립니다.";
  const surveyCoreHint = showSurvey
    ? "열려 있는 설문 입력 영역을 잠시 접습니다."
    : "같은 화면 아래에서 설문을 바로 이어서 작성합니다.";
  const workflowFeedback = useMemo(() => {
    if (error) {
      return {
        tone: "error" as const,
        label: "확인 필요",
        message: error,
      };
    }
    if (pendingAction === "health" || pendingAction === "start") {
      return {
        tone: "info" as const,
        label: "건강 정보 확인 중",
        message: "연동 상태를 확인하고 있어요. 반영되면 진행 상태와 반영 시간이 여기에 표시됩니다.",
      };
    }
    if (pendingAction === "refresh") {
      return {
        tone: "info" as const,
        label: "상태 새로고침 중",
        message: "최신 연동 상태와 리포트 준비 여부를 다시 확인하고 있어요.",
      };
    }
    if (showSurvey) {
      return {
        tone: "info" as const,
        label: "설문 입력 열림",
        message:
          "바로 아래 설문 영역에서 이어서 작성할 수 있어요. 저장하면 최신 리포트 준비 상태가 다시 갱신됩니다.",
      };
    }
    if (workspace?.currentStatus?.health.fetchedAt) {
      return {
        tone: "success" as const,
        label: "건강 정보 반영됨",
        message: `${formatDateTime(workspace.currentStatus.health.fetchedAt)} 기준 건강 정보가 반영되었어요.`,
      };
    }
    if (notice) {
      return {
        tone: "info" as const,
        label: "안내",
        message: notice,
      };
    }
    return {
      tone: "info" as const,
      label: "다음 단계 안내",
      message:
        "건강 정보 확인을 먼저 눌러 연동 상태를 확인하고, 설문은 같은 화면에서 이어서 작성해 주세요.",
    };
  }, [
    error,
    notice,
    pendingAction,
    showSurvey,
    workspace?.currentStatus?.health.fetchedAt,
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

    if (workspace?.sync?.active) {
      void handleRefreshWorkspace();
      return;
    }

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
        ? "설문 입력을 접어두었어요. 다시 누르면 이어서 작성할 수 있어요."
        : "설문 입력을 열었어요. 아래 영역에서 바로 이어서 작성해 주세요."
    );
    setShowSurvey((prev) => !prev);
  }, [showSurvey]);

  const workflowFeedbackClass =
    workflowFeedback.tone === "success"
      ? styles.workflowFeedbackSuccess
      : workflowFeedback.tone === "error"
        ? styles.workflowFeedbackError
        : styles.workflowFeedbackInfo;

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
          <h1 className={styles.title}>직원 건강 리포트</h1>
          <p className={styles.description}>
            이름, 생년월일, 전화번호를 입력하면 먼저 확인 가능한 리포트를 보여드리고,
            필요한 다음 단계도 바로 이어서 진행할 수 있어요.
          </p>
          <div className={styles.statusRow}>
            {!workspace ? (
              <span className={styles.statusOff}>본인 확인 필요</span>
            ) : workspace.currentStatus?.ready ? (
              <span className={styles.statusOn}>현재 주기 리포트 확인 가능</span>
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
                  정보를 입력하면 먼저 확인 가능한 내용을 보여드리고, 필요한 단계도 바로
                  이어서 안내해 드려요.
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
                  onChange={(event) => handleIdentityChange("name", event.target.value)}
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
                  onChange={(event) => handleIdentityChange("phone", event.target.value)}
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
                {busy ? "시작 중..." : "조회 시작"}
              </button>
            </div>
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
                    마지막 동기화 {formatRelativeTime(workspace.employee?.lastSyncedAt)}
                  </p>
                </div>
              </div>

              <div className={styles.workflowOverview}>
                <div className={styles.workflowOverviewTop}>
                  <div>
                    <p className={styles.workflowOverviewEyebrow}>이번 리포트</p>
                    <h3 className={styles.workflowOverviewTitle}>
                      건강 정보 확인과 설문을 차례로 마쳐 주세요.
                    </h3>
                    <p className={styles.workflowOverviewText}>
                      두 단계가 끝나면 최신 내용이 반영되고, 이전 버전도 함께 볼 수 있어요.
                    </p>
                  </div>
                  <div className={styles.workflowCoreCount}>
                    <strong>{coreStepCount}/2</strong>
                    <span>핵심 단계 완료</span>
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
                        : healthWorkflow.active
                          ? styles.workflowCorePillActive
                          : healthWorkflow.tone === "warn"
                            ? styles.workflowCorePillWarn
                            : styles.workflowCorePillPending
                    }`}
                  >
                    <span className={styles.workflowCorePillTop}>
                      <strong>1. 건강 정보</strong>
                      <span className={styles.workflowCorePillCaret} aria-hidden>
                        →
                      </span>
                    </span>
                    <span className={styles.workflowCorePillStatus}>
                      {healthComplete
                        ? "완료"
                        : healthWorkflow.stepLabel || healthWorkflow.badge}
                    </span>
                    <span className={styles.workflowCorePillFooter}>
                      <small className={styles.workflowCorePillHint}>{healthCoreHint}</small>
                      <span className={styles.workflowCorePillAction}>{healthCoreActionText}</span>
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
                      <span className={styles.workflowCorePillCaret} aria-hidden>
                        →
                      </span>
                    </span>
                    <span className={styles.workflowCorePillStatus}>
                      {showSurvey ? "작성 중" : surveyComplete ? "완료" : "진행 필요"}
                    </span>
                    <span className={styles.workflowCorePillFooter}>
                      <small className={styles.workflowCorePillHint}>{surveyCoreHint}</small>
                      <span className={styles.workflowCorePillAction}>{surveyCoreActionText}</span>
                    </span>
                  </button>
                </div>
                <div className={`${styles.workflowFeedback} ${workflowFeedbackClass}`}>
                  <span className={styles.workflowFeedbackLabel}>{workflowFeedback.label}</span>
                  <p className={styles.workflowFeedbackText}>{workflowFeedback.message}</p>
                </div>
              </div>

              {workspace.sync &&
              (workspace.sync.active ||
                workspace.sync.status === "failed" ||
                workspace.sync.status === "completed") ? (
                <div className={`${styles.workflowBanner} ${healthToneCardClass}`}>
                  <div className={styles.workflowBannerTop}>
                    <div className={styles.workflowLiveRow}>
                      {healthWorkflow.active ? (
                        <span className={styles.workflowLiveBadge}>
                          <span className={styles.workflowLiveDot} />
                          현재 단계 {healthWorkflow.stepLabel}
                        </span>
                      ) : null}
                      <span className={healthToneBadgeClass}>{healthWorkflow.badge}</span>
                    </div>
                    {workspace.sync.nextRetryAt ? (
                      <span className={styles.workflowMetaItem}>
                        다음 재시도 {formatDateTime(workspace.sync.nextRetryAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className={styles.workflowBannerTitle}>{healthWorkflow.title}</p>
                  <p className={styles.workflowBannerText}>{syncStatus.message}</p>
                </div>
              ) : null}

              <div className={styles.workflowGrid}>
                <article className={`${styles.workflowCard} ${healthToneCardClass}`}>
                  <div className={styles.workflowCardHeader}>
                    <div className={styles.workflowLabelBlock}>
                      <span className={styles.workflowIndex}>필수 1</span>
                      <h3 className={styles.workflowCardTitle}>건강 정보</h3>
                    </div>
                    <span className={healthToneBadgeClass}>{healthWorkflow.badge}</span>
                  </div>

                  <p className={styles.workflowLead}>{healthWorkflow.title}</p>
                  <p className={styles.workflowText}>{healthWorkflow.description}</p>

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
                      {healthButtonLabel}
                    </button>
                    <div className={styles.workflowMetaRow}>
                      {workspace.sync?.requestedAt ? (
                        <span className={styles.workflowMetaItem}>
                          요청 {formatDateTime(workspace.sync.requestedAt)}
                        </span>
                      ) : null}
                      {workspace.currentStatus?.health.fetchedAt ? (
                        <span className={styles.workflowMetaItem}>
                          반영 {formatDateTime(workspace.currentStatus.health.fetchedAt)}
                        </span>
                      ) : null}
                      {!workspace.currentStatus?.health.fetchedAt && workspace.sync?.nextRetryAt ? (
                        <span className={styles.workflowMetaItem}>
                          다음 확인 {formatDateTime(workspace.sync.nextRetryAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>

                <article className={`${styles.workflowCard} ${surveyToneCardClass}`}>
                  <div className={styles.workflowCardHeader}>
                    <div className={styles.workflowLabelBlock}>
                      <span className={styles.workflowIndex}>필수 2</span>
                      <h3 className={styles.workflowCardTitle}>설문</h3>
                    </div>
                    <span className={surveyToneBadgeClass}>{surveyWorkflow.badge}</span>
                  </div>

                  <p className={styles.workflowLead}>{surveyWorkflow.title}</p>
                  <p className={styles.workflowText}>{surveyWorkflow.description}</p>

                  <div className={styles.workflowMetaRow}>
                    <span className={styles.workflowMetaItem}>같은 페이지에서 진행</span>
                    <span className={styles.workflowMetaItem}>자동 저장</span>
                    <span className={styles.workflowMetaItem}>완료 즉시 리포트 갱신</span>
                    {workspace.currentStatus?.survey.submittedAt ? (
                      <span className={styles.workflowMetaItem}>
                        제출 {formatDateTime(workspace.currentStatus.survey.submittedAt)}
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

              {showSurvey ? (
                <EmbeddedEmployeeSurveyPanel
                  onCompleted={handleSurveyCompleted}
                  onClose={() => setShowSurvey(false)}
                />
              ) : null}

              <article className={`${styles.workflowReportCard} ${reportToneCardClass}`}>
                <div className={styles.workflowReportTop}>
                  <div className={styles.workflowLabelBlock}>
                    <span className={styles.workflowIndex}>리포트</span>
                    <h3 className={styles.workflowCardTitle}>리포트 기록</h3>
                  </div>
                  <span className={reportToneBadgeClass}>{reportWorkflow.badge}</span>
                </div>

                <p className={styles.workflowLead}>{reportWorkflow.title}</p>
                <p className={styles.workflowText}>{reportWorkflow.description}</p>

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
                    {pendingAction === "refresh" ? "상태 확인 중..." : "상태 새로고침"}
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
                      ? `다음 확인 예정 시각 ${formatDateTime(workspace.sync.nextRetryAt)}`
                      : syncStatus.message}
                </p>
              </article>
            </section>

            {!showSurvey && workspace.report ? (
              <section className={styles.reportCanvas}>
                <div className={styles.reportCanvasHeader}>
                  <div className={styles.reportCanvasMeta}>
                    <p className={styles.reportCanvasEyebrow}>리포트</p>
                    <h3>
                      {workspace.selectedPeriodKey || workspace.report.periodKey || "최근"} 리포트
                    </h3>
                    <p>
                      생성 시각 {formatDateTime(workspace.report.updatedAt)} · 버전 v
                      {workspace.report.variantIndex}
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
                      {workspace.currentStatus?.ready ? "현재 주기 최신본" : "부분 데이터 반영본"}
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
                      건강 정보 확인과 설문 진행 상황에 따라 최신 리포트가 추가됩니다.
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
    </div>
  );
}
