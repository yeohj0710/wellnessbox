"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportRenderer from "@/components/b2b/ReportRenderer";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import styles from "@/components/b2b/B2bUx.module.css";
import EmployeeReportBootSkeleton from "./_components/EmployeeReportBootSkeleton";
import EmployeeReportIdentitySection from "./_components/EmployeeReportIdentitySection";
import EmployeeReportSummaryHeaderCard from "./_components/EmployeeReportSummaryHeaderCard";
import EmployeeReportSyncGuidanceNotice from "./_components/EmployeeReportSyncGuidanceNotice";
import ForceRefreshConfirmDialog from "./_components/ForceRefreshConfirmDialog";
import {
  deleteEmployeeSession,
  fetchEmployeeReport,
  fetchEmployeeSession,
  fetchLoginStatus,
  postEmployeeSync,
  requestNhisInit,
  requestNhisSign,
  requestNhisUnlink,
  upsertEmployeeSession,
} from "./_lib/api";
import type {
  ApiErrorPayload,
  EmployeeReportResponse,
  EmployeeSessionGetResponse,
  EmployeeSessionUpsertResponse,
  IdentityInput,
  NhisInitResponse,
  NhisSignResponse,
  SyncGuidance,
} from "./_lib/client-types";
import {
  ApiRequestError,
  buildSyncGuidance,
  downloadPdf,
  formatDateTime,
  normalizeDigits,
  parseLayoutDsl,
  readStoredIdentity,
  resolveMedicationStatusMessage,
  resolveCooldownUntilFromPayload,
  saveStoredIdentity,
  toSyncNextAction,
} from "./_lib/client-utils";

export default function EmployeeReportClient() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get("debug") === "1";
  const [identity, setIdentity] = useState<IdentityInput>({
    name: "",
    birthDate: "",
    phone: "",
  });
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState<EmployeeReportResponse | null>(null);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [syncNextAction, setSyncNextAction] = useState<
    "init" | "sign" | "retry" | null
  >(null);
  const [syncGuidance, setSyncGuidance] = useState<SyncGuidance | null>(null);
  const [forceSyncCooldownUntil, setForceSyncCooldownUntil] = useState<number | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const [forceConfirmText, setForceConfirmText] = useState("");
  const [forceConfirmChecked, setForceConfirmChecked] = useState(false);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const hasTriedStoredLogin = useRef(false);

  const validIdentity = useMemo(() => {
    return (
      identity.name.trim().length > 0 &&
      /^\d{8}$/.test(normalizeDigits(identity.birthDate)) &&
      /^\d{10,11}$/.test(normalizeDigits(identity.phone))
    );
  }, [identity]);

  const medicationStatus = useMemo(
    () => resolveMedicationStatusMessage(reportData),
    [reportData]
  );

  const forceSyncRemainingSec = useMemo(() => {
    if (!forceSyncCooldownUntil) return 0;
    const remainingMs = forceSyncCooldownUntil - cooldownNow;
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }, [cooldownNow, forceSyncCooldownUntil]);

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

  useEffect(() => {
    if (!forceSyncCooldownUntil) return;
    if (forceSyncCooldownUntil <= Date.now()) {
      setForceSyncCooldownUntil(null);
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forceSyncCooldownUntil]);

  useEffect(() => {
    if (forceSyncRemainingSec <= 0 && forceSyncCooldownUntil) {
      setForceSyncCooldownUntil(null);
    }
  }, [forceSyncCooldownUntil, forceSyncRemainingSec]);

  function getIdentityPayload() {
    return {
      name: identity.name.trim(),
      birthDate: normalizeDigits(identity.birthDate),
      phone: normalizeDigits(identity.phone),
    };
  }

  useEffect(() => {
    let mounted = true;
    void fetchLoginStatus()
      .then((status) => {
        if (!mounted) return;
        setIsAdminLoggedIn(status.isAdminLoggedIn === true);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  function applyForceSyncCooldown(payload: ApiErrorPayload | null | undefined) {
    if (!payload) return;
    const until = resolveCooldownUntilFromPayload(payload);
    if (until) {
      setForceSyncCooldownUntil(until);
      setCooldownNow(Date.now());
    }
  }

  async function loadReport(periodKey?: string) {
    const data = await fetchEmployeeReport(periodKey);
    if (!data.ok) throw new Error(data.error || "레포트 조회에 실패했습니다.");
    setReportData(data);
    setSelectedPeriodKey(data.periodKey || periodKey || "");
    setError("");
    if (validIdentity) {
      saveStoredIdentity({
        name: identity.name.trim(),
        birthDate: normalizeDigits(identity.birthDate),
        phone: normalizeDigits(identity.phone),
      });
    }
  }

  async function syncEmployeeReport(
    forceRefresh = false,
    options?: { debugOverride?: boolean }
  ) {
    const payload = getIdentityPayload();
    const syncResult = await postEmployeeSync({
      identity: payload,
      forceRefresh,
      debugOverride: options?.debugOverride,
    });
    saveStoredIdentity(payload);
    if (syncResult.sync?.cooldown) {
      applyForceSyncCooldown({ cooldown: syncResult.sync.cooldown });
    }
    await loadReport(selectedPeriodKey || undefined);
    return syncResult;
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
    setBusy(true);
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
      await loadReport();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "기존 정보 조회에 실패했습니다."
      );
    } finally {
      setBusy(false);
    }
  }

  async function ensureNhisReadyForSync() {
    try {
      const signResult: NhisSignResponse = await requestNhisSign();
      return {
        linked: signResult.linked === true,
        reused: signResult.reused === true,
      };
    } catch (err) {
      if (!(err instanceof ApiRequestError) || err.status !== 409) throw err;
      const initResult: NhisInitResponse = await requestNhisInit({
        identity: getIdentityPayload(),
      });
      if (initResult.linked || initResult.nextStep === "fetch") {
        return {
          linked: true,
          reused: initResult.reused === true || initResult.source === "db-history",
        };
      }
      return { linked: false, reused: false };
    }
  }

  async function handleRestartAuth() {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    setSyncGuidance(null);
    setSyncNextAction(null);
    try {
      const initResult: NhisInitResponse = await requestNhisInit({
        identity: getIdentityPayload(),
      });

      if (initResult.linked || initResult.nextStep === "fetch") {
        const syncResult = await syncEmployeeReport(false, {
          debugOverride: debugMode,
        });
        const reusedFromCache =
          initResult.reused ||
          initResult.source === "db-history" ||
          syncResult.sync?.source === "cache-valid" ||
          syncResult.sync?.source === "cache-history";
        setNotice(
          reusedFromCache
            ? "기존 연동 데이터를 사용해 레포트를 불러왔습니다."
            : "카카오 인증이 완료되어 최신 데이터를 불러왔습니다."
        );
        return;
      }

      setSyncNextAction("sign");
      setSyncGuidance({
        nextAction: "sign",
        message:
          "카카오 인증 승인 대기 중입니다. 인증을 완료한 뒤 다시 확인해 주세요.",
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
        setSyncNextAction(toSyncNextAction(guidance.nextAction) ?? "retry");
        setNotice(guidance.message);
      } else {
        setSyncNextAction("retry");
        setError(err instanceof Error ? err.message : "카카오 인증 요청에 실패했습니다.");
      }
    } finally {
      setBusy(false);
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
      const availableAtIso = new Date(Date.now() + forceSyncRemainingSec * 1000).toISOString();
      setNotice(`재연동은 ${formatDateTime(availableAtIso)} 이후 가능합니다.`);
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    setSyncGuidance(null);
    try {
      let ready: { linked: boolean; reused: boolean } = {
        linked: true,
        reused: false,
      };
      if (!forceRefresh) {
        ready = await ensureNhisReadyForSync();
        if (!ready.linked) {
        setSyncNextAction("sign");
        setSyncGuidance({
          nextAction: "sign",
          message: "카카오 인증 승인 대기 중입니다. 인증을 완료한 뒤 다시 확인해 주세요.",
        });
        return;
      }
      }

      const syncResult = await syncEmployeeReport(forceRefresh, {
        debugOverride: debugMode,
      });
      if (
        syncResult.sync?.source === "cache-valid" ||
        syncResult.sync?.source === "cache-history"
      ) {
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
    } catch (err) {
      if (err instanceof ApiRequestError) {
        applyForceSyncCooldown(err.payload);
        const guidance = buildSyncGuidance(
          err.payload,
          err.status,
          "데이터 연동에 실패했습니다."
        );
        setSyncGuidance(guidance);
        setSyncNextAction(toSyncNextAction(guidance.nextAction) ?? "retry");
        setNotice(guidance.message);
      } else {
        setSyncNextAction("retry");
        setError(err instanceof Error ? err.message : "데이터 연동에 실패했습니다.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!reportData?.report?.id) return;
    setBusy(true);
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
      setNotice("PDF 다운로드가 완료되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await deleteEmployeeSession();
      await requestNhisUnlink().catch(() => null);
      setReportData(null);
      setSelectedPeriodKey("");
      setSyncNextAction(null);
      setSyncGuidance(null);
      setForceConfirmOpen(false);
      setForceConfirmText("");
      setForceConfirmChecked(false);
      setNotice("현재 연결된 조회 세션을 해제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return <EmployeeReportBootSkeleton />;
  }

  return (
    <div className={`${styles.page} ${styles.compactPage} ${styles.stack}`}>
      <header className={styles.heroCard}>
        <p className={styles.kicker}>EMPLOYEE REPORT</p>
        <h1 className={styles.title}>임직원 건강 레포트</h1>
        <p className={styles.description}>
          레포트는 화면에서 읽기 쉽게 제공되며, 공식 제출은 PDF 다운로드로 진행합니다.
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
      {notice ? <div className={styles.noticeSuccess}>{notice}</div> : null}
      {syncGuidance ? (
        <EmployeeReportSyncGuidanceNotice
          guidance={syncGuidance}
          busy={busy}
          onRestartAuth={handleRestartAuth}
          onSignAndSync={() => void handleSignAndSync(false)}
        />
      ) : null}

      {!reportData ? (
        <EmployeeReportIdentitySection
          identity={identity}
          busy={busy}
          showSignAction={syncNextAction === "sign"}
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
          onSignAndSync={() => void handleSignAndSync(false)}
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
              setSelectedPeriodKey(next);
              void loadReport(next);
            }}
            onDownloadPdf={handleDownloadPdf}
            onRestartAuth={handleRestartAuth}
            onSignAndSync={() => void handleSignAndSync(false)}
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

          {previewLayout ? (
            <section className={styles.reportCanvas}>
              <div className={styles.reportCanvasHeader}>
                <div>
                  <h3>리포트 본문 미리보기</h3>
                  <p>웹 화면과 동일한 레이아웃이 PDF/PPTX로 추출됩니다.</p>
                </div>
                <span className={styles.statusOn}>레이아웃 동기화 완료</span>
              </div>
              <div className={styles.reportCanvasBoard}>
                <ReportRenderer layout={previewLayout} fitToWidth />
              </div>
            </section>
          ) : (
            <ReportSummaryCards payload={reportData.report.payload} viewerMode="employee" />
          )}
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
  );
}
