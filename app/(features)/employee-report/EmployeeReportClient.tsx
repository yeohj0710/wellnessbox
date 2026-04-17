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

function syncStatusText(workspace: EmployeeWorkspaceResponse | null) {
  const sync = workspace?.sync;
  if (!sync) {
    return {
      badge: "대기",
      tone: "off" as const,
      message: "건강 데이터 연동 상태를 확인하는 중입니다.",
    };
  }

  if (sync.status === "completed") {
    return {
      badge: "연동 완료",
      tone: "on" as const,
      message:
        "건강검진 데이터와 복약 이력이 반영되었습니다. 설문을 마치면 최신 리포트가 바로 갱신됩니다.",
    };
  }
  if (sync.status === "failed") {
    return {
      badge: "재시도 필요",
      tone: "warn" as const,
      message:
        sync.lastErrorMessage ||
        "건강 데이터 연동이 멈췄습니다. 버튼을 눌러 다시 요청할 수 있습니다.",
    };
  }
  if (sync.status === "awaiting_sign") {
    return {
      badge: "인증 대기",
      tone: "warn" as const,
      message:
        "카카오 인증이 확인되면 백엔드가 창을 닫아도 이어서 건강검진/복약 이력을 가져옵니다.",
    };
  }
  if (sync.step === "fetch") {
    return {
      badge: "데이터 수집 중",
      tone: "on" as const,
      message:
        "백엔드에서 건강검진 데이터와 복약 이력을 수집하고 있습니다.",
    };
  }
  return {
    badge: "연동 준비 중",
    tone: "off" as const,
    message:
      "건강 데이터 연동 요청이 접수되었습니다. 카카오 인증과 연동 단계를 순서대로 진행하고 있습니다.",
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

  const validIdentity = useMemo(
    () => isValidIdentityInput(toIdentityPayload(identity)),
    [identity]
  );
  const syncStatus = useMemo(() => syncStatusText(workspace), [workspace]);

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
            : "직원 리포트 상태를 불러오지 못했습니다."
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
            "건강 데이터 재연동 요청을 보냈습니다. 창을 닫아도 백엔드에서 계속 진행합니다."
          );
        } else if (next.currentStatus?.hasAnyWorkspaceData) {
          setShowSurvey(false);
          setNotice("기존 데이터와 리포트를 불러왔습니다.");
        } else {
          setShowSurvey(true);
          setNotice(
            "건강 데이터 연동은 백엔드에서 계속 진행합니다. 이 페이지에서 바로 설문을 이어서 진행해 주세요."
          );
        }
      } catch (workspaceError) {
        setError(
          workspaceError instanceof Error
            ? workspaceError.message
            : "직원 리포트 작업을 시작하지 못했습니다."
        );
      } finally {
        setBusy(false);
      }
    },
    [applyWorkspace, identity, validIdentity]
  );

  const handleSelectReport = useCallback(
    async (nextReportId: string) => {
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
        setBusy(false);
      }
    },
    [loadWorkspace]
  );

  const handleSurveyCompleted = useCallback(
    async (_periodKey: string | null) => {
      setShowSurvey(false);
      setSelectedReportId(null);
      setNotice("설문이 저장되었습니다. 최신 리포트를 다시 불러오고 있습니다.");
      setPolling(true);
      try {
        const nextWorkspace = await loadWorkspace({ reportId: null });
        if (!nextWorkspace.currentStatus?.ready && nextWorkspace.sync?.active !== true) {
          setNotice(
            "설문은 저장되었고, 건강 데이터가 준비되는 대로 최신 리포트가 이어서 갱신됩니다."
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
      setBusy(false);
    }
  }, [loadWorkspace, selectedReportId, showSurvey]);

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
            이름과 생년월일, 전화번호를 입력하면 건강검진 데이터와 복약 이력 연동은 백엔드에서
            이어서 진행되고, 설문은 이 페이지에서 바로 계속할 수 있습니다.
          </p>
          <div className={styles.statusRow}>
            {!workspace ? (
              <span className={styles.statusOff}>본인 확인 필요</span>
            ) : workspace.currentStatus?.ready ? (
              <span className={styles.statusOn}>현재 주기 리포트 준비 완료</span>
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
                  조회를 시작하면 건강 데이터 연동은 백엔드에서 계속 진행되고, 설문은 이 페이지에서
                  바로 이어집니다.
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

              <div className={styles.formGrid}>
                <div className={styles.optionalCard}>
                  <strong>건강 데이터</strong>
                  <p className={styles.optionalText}>
                    {workspace.currentStatus?.health.complete
                      ? `완료 · ${formatDateTime(
                          workspace.currentStatus.health.fetchedAt
                        )}`
                      : syncStatus.message}
                  </p>
                </div>
                <div className={styles.optionalCard}>
                  <strong>설문</strong>
                  <p className={styles.optionalText}>
                    {workspace.currentStatus?.survey.complete
                      ? `완료 · ${formatDateTime(
                          workspace.currentStatus.survey.submittedAt
                        )}`
                      : "아직 제출되지 않았습니다. 아래에서 바로 진행할 수 있습니다."}
                  </p>
                </div>
                <div className={styles.optionalCard}>
                  <strong>현재 리포트</strong>
                  <p className={styles.optionalText}>
                    {workspace.currentStatus?.ready
                      ? "건강 데이터와 설문이 모두 반영된 최신 리포트를 볼 수 있습니다."
                      : "둘 중 하나라도 먼저 완료되면 기존 리포트를 열고, 완료 후에는 최신 버전이 추가됩니다."}
                  </p>
                </div>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowSurvey((prev) => !prev);
                  }}
                  className={styles.buttonPrimary}
                >
                  {showSurvey
                    ? "설문 닫기"
                    : workspace.currentStatus?.survey.complete
                      ? "설문 다시하기"
                      : "설문 진행하기"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void handleStartWorkspace({ restartHealth: true });
                  }}
                  className={styles.buttonSecondary}
                >
                  건강 데이터 다시 연동
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void handleRefreshWorkspace();
                  }}
                  className={styles.buttonGhost}
                >
                  상태 새로고침
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

              {workspace.reports && workspace.reports.length > 0 ? (
                <div className={styles.summaryControlPanel}>
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
                </div>
              ) : null}

              <p className={styles.inlineHint}>
                {workspace.sync?.nextRetryAt
                  ? `다음 백엔드 재시도 예정 시각 ${formatDateTime(workspace.sync.nextRetryAt)}`
                  : syncStatus.message}
              </p>
            </section>

            {showSurvey ? (
              <EmbeddedEmployeeSurveyPanel
                onCompleted={handleSurveyCompleted}
                onClose={() => setShowSurvey(false)}
              />
            ) : workspace.report ? (
              <section className={styles.reportCanvas}>
                <div className={styles.reportCanvasHeader}>
                  <div className={styles.reportCanvasMeta}>
                    <p className={styles.reportCanvasEyebrow}>Report</p>
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
                  className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}
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
                      건강 데이터 연동과 설문 제출 상태에 따라 최신 리포트가 자동으로 추가됩니다.
                    </p>
                  </div>
                </div>
                <p className={styles.inlineHint}>{syncStatus.message}</p>
              </section>
            )}
          </>
        )}

        {notice ? (
          <section className={styles.sectionCard}>
            <p className={styles.inlineHint}>{notice}</p>
          </section>
        ) : null}
        {error ? (
          <section className={styles.sectionCard}>
            <p className={styles.statusWarn}>{error}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
