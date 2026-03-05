"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import OperationLoadingOverlay from "@/components/common/operationLoadingOverlay";
import { useToast } from "@/components/common/toastContext.client";
import styles from "@/components/b2b/B2bUx.module.css";
import { emitAuthSyncEvent, subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
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
  formatDateTime,
  isValidIdentityInput,
  normalizeDigits,
  readStoredIdentityWithSource,
  resolveSyncCompletionNotice,
  resolveIdentityPrimaryActionLabel,
  resolveMedicationStatusMessage,
  saveStoredIdentity,
  toIdentityPayload,
  toSyncNextAction,
} from "./_lib/client-utils";
import {
  ensureNhisReadyForSync as ensureNhisReadyForSyncFlow,
  runRestartAuthFlow,
  runSyncFlowWithRecovery,
  syncEmployeeReportAndReload as syncEmployeeReportAndReloadFlow,
} from "./_lib/sync-flow";
import {
  downloadEmployeeReportLegacyPdf,
  downloadEmployeeReportPdf,
} from "./_lib/pdf-download";
import {
  resolveEmployeeReportOverlayDescription,
  resolveEmployeeReportOverlayDetailLines,
} from "./_lib/overlay-copy";
import { useAdminLoginStatus } from "./_lib/use-admin-login-status";
import { useBusyState } from "./_lib/use-busy-state";
import { useForceSyncCooldown } from "./_lib/use-force-sync-cooldown";
import { useEmployeeReportToastEffects } from "./_lib/use-employee-report-toast-effects";

export default function EmployeeReportClient() {
  const { showToast } = useToast();
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
  const [reportData, setReportData] = useState<EmployeeReportResponse | null>(
    null
  );
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [syncNextAction, setSyncNextAction] = useState<
    "init" | "sign" | "retry" | null
  >(null);
  const [syncGuidance, setSyncGuidance] = useState<SyncGuidance | null>(null);
  const [pendingSignForceRefresh, setPendingSignForceRefresh] = useState(false);
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const [forceConfirmText, setForceConfirmText] = useState("");
  const [forceConfirmChecked, setForceConfirmChecked] = useState(false);
  const [storedIdentitySource, setStoredIdentitySource] = useState<
    "none" | "v2" | "legacy" | "expired" | "invalid"
  >("none");
  const [hasAuthAttempt, setHasAuthAttempt] = useState(false);
  const hasTriedStoredLogin = useRef(false);
  const lastMockNoticeKeyRef = useRef<string | null>(null);
  const lastMedicationStatusKeyRef = useRef<string | null>(null);
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
  const { forceSyncRemainingSec, applyForceSyncCooldown } =
    useForceSyncCooldown();

  const identityPayload = useMemo(
    () => toIdentityPayload(identity),
    [identity]
  );

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

  const canExecuteForceSync = useMemo(
    () => forceConfirmChecked && forceConfirmText.trim() === "강제 재조회",
    [forceConfirmChecked, forceConfirmText]
  );
  const identityPrimaryActionLabel = useMemo(
    () =>
      resolveIdentityPrimaryActionLabel({
        hasAuthAttempt,
        syncNextAction,
        storedIdentitySource,
      }),
    [hasAuthAttempt, storedIdentitySource, syncNextAction]
  );

  const overlayDescription = useMemo(
    () => resolveEmployeeReportOverlayDescription(busyHint),
    [busyHint]
  );

  const overlayDetailLines = useMemo(
    () => resolveEmployeeReportOverlayDetailLines({ busyHint, busyElapsedSec }),
    [busyElapsedSec, busyHint]
  );

  function getIdentityPayload() {
    return identityPayload;
  }

  function clearLocalIdentityCache() {
    clearStoredIdentity();
    setStoredIdentitySource("none");
  }

  function emitB2bSessionSync(reason: string) {
    emitAuthSyncEvent({ scope: "b2b-employee-session", reason });
  }

  function emitNhisSync(reason: string) {
    emitAuthSyncEvent({ scope: "nhis-link", reason });
  }

  function resetReportState() {
    setReportData(null);
    setSelectedPeriodKey("");
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
    try {
      const data = await fetchEmployeeReport(periodKey);
      if (!data.ok)
        throw new Error(
          data.error ||
            "\uB808\uD3EC\uD2B8 \uC870\uD68C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
        );
      if (!data.report) {
        resetReportState();
        return;
      }
      setReportData(data);
      setSelectedPeriodKey(data.periodKey || periodKey || "");
      setError("");
      if (validIdentity) {
        saveStoredIdentity(identityPayload);
        setStoredIdentitySource("v2");
      }
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        (err.status === 401 || err.status === 404)
      ) {
        await deleteEmployeeSession().catch(() => null);
        clearLocalIdentityCache();
        resetReportState();
      }
      throw err;
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

  async function checkSessionAndMaybeAutoLogin(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setBooting(true);
    }
    try {
      const session: EmployeeSessionGetResponse = await fetchEmployeeSession();

      if (session.authenticated) {
        if (session.employee) {
          const sessionIdentity = {
            name: session.employee.name,
            birthDate: session.employee.birthDate,
            phone: session.employee.phoneNormalized,
          };
          setIdentity(sessionIdentity);
          saveStoredIdentity(sessionIdentity);
          setStoredIdentitySource("v2");
        }
        if (!session.latestReport) {
          resetReportState();
          setSyncNextAction("init");
          setSyncGuidance(null);
          setPendingSignForceRefresh(false);
          setNotice(
            "\uC800\uC7A5\uB41C \uB9AC\uD3EC\uD2B8\uAC00 \uC5C6\uC5B4 \uB2E4\uC2DC \uC778\uC99D \uD6C4 \uC5F0\uB3D9\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
          );
          return;
        }
        await loadReport();
        return;
      }

      if (!hasTriedStoredLogin.current) {
        hasTriedStoredLogin.current = true;
        const storedResult = readStoredIdentityWithSource();
        setStoredIdentitySource(storedResult.source);
        const stored = storedResult.identity;
        if (stored) {
          setIdentity(stored);
          const loginResult: EmployeeSessionUpsertResponse =
            await upsertEmployeeSession(stored);
          if (loginResult.found) {
            saveStoredIdentity(stored);
            setStoredIdentitySource("v2");
            emitB2bSessionSync("employee-report-auto-login");
            if (!loginResult.hasReport) {
              resetReportState();
              setSyncNextAction("init");
              setSyncGuidance(null);
              setPendingSignForceRefresh(false);
              setNotice(
                loginResult.message ||
                  "\uC800\uC7A5\uB41C \uB9AC\uD3EC\uD2B8\uAC00 \uC5C6\uC5B4 \uB2E4\uC2DC \uC778\uC99D \uD6C4 \uC5F0\uB3D9\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
              );
              return;
            }
            setNotice(
              "\uC774\uC804\uC5D0 \uC870\uD68C\uD55C \uC815\uBCF4\uB85C \uC790\uB3D9 \uB85C\uADF8\uC778\uD588\uC2B5\uB2C8\uB2E4."
            );
            setSyncGuidance(null);
            await loadReport();
            return;
          }
          clearLocalIdentityCache();
        }
      }

      resetReportState();
      setSyncNextAction("init");
      setSyncGuidance(null);
      setPendingSignForceRefresh(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "\uC138\uC158 \uD655\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.";
      setError(message);
    } finally {
      if (!options?.silent) {
        setBooting(false);
      }
    }
  }

  useEffect(() => {
    void checkSessionAndMaybeAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthSyncEvent(
      (detail) => {
        if (busy) return;

        if (detail.scope === "nhis-link") {
          if (!reportData) return;
          void loadReport(selectedPeriodKey || undefined).catch(() => null);
          return;
        }

        hasTriedStoredLogin.current = false;
        void checkSessionAndMaybeAutoLogin({ silent: true });
      },
      { scopes: ["user-session", "b2b-employee-session", "nhis-link"] }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, reportData, selectedPeriodKey]);

  useEmployeeReportToastEffects({
    notice,
    setNotice,
    error,
    setError,
    reportData,
    medicationStatus,
    showToast,
    lastMockNoticeKeyRef,
    lastMedicationStatusKeyRef,
  });

  async function handleFindExisting() {
    if (!validIdentity) {
      setError(
        "\uC774\uB984, \uC0DD\uB144\uC6D4\uC77C(8\uC790\uB9AC), \uD734\uB300\uD3F0 \uBC88\uD638\uB97C \uC815\uD655\uD788 \uC785\uB825\uD574 \uC8FC\uC138\uC694."
      );
      return;
    }
    beginBusy(
      "\uAE30\uC874 \uC870\uD68C \uAE30\uB85D\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694."
    );
    setError("");
    setNotice("");
    try {
      const payload = getIdentityPayload();
      const result: EmployeeSessionUpsertResponse = await upsertEmployeeSession(
        payload
      );
      if (!result.found) {
        clearLocalIdentityCache();
        resetReportState();
        setNotice(
          result.message ||
            "\uC870\uD68C \uAC00\uB2A5\uD55C \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uCE74\uCE74\uC624 \uC778\uC99D \uD6C4 \uC5F0\uB3D9\uC744 \uC9C4\uD589\uD574 \uC8FC\uC138\uC694."
        );
        return;
      }
      saveStoredIdentity(payload);
      setStoredIdentitySource("v2");
      emitB2bSessionSync("employee-report-find-existing");
      if (!result.hasReport) {
        resetReportState();
        setSyncNextAction("init");
        setSyncGuidance(null);
        setPendingSignForceRefresh(false);
        setNotice(
          result.message ||
            "\uC800\uC7A5\uB41C \uB9AC\uD3EC\uD2B8\uAC00 \uC5C6\uC5B4 \uB2E4\uC2DC \uC778\uC99D \uD6C4 \uC5F0\uB3D9\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
        );
        return;
      }
      setNotice(
        "\uAE30\uC874 \uB9AC\uD3EC\uD2B8\uB97C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4."
      );
      setSyncNextAction(null);
      setSyncGuidance(null);
      setPendingSignForceRefresh(false);
      await loadReport();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "\uAE30\uC874 \uC815\uBCF4 \uC870\uD68C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
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
    const result: EmployeeSessionUpsertResponse = await upsertEmployeeSession(
      payload
    );
    if (!result.found) {
      clearLocalIdentityCache();
      resetReportState();
      if (options?.showNotFoundNotice) {
        setNotice(
          result.message ||
            "\uC870\uD68C \uAC00\uB2A5\uD55C \uAE30\uB85D\uC774 \uC5C6\uC5B4 \uCE74\uCE74\uC624 \uC778\uC99D \uD6C4 \uC5F0\uB3D9\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
        );
      }
      return false;
    }

    saveStoredIdentity(payload);
    setStoredIdentitySource("v2");
    emitB2bSessionSync("employee-report-try-load-existing");
    if (!result.hasReport) {
      resetReportState();
      setSyncNextAction("init");
      setSyncGuidance(null);
      setPendingSignForceRefresh(false);
      if (options?.showNotFoundNotice) {
        setNotice(
          result.message ||
            "\uC800\uC7A5\uB41C \uB9AC\uD3EC\uD2B8\uAC00 \uC5C6\uC5B4 \uB2E4\uC2DC \uC778\uC99D \uD6C4 \uC5F0\uB3D9\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
        );
      }
      return false;
    }
    setSyncNextAction(null);
    setSyncGuidance(null);
    setPendingSignForceRefresh(false);
    await loadReport();
    setNotice(
      options?.successNotice ||
        "\uAE30\uC874 \uB9AC\uD3EC\uD2B8\uB97C \uBD88\uB7EC\uC654\uC5B4\uC694."
    );
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
    setHasAuthAttempt(true);
    beginBusy("카카오톡으로 인증 요청을 보내고 있어요.");
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
        emitB2bSessionSync("employee-report-restart-ready");
        emitNhisSync("employee-report-restart-ready");
        setPendingSignForceRefresh(false);
        setNotice(
          "건강정보 연동이 완료되었습니다. 이어서 설문을 진행해 주세요."
        );
        return;
      }

      setSyncNextAction("sign");
      setPendingSignForceRefresh(false);
      setSyncGuidance({
        nextAction: "sign",
        message:
          "카카오톡으로 인증을 보냈어요. 카카오톡에서 인증을 완료한 뒤 '카카오톡 인증 완료 후 확인'을 눌러 주세요.",
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        applyForceSyncCooldown(err.payload);
        const guidance = buildSyncGuidance(
          err.payload,
          err.status,
          "카카오톡 인증 요청에 실패했습니다."
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
            : "카카오톡 인증 요청에 실패했습니다."
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
    setHasAuthAttempt(true);
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
      setStoredIdentitySource("none");
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
      "카카오톡으로 인증을 보냈어요. 카카오톡에서 인증을 완료한 뒤 '카카오톡 인증 완료 후 확인'을 눌러 주세요.";

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
            ? "강제 재조회로 국민건강보험공단 데이터를 불러오고 있어요."
            : "국민건강보험공단 데이터를 불러오고 있어요.",
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

      setNotice(
        resolveSyncCompletionNotice({
          sync: syncResult.sync,
          forceRefresh,
          authReused: ready.reused,
        })
      );
      emitB2bSessionSync("employee-report-sync-success");
      emitNhisSync("employee-report-sync-success");
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
          err instanceof Error ? err.message : "데이터 연동에 실패했습니다."
        );
      }
    } finally {
      endBusy();
    }
  }

  async function handleDownloadPdf() {
    if (!reportData?.report?.id) return;

    beginBusy("PDF 파일을 생성하고 있어요.");
    setError("");
    setNotice("");

    try {
      const result = await downloadEmployeeReportPdf({
        reportData,
        selectedPeriodKey,
        captureTarget: webReportCaptureRef.current,
        updateBusy,
      });
      if (result.ok) {
        setNotice(result.notice);
      } else {
        setError(result.error);
      }
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
      const result = await downloadEmployeeReportLegacyPdf({
        reportData,
        selectedPeriodKey,
      });
      if (result.ok) {
        setNotice(result.notice);
      } else {
        setError(result.error);
      }
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
      clearLocalIdentityCache();
      setReportData(null);
      setSelectedPeriodKey("");
      setSyncNextAction(null);
      setSyncGuidance(null);
      setPendingSignForceRefresh(false);
      setForceConfirmOpen(false);
      setForceConfirmText("");
      setForceConfirmChecked(false);
      emitB2bSessionSync("employee-report-logout");
      emitNhisSync("employee-report-logout");
      setNotice("현재 연결된 조회 세션을 해제했습니다.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "세션 해제에 실패했습니다."
      );
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
      setError(
        err instanceof Error ? err.message : "선택한 기간 조회에 실패했습니다."
      );
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
        title={
          busyMessage ||
          "\uC791\uC5C5\uC744 \uCC98\uB9AC\uD558\uACE0 \uC788\uC5B4\uC694."
        }
        description={overlayDescription}
        detailLines={overlayDetailLines}
        elapsedSec={busyElapsedSec}
        position="top"
      />
      <div
        className={`${styles.page} ${styles.pageNoBg} ${styles.compactPage} ${styles.stack}`}
      >
        <header className={styles.heroCard}>
          <p className={styles.kicker}>EMPLOYEE REPORT</p>
          <h1 className={styles.title}>임직원 건강 레포트</h1>
          <p className={styles.description}>
            본인 확인을 마치면 선택한 기간의 건강 레포트를 바로 조회할 수
            있어요.
          </p>
          <div className={styles.statusRow}>
            {reportData?.report ? (
              <span className={styles.statusOn}>레포트 준비 완료</span>
            ) : (
              <span className={styles.statusOff}>본인 확인 필요</span>
            )}
            {selectedPeriodKey ? (
              <span className={styles.pill}>{selectedPeriodKey}</span>
            ) : null}
          </div>
        </header>

        {!reportData ? (
          <>
            <EmployeeReportIdentitySection
              identity={identity}
              busy={busy}
              showSignAction={!syncGuidance && syncNextAction === "sign"}
              primaryActionLabel={identityPrimaryActionLabel}
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
              onSignAndSync={() =>
                void handleSignAndSync(pendingSignForceRefresh)
              }
              onFindExisting={handleFindExisting}
            />

            {syncGuidance ? (
              <EmployeeReportSyncGuidanceNotice
                guidance={syncGuidance}
                busy={busy}
                showActions
                onRestartAuth={handleRestartAuth}
                onSignAndSync={() =>
                  void handleSignAndSync(pendingSignForceRefresh)
                }
              />
            ) : null}
          </>
        ) : null}

        {reportData?.report ? (
          <>
            <EmployeeReportSummaryHeaderCard
              reportData={reportData}
              selectedPeriodKey={selectedPeriodKey}
              periodOptions={periodOptions}
              busy={busy}
              syncNextAction={syncNextAction}
              primarySyncActionLabel="최신 정보 확인"
              canUseForceSync={canUseForceSync}
              forceSyncRemainingSec={forceSyncRemainingSec}
              onPeriodChange={(next) => {
                void handleChangePeriod(next);
              }}
              onDownloadPdf={handleDownloadPdf}
              onDownloadLegacyPdf={handleDownloadLegacyPdf}
              onRestartAuth={handleRestartAuth}
              onSignAndSync={() =>
                void handleSignAndSync(pendingSignForceRefresh)
              }
              onLogout={handleLogout}
              onOpenForceSync={() => setForceConfirmOpen(true)}
            />
            {syncGuidance ? (
              <EmployeeReportSyncGuidanceNotice
                guidance={syncGuidance}
                busy={busy}
                showActions
                onRestartAuth={handleRestartAuth}
                onSignAndSync={() =>
                  void handleSignAndSync(pendingSignForceRefresh)
                }
              />
            ) : null}

            {/* New default: web-first report + capture PDF */}
            <section className={styles.reportCanvas}>
              <div className={styles.reportCanvasHeader}>
                <div>
                  <h3>레포트 본문 미리보기</h3>
                  <p>
                    화면에서 보는 웹 레포트를 그대로 캡처해 PDF로 저장합니다.
                  </p>
                </div>
                <span className={styles.statusOn}>웹/PDF 동일 레이아웃</span>
              </div>
              <div
                className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}
              >
                <div
                  ref={webReportCaptureRef}
                  className={styles.reportCaptureSurface}
                  data-testid="report-capture-surface"
                  data-report-pdf-parity="1"
                >
                  <ReportSummaryCards
                    payload={reportData.report.payload}
                    viewerMode="employee"
                  />
                </div>
              </div>
            </section>
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
