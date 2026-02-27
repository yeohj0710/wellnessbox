"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportRenderer from "@/components/b2b/ReportRenderer";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import OperationLoadingOverlay from "@/components/common/operationLoadingOverlay";
import styles from "@/components/b2b/B2bUx.module.css";
import { captureElementToPdf } from "@/lib/client/capture-pdf";
import EmployeeReportBootSkeleton from "./_components/EmployeeReportBootSkeleton";
import EmployeeReportIdentitySection from "./_components/EmployeeReportIdentitySection";
import EmployeeReportSummaryHeaderCard from "./_components/EmployeeReportSummaryHeaderCard";
import EmployeeReportSyncGuidanceNotice from "./_components/EmployeeReportSyncGuidanceNotice";
import ForceRefreshConfirmDialog from "./_components/ForceRefreshConfirmDialog";
import {
  deleteEmployeeSession,
  fetchEmployeeReport,
  fetchEmployeeSession,
  requestNhisUnlink,
  upsertEmployeeSession,
} from "./_lib/api";
import type {
  EmployeeReportResponse,
  EmployeeSessionGetResponse,
  EmployeeSessionUpsertResponse,
  IdentityInput,
  SyncGuidance,
} from "./_lib/client-types";
import {
  ApiRequestError,
  buildSyncGuidance,
  clearStoredIdentity,
  downloadPdf,
  formatDateTime,
  isValidIdentityInput,
  normalizeDigits,
  parseLayoutDsl,
  readStoredIdentity,
  resolveMedicationStatusMessage,
  saveStoredIdentity,
  toIdentityPayload,
  toSyncNextAction,
} from "./_lib/client-utils";
import {
  ensureNhisReadyForSync as ensureNhisReadyForSyncFlow,
  isCachedSyncSource,
  runRestartAuthFlow,
  runSyncFlowWithRecovery,
  syncEmployeeReportAndReload as syncEmployeeReportAndReloadFlow,
} from "./_lib/sync-flow";
import { useAdminLoginStatus } from "./_lib/use-admin-login-status";
import { useBusyState } from "./_lib/use-busy-state";
import { useForceSyncCooldown } from "./_lib/use-force-sync-cooldown";

export default function EmployeeReportClient() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get("debug") === "1";
  const [identity, setIdentity] = useState<IdentityInput>({
    name: "",
    birthDate: "",
    phone: "",
  });
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState<EmployeeReportResponse | null>(null);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [syncNextAction, setSyncNextAction] = useState<
    "init" | "sign" | "retry" | null
  >(null);
  const [syncGuidance, setSyncGuidance] = useState<SyncGuidance | null>(null);
  const [pendingSignForceRefresh, setPendingSignForceRefresh] = useState(false);
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const [forceConfirmText, setForceConfirmText] = useState("");
  const [forceConfirmChecked, setForceConfirmChecked] = useState(false);
  const hasTriedStoredLogin = useRef(false);
  const webReportCaptureRef = useRef<HTMLDivElement | null>(null);
  const isAdminLoggedIn = useAdminLoginStatus();
  const {
    busy,
    busyMessage,
    busyElapsedSec,
    busyHint,
    beginBusy,
    updateBusy,
    endBusy,
  } = useBusyState();
  const { forceSyncRemainingSec, applyForceSyncCooldown } = useForceSyncCooldown();

  const identityPayload = useMemo(() => toIdentityPayload(identity), [identity]);

  const validIdentity = useMemo(
    () => isValidIdentityInput(identityPayload),
    [identityPayload]
  );

  const medicationStatus = useMemo(
    () => resolveMedicationStatusMessage(reportData),
    [reportData]
  );

  const periodOptions = useMemo(() => {
    const options = reportData?.availablePeriods ?? [];
    if (options.length > 0) return options;
    if (selectedPeriodKey) return [selectedPeriodKey];
    if (reportData?.periodKey) return [reportData.periodKey];
    return [];
  }, [reportData?.availablePeriods, reportData?.periodKey, selectedPeriodKey]);

  const canUseForceSync = useMemo(
    () => debugMode || isAdminLoggedIn,
    [debugMode, isAdminLoggedIn]
  );
  const previewLayout = useMemo(
    () => parseLayoutDsl(reportData?.report?.layoutDsl),
    [reportData?.report?.layoutDsl]
  );

  const canExecuteForceSync = useMemo(
    () => forceConfirmChecked && forceConfirmText.trim() === "강제 재조회",
    [forceConfirmChecked, forceConfirmText]
  );

  const overlayDescription = useMemo(() => {
    if (busyHint === "force-preflight" || busyHint === "sync-preflight") {
      return "세션/캐시 상태를 먼저 확인하고 있어요. 이 단계는 비용이 발생하지 않습니다.";
    }
    if (busyHint === "force-remote") {
      return "지금부터 실제 건보공단/하이픈 조회를 수행합니다. 2~3분 정도 걸릴 수 있습니다.";
    }
    if (busyHint === "sync-remote") {
      return "캐시 미적중으로 외부 연동을 수행합니다. 2~3분 정도 걸릴 수 있습니다.";
    }
    return "완료되면 화면이 자동으로 갱신됩니다.";
  }, [busyHint]);

  const overlayDetailLines = useMemo(() => {
    if (busyHint === "sync-preflight" || busyHint === "force-preflight") {
      return [
        "1단계: 저장된 스냅샷/리포트 캐시를 우선 조회하고 있어요.",
        "캐시 적중 시 외부 API를 다시 호출하지 않습니다.",
      ];
    }
    if (busyHint !== "sync-remote" && busyHint !== "force-remote") {
      return [] as string[];
    }
    if (busyElapsedSec < 45) {
      return [
        "2단계: 인증 세션과 요청 정보를 확인하고 있어요.",
        "브라우저를 닫지 말고 잠시만 기다려 주세요.",
      ];
    }
    if (busyElapsedSec < 120) {
      return [
        "3단계: 하이픈을 통해 건보공단 원천 데이터를 조회 중이에요.",
        "외부 응답 시간에 따라 2~3분이 소요될 수 있어요.",
      ];
    }
    return [
      "4단계: 받은 데이터를 정리하고 리포트/DB를 갱신하고 있어요.",
      "완료 후 최근 3건 기준으로 화면이 자동 갱신됩니다.",
    ];
  }, [busyElapsedSec, busyHint]);

  function getIdentityPayload() {
    return identityPayload;
  }

  function setPendingSignGuidance(message: string, forceRefresh = false) {
    setPendingSignForceRefresh(forceRefresh);
    setSyncNextAction("sign");
    setSyncGuidance({
      nextAction: "sign",
      message,
    });
  }

  async function loadReport(periodKey?: string) {
    const data = await fetchEmployeeReport(periodKey);
    if (!data.ok) throw new Error(data.error || "레포트 조회에 실패했습니다.");
    setReportData(data);
    setSelectedPeriodKey(data.periodKey || periodKey || "");
    setError("");
    if (validIdentity) {
      saveStoredIdentity(identityPayload);
    }
  }

  async function syncEmployeeReport(
    forceRefresh = false,
    options?: { debugOverride?: boolean }
  ) {
    return syncEmployeeReportAndReloadFlow({
      getIdentityPayload,
      forceRefresh,
      debugOverride: options?.debugOverride,
      selectedPeriodKey,
      loadReport,
      applyForceSyncCooldown,
      persistIdentity: saveStoredIdentity,
    });
  }

  async function checkSessionAndMaybeAutoLogin() {
    setBooting(true);
    try {
      const session: EmployeeSessionGetResponse = await fetchEmployeeSession();

      if (session.authenticated) {
        if (session.employee) {
          setIdentity({
            name: session.employee.name,
            birthDate: session.employee.birthDate,
            phone: session.employee.phoneNormalized,
          });
        }
        await loadReport();
        return;
      }

      if (!hasTriedStoredLogin.current) {
        hasTriedStoredLogin.current = true;
        const stored = readStoredIdentity();
        if (stored) {
          setIdentity(stored);
          const loginResult: EmployeeSessionUpsertResponse = await upsertEmployeeSession(
            stored
          );
          if (loginResult.found) {
            setNotice("이전에 조회한 정보로 자동 로그인했습니다.");
            setSyncGuidance(null);
            await loadReport();
            return;
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "세션 확인 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    void checkSessionAndMaybeAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFindExisting() {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    beginBusy("기존 조회 기록을 확인하고 있어요.");
    setError("");
    setNotice("");
    try {
      const payload = getIdentityPayload();
      const result: EmployeeSessionUpsertResponse = await upsertEmployeeSession(payload);
      if (!result.found) {
        setNotice(
          result.message ||
            "조회 가능한 기록이 없습니다. 카카오 인증 후 연동해 주세요."
        );
        return;
      }
      saveStoredIdentity(payload);
      setNotice("기존 레포트를 불러왔습니다.");
      setSyncNextAction(null);
      setSyncGuidance(null);
      setPendingSignForceRefresh(false);
      await loadReport();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "기존 정보 조회에 실패했습니다."
      );
    } finally {
      endBusy();
    }
  }

  async function tryLoadExistingReport(options?: {
    successNotice?: string;
    showNotFoundNotice?: boolean;
  }) {
    const payload = getIdentityPayload();
    const result: EmployeeSessionUpsertResponse = await upsertEmployeeSession(payload);
    if (!result.found) {
      if (options?.showNotFoundNotice) {
        setNotice(
          result.message ||
            "조회 가능한 기록이 없어요. 카카오 인증 후 연동을 진행해 주세요."
        );
      }
      return false;
    }

    saveStoredIdentity(payload);
    setSyncNextAction(null);
    setSyncGuidance(null);
    setPendingSignForceRefresh(false);
    await loadReport();
    setNotice(options?.successNotice || "기존 레포트를 불러왔어요.");
    return true;
  }

  async function ensureNhisReadyForSync(options?: { forceInit?: boolean }) {
    return ensureNhisReadyForSyncFlow({
      getIdentityPayload,
      forceInit: options?.forceInit,
    });
  }

  async function handleRestartAuth() {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    beginBusy("카카오 인증 재요청을 진행하고 있어요.");
    setError("");
    setNotice("");
    setSyncGuidance(null);
    setSyncNextAction(null);
    setPendingSignForceRefresh(false);
    try {
      const restartResult = await runRestartAuthFlow({
        getIdentityPayload,
        syncEmployeeReport,
        debugOverride: debugMode,
      });

      if (restartResult.status === "ready") {
        setPendingSignForceRefresh(false);
        const reusedFromCache = restartResult.reusedFromCache;
        setNotice(
          reusedFromCache
            ? "기존 연동 데이터를 사용해 레포트를 불러왔습니다."
            : "카카오 인증을 재요청하고 최신 데이터를 불러왔습니다."
        );
        return;
      }

      setSyncNextAction("sign");
      setPendingSignForceRefresh(false);
      setSyncGuidance({
        nextAction: "sign",
        message:
          "카카오 인증 확인 대기중입니다. 인증이 완료되면 다시 확인해 주세요.",
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        applyForceSyncCooldown(err.payload);
        const guidance = buildSyncGuidance(
          err.payload,
          err.status,
          "카카오 인증 요청에 실패했습니다."
        );
        setSyncGuidance(guidance);
        const nextAction = toSyncNextAction(guidance.nextAction) ?? "retry";
        setSyncNextAction(nextAction);
        setPendingSignForceRefresh(false);
        setNotice(guidance.message);
      } else {
        setSyncNextAction("retry");
        setPendingSignForceRefresh(false);
        setError(
          err instanceof Error
            ? err.message
            : "카카오 인증 요청에 실패했습니다."
        );
      }
    } finally {
      endBusy();
    }
  }

  async function handleSignAndSync(forceRefresh = false) {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    if (forceRefresh && !canUseForceSync) {
      setError("강제 재조회는 운영자 도구에서만 사용할 수 있습니다.");
      return;
    }
    if (forceRefresh && forceSyncRemainingSec > 0) {
      const availableAtIso = new Date(
        Date.now() + forceSyncRemainingSec * 1000
      ).toISOString();
      setNotice(`재연동은 ${formatDateTime(availableAtIso)} 이후 가능합니다.`);
      return;
    }

    if (forceRefresh) {
      clearStoredIdentity();
    }

    beginBusy(
      forceRefresh
        ? "강제 재조회를 준비하고 있어요."
        : "국민건강보험 연동을 준비하고 있어요.",
      forceRefresh ? "force-preflight" : "sync-preflight"
    );
    setError("");
    setNotice("");
    setSyncGuidance(null);

    const signPendingMessage =
      "카카오 인증 확인 대기중입니다. 인증이 완료되면 다시 확인해 주세요.";

    try {
      if (!forceRefresh && !reportData) {
        const reusedExisting = await tryLoadExistingReport({
          successNotice:
            "등록된 조회 기록을 불러왔고, 외부 API 재조회 없이 바로 확인할 수 있어요.",
        });
        if (reusedExisting) return;
      }

      const syncEmployeeReportWithBusy: typeof syncEmployeeReport = async (
        nextForceRefresh,
        options
      ) => {
        updateBusy({
          message: nextForceRefresh
            ? "강제 재조회로 건보공단 데이터를 불러오고 있어요."
            : "건보공단 데이터를 불러오고 있어요.",
          hint: nextForceRefresh ? "force-remote" : "sync-remote",
        });
        return syncEmployeeReport(nextForceRefresh, options);
      };

      const syncFlowResult = await runSyncFlowWithRecovery({
        forceRefresh,
        preflightForceInit: forceRefresh && !pendingSignForceRefresh,
        debugOverride: debugMode,
        ensureNhisReadyForSync,
        syncEmployeeReport: syncEmployeeReportWithBusy,
      });
      if (syncFlowResult.status === "pending-sign") {
        setPendingSignGuidance(signPendingMessage, forceRefresh);
        return;
      }

      const { syncResult, ready } = syncFlowResult;

      if (isCachedSyncSource(syncResult.sync?.source)) {
        setNotice("캐시 데이터를 사용해 레포트를 갱신했습니다.");
      } else if (ready.reused) {
        setNotice("기존 인증 상태를 사용해 레포트를 갱신했습니다.");
      } else {
        setNotice(
          forceRefresh
            ? "강제 재조회로 최신 정보를 반영했습니다."
            : "최신 정보를 연동해 레포트를 갱신했습니다."
        );
      }
      setSyncNextAction(null);
      setSyncGuidance(null);
      setPendingSignForceRefresh(false);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        applyForceSyncCooldown(err.payload);
        const guidance = buildSyncGuidance(
          err.payload,
          err.status,
          "데이터 연동에 실패했습니다."
        );
        setSyncGuidance(guidance);
        const nextAction = toSyncNextAction(guidance.nextAction) ?? "retry";
        setSyncNextAction(nextAction);
        if (nextAction === "sign") {
          setPendingSignForceRefresh(forceRefresh);
        } else {
          setPendingSignForceRefresh(false);
        }
        setNotice(guidance.message);
      } else {
        setSyncNextAction("retry");
        setPendingSignForceRefresh(false);
        setError(
          err instanceof Error
            ? err.message
            : "데이터 연동에 실패했습니다."
        );
      }
    } finally {
      endBusy();
    }
  }

  async function handleDownloadPdf() {
    if (!reportData?.report?.id) return;
    const captureTarget = webReportCaptureRef.current;
    if (!captureTarget) {
      setError("레포트 캡처 대상을 찾지 못했습니다. 화면을 새로고침 후 다시 시도해 주세요.");
      return;
    }

    beginBusy("웹 레포트를 PDF로 캡처하고 있어요.");
    setError("");
    setNotice("");
    try {
      const periodLabel = selectedPeriodKey || reportData.periodKey || "latest";
      await captureElementToPdf({
        element: captureTarget,
        fileName: `employee-report-${periodLabel}.pdf`,
        desktopViewportWidth: 1440,
      });
      setNotice("화면 캡처 기반 PDF 다운로드가 완료되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 캡처 다운로드에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleDownloadLegacyPdf() {
    if (!reportData?.report?.id) return;
    beginBusy("기존 PDF 엔진으로 파일을 생성하고 있어요.");
    setError("");
    setNotice("");
    try {
      const periodQuery = selectedPeriodKey
        ? `?period=${encodeURIComponent(selectedPeriodKey)}`
        : "";
      await downloadPdf(
        `/api/b2b/employee/report/export/pdf${periodQuery}`,
        "employee-report.pdf"
      );
      setNotice("기존 PDF 엔진 다운로드가 완료되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "기존 PDF 다운로드에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleLogout() {
    beginBusy("연동 세션을 해제하고 있어요.");
    setError("");
    try {
      await deleteEmployeeSession();
      await requestNhisUnlink().catch(() => null);
      setReportData(null);
      setSelectedPeriodKey("");
      setSyncNextAction(null);
      setSyncGuidance(null);
      setPendingSignForceRefresh(false);
      setForceConfirmOpen(false);
      setForceConfirmText("");
      setForceConfirmChecked(false);
      setNotice("현재 연결된 조회 세션을 해제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 해제에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleChangePeriod(nextPeriod: string) {
    setSelectedPeriodKey(nextPeriod);
    beginBusy("선택한 기간 레포트를 불러오고 있어요.");
    setError("");
    try {
      await loadReport(nextPeriod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "선택한 기간 조회에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  if (booting) {
    return <EmployeeReportBootSkeleton />;
  }

  return (
    <div className={styles.pageBackdrop}>
      <OperationLoadingOverlay
        visible={busy}
        title={busyMessage || "\uC791\uC5C5\uC744 \uCC98\uB9AC\uD558\uACE0 \uC788\uC5B4\uC694."}
        description={overlayDescription}
        detailLines={overlayDetailLines}
        elapsedSec={busyElapsedSec}
        position="top"
      />
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.compactPage} ${styles.stack}`}>
      <header className={styles.heroCard}>
        <p className={styles.kicker}>EMPLOYEE REPORT</p>
        <h1 className={styles.title}>임직원 건강 레포트</h1>
        <p className={styles.description}>
          본인 확인을 마치면 선택한 기간의 건강 레포트를 바로 볼 수 있어요. 화면에서 확인한
          내용을 그대로 PDF로 내려받아 제출하거나 공유하면 돼요.
        </p>
        <div className={styles.statusRow}>
          {reportData?.report ? (
            <span className={styles.statusOn}>레포트 준비 완료</span>
          ) : (
            <span className={styles.statusOff}>본인 확인 필요</span>
          )}
          {selectedPeriodKey ? <span className={styles.pill}>{selectedPeriodKey}</span> : null}
        </div>
      </header>

      {error ? <div className={styles.noticeError}>{error}</div> : null}
      {notice && !syncGuidance ? (
        <div className={styles.noticeSuccess}>{notice}</div>
      ) : null}
      {syncGuidance && !reportData?.report ? (
        <EmployeeReportSyncGuidanceNotice
          guidance={syncGuidance}
          busy={busy}
          showActions={!reportData?.report}
          onRestartAuth={handleRestartAuth}
          onSignAndSync={() => void handleSignAndSync(pendingSignForceRefresh)}
        />
      ) : null}

      {!reportData ? (
        <EmployeeReportIdentitySection
          identity={identity}
          busy={busy}
          showSignAction={!syncGuidance && syncNextAction === "sign"}
          hideActionRow={!!syncGuidance}
          onNameChange={(value) => {
            setIdentity((prev) => ({ ...prev, name: value }));
          }}
          onBirthDateChange={(value) => {
            setIdentity((prev) => ({
              ...prev,
              birthDate: normalizeDigits(value).slice(0, 8),
            }));
          }}
          onPhoneChange={(value) => {
            setIdentity((prev) => ({
              ...prev,
              phone: normalizeDigits(value).slice(0, 11),
            }));
          }}
          onRestartAuth={handleRestartAuth}
          onSignAndSync={() => void handleSignAndSync(pendingSignForceRefresh)}
          onFindExisting={handleFindExisting}
        />
      ) : null}

      {reportData?.report ? (
        <>
          <EmployeeReportSummaryHeaderCard
            reportData={reportData}
            selectedPeriodKey={selectedPeriodKey}
            periodOptions={periodOptions}
            busy={busy}
            syncNextAction={syncNextAction}
            canUseForceSync={canUseForceSync}
            forceSyncRemainingSec={forceSyncRemainingSec}
            onPeriodChange={(next) => {
              void handleChangePeriod(next);
            }}
            onDownloadPdf={handleDownloadPdf}
            onDownloadLegacyPdf={handleDownloadLegacyPdf}
            onRestartAuth={handleRestartAuth}
            onSignAndSync={() => void handleSignAndSync(pendingSignForceRefresh)}
            onLogout={handleLogout}
            onOpenForceSync={() => setForceConfirmOpen(true)}
          />

          {reportData.report.payload?.meta?.isMockData ? (
            <div className={styles.noticeWarn}>
              현재 레포트는 데모 데이터 기반으로 생성되었습니다.
            </div>
          ) : null}

          {medicationStatus ? (
            <div
              className={
                medicationStatus.tone === "error"
                  ? styles.noticeError
                  : styles.noticeWarn
              }
            >
              {medicationStatus.text}
            </div>
          ) : null}

          {/* New default: web-first report + capture PDF */}
          <section className={styles.reportCanvas}>
            <div className={styles.reportCanvasHeader}>
              <div>
                <h3>레포트 본문 미리보기</h3>
                <p>화면에서 보는 웹 레포트를 그대로 캡처해 PDF로 저장합니다.</p>
              </div>
              <span className={styles.statusOn}>웹/PDF 동일 레이아웃</span>
            </div>
            <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
              <div ref={webReportCaptureRef} className={styles.reportCaptureSurface}>
                <ReportSummaryCards payload={reportData.report.payload} viewerMode="employee" />
              </div>
            </div>
          </section>

          {previewLayout ? (
            <details className={`${styles.optionalCard} ${styles.reportLegacyPanel}`}>
              <summary>현행 엔진 미리보기</summary>
              <div className={styles.optionalBody}>
                <p className={styles.optionalText}>
                  기존 DSL 렌더러 결과입니다. 비교 확인이 필요할 때만 펼쳐서 확인하세요.
                </p>
                <div className={styles.reportCanvasBoard}>
                  <ReportRenderer layout={previewLayout} fitToWidth />
                </div>
              </div>
            </details>
          ) : null}
        </>
      ) : null}

        <ForceRefreshConfirmDialog
          open={forceConfirmOpen}
          busy={busy}
          confirmChecked={forceConfirmChecked}
          confirmText={forceConfirmText}
          canExecuteForceSync={canExecuteForceSync}
          onConfirmCheckedChange={setForceConfirmChecked}
          onConfirmTextChange={setForceConfirmText}
          onClose={() => {
            if (busy) return;
            setForceConfirmOpen(false);
            setForceConfirmText("");
            setForceConfirmChecked(false);
          }}
          onConfirm={() => {
            setForceConfirmOpen(false);
            setForceConfirmText("");
            setForceConfirmChecked(false);
            void handleSignAndSync(true);
          }}
        />
      </div>
    </div>
  );
}
