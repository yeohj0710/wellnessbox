"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import OperationLoadingOverlay from "@/components/common/operationLoadingOverlay";
import { useToast } from "@/components/common/toastContext.client";
import styles from "@/components/b2b/B2bUx.module.css";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import EmployeeReportAdminOnlySection from "./_components/EmployeeReportAdminOnlySection";
import EmployeeReportBootSkeleton from "./_components/EmployeeReportBootSkeleton";
import EmployeeReportHeroCard from "./_components/EmployeeReportHeroCard";
import EmployeeReportInputFlowPanel from "./_components/EmployeeReportInputFlowPanel";
import EmployeeReportReadyPanel from "./_components/EmployeeReportReadyPanel";
import ForceRefreshConfirmDialog from "./_components/ForceRefreshConfirmDialog";
import type {
  EmployeeReportResponse,
  IdentityInput,
  SyncGuidance,
} from "./_lib/client-types";
import {
  clearStoredIdentity,
  isValidIdentityInput,
  normalizeDigits,
  resolveIdentityPrimaryActionLabel,
  toIdentityPayload,
} from "./_lib/client-utils.identity";
import {
  resolveMedicationStatusMessage,
} from "./_lib/client-utils.guidance";
import {
  EMPLOYEE_REPORT_ADMIN_ONLY_CODE,
  EMPLOYEE_REPORT_ADMIN_ONLY_NOTICE,
  EMPLOYEE_REPORT_ADMIN_ONLY_STATUS_LABEL,
  EMPLOYEE_REPORT_FORCE_CONFIRM_PHRASE,
} from "./_lib/employee-report-copy";
import {
  resolveEmployeeReportOverlayDescription,
  resolveEmployeeReportOverlayDetailLines,
} from "./_lib/overlay-copy";
import { useAdminLoginStatus } from "./_lib/use-admin-login-status";
import { useBusyState } from "./_lib/use-busy-state";
import { useEmployeeReportExistingRecordActions } from "./_lib/use-employee-report-existing-record-actions";
import { useEmployeeReportStateActions } from "./_lib/use-employee-report-state-actions";
import { useForceSyncCooldown } from "./_lib/use-force-sync-cooldown";
import { useEmployeeReportSessionBootstrap } from "./_lib/use-employee-report-session-bootstrap";
import { useEmployeeReportSessionEffects } from "./_lib/use-employee-report-session-effects";
import { useEmployeeReportToastEffects } from "./_lib/use-employee-report-toast-effects";
import { useEmployeeReportReportActions } from "./_lib/use-employee-report-report-actions";
import { useEmployeeReportSyncActions } from "./_lib/use-employee-report-sync-actions";
import { useEmployeeReportReportLoading } from "./_lib/use-employee-report-report-loading";

export default function EmployeeReportClient({
  initialIsAdminLoggedIn,
}: {
  initialIsAdminLoggedIn: boolean;
}) {
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
  const [adminOnlyReportBlocked, setAdminOnlyReportBlocked] = useState(false);
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
  const isAdminLoggedIn = useAdminLoginStatus(initialIsAdminLoggedIn);
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
  const {
    clearSyncFlowState,
    resetReportState,
    applyAdminOnlyBlockedState,
    applyMissingReportState,
    setPendingSignGuidance,
  } = useEmployeeReportStateActions({
    setAdminOnlyReportBlocked,
    setError,
    setNotice,
    setPendingSignForceRefresh,
    setReportData,
    setSelectedPeriodKey,
    setSyncGuidance,
    setSyncNextAction,
  });

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
    () =>
      forceConfirmChecked &&
      forceConfirmText.trim() === EMPLOYEE_REPORT_FORCE_CONFIRM_PHRASE,
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
  const readyReportData = reportData?.report ? reportData : null;
  const showIdentityFlow = !reportData && !adminOnlyReportBlocked;

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

  const { loadReport, syncEmployeeReport } = useEmployeeReportReportLoading({
    validIdentity,
    identityPayload,
    selectedPeriodKey,
    adminOnlyCode: EMPLOYEE_REPORT_ADMIN_ONLY_CODE,
    adminOnlyNotice: EMPLOYEE_REPORT_ADMIN_ONLY_NOTICE,
    clearLocalIdentityCache,
    applyAdminOnlyBlockedState,
    resetReportState,
    setAdminOnlyReportBlocked,
    setReportData,
    setSelectedPeriodKey,
    setError,
    setStoredIdentitySource,
    applyForceSyncCooldown,
  });

  const checkSessionAndMaybeAutoLogin = useEmployeeReportSessionBootstrap({
    adminOnlyNotice: EMPLOYEE_REPORT_ADMIN_ONLY_NOTICE,
    isAdminLoggedIn,
    hasTriedStoredLoginRef: hasTriedStoredLogin,
    setBooting,
    setError,
    setIdentity,
    setNotice,
    setStoredIdentitySource,
    loadReport,
    applyMissingReportState,
    applyAdminOnlyBlockedState,
    clearSyncFlowState,
    clearLocalIdentityCache,
    emitB2bSessionSync,
  });

  useEffect(() => {
    void checkSessionAndMaybeAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEmployeeReportSessionEffects({
    adminOnlyReportBlocked,
    busy,
    isAdminLoggedIn,
    reportData,
    selectedPeriodKey,
    hasTriedStoredLoginRef: hasTriedStoredLogin,
    loadReport,
    checkSessionAndMaybeAutoLogin,
  });

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
  const { handleFindExisting, tryLoadExistingReport } =
    useEmployeeReportExistingRecordActions({
      validIdentity,
      isAdminLoggedIn,
      adminOnlyNotice: EMPLOYEE_REPORT_ADMIN_ONLY_NOTICE,
      getIdentityPayload,
      beginBusy,
      endBusy,
      loadReport,
      setError,
      setNotice,
      setStoredIdentitySource,
      clearLocalIdentityCache,
      applyMissingReportState,
      applyAdminOnlyBlockedState,
      clearSyncFlowState,
      emitB2bSessionSync,
    });
  const {
    handleDownloadPdf,
    handleDownloadLegacyPdf,
    handleLogout,
    handleChangePeriod,
  } = useEmployeeReportReportActions({
    reportData,
    selectedPeriodKey,
    webReportCaptureRef,
    beginBusy,
    updateBusy,
    endBusy,
    loadReport,
    resetReportState,
    clearSyncFlowState,
    clearLocalIdentityCache,
    setError,
    setNotice,
    setSelectedPeriodKey,
    setForceConfirmOpen,
    setForceConfirmText,
    setForceConfirmChecked,
    emitB2bSessionSync,
    emitNhisSync,
  });

  const { handleRestartAuth, handleSignAndSync } =
    useEmployeeReportSyncActions({
      validIdentity,
      debugMode,
      canUseForceSync,
      forceSyncRemainingSec,
      pendingSignForceRefresh,
      reportData,
      getIdentityPayload,
      setHasAuthAttempt,
      setError,
      setNotice,
      setAdminOnlyReportBlocked,
      beginBusy,
      updateBusy,
      endBusy,
      clearLocalIdentityCache,
      syncEmployeeReport,
      tryLoadExistingReport,
      clearSyncFlowState,
      setPendingSignGuidance,
      applyForceSyncCooldown,
      emitB2bSessionSync,
      emitNhisSync,
    });

  function handleIdentityNameChange(value: string) {
    setIdentity((prev) => ({ ...prev, name: value }));
  }

  function handleIdentityBirthDateChange(value: string) {
    setIdentity((prev) => ({
      ...prev,
      birthDate: normalizeDigits(value).slice(0, 8),
    }));
  }

  function handleIdentityPhoneChange(value: string) {
    setIdentity((prev) => ({
      ...prev,
      phone: normalizeDigits(value).slice(0, 11),
    }));
  }

  function handleContinueSync() {
    void handleSignAndSync(pendingSignForceRefresh);
  }

  function resetForceConfirmDialog() {
    setForceConfirmOpen(false);
    setForceConfirmText("");
    setForceConfirmChecked(false);
  }

  function closeForceConfirmDialog() {
    if (busy) return;
    resetForceConfirmDialog();
  }

  function confirmForceSync() {
    resetForceConfirmDialog();
    void handleSignAndSync(true);
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
        <EmployeeReportHeroCard
          reportReady={Boolean(readyReportData)}
          adminOnlyBlocked={adminOnlyReportBlocked}
          adminOnlyStatusLabel={EMPLOYEE_REPORT_ADMIN_ONLY_STATUS_LABEL}
          selectedPeriodKey={selectedPeriodKey}
        />

        {showIdentityFlow ? (
          <EmployeeReportInputFlowPanel
            identity={identity}
            busy={busy}
            syncGuidance={syncGuidance}
            syncNextAction={syncNextAction}
            primaryActionLabel={identityPrimaryActionLabel}
            onNameChange={handleIdentityNameChange}
            onBirthDateChange={handleIdentityBirthDateChange}
            onPhoneChange={handleIdentityPhoneChange}
            onRestartAuth={handleRestartAuth}
            onSignAndSync={handleContinueSync}
            onFindExisting={handleFindExisting}
          />
        ) : null}

        {adminOnlyReportBlocked ? <EmployeeReportAdminOnlySection /> : null}

        {readyReportData ? (
          <EmployeeReportReadyPanel
            reportData={readyReportData}
            selectedPeriodKey={selectedPeriodKey}
            periodOptions={periodOptions}
            busy={busy}
            syncNextAction={syncNextAction}
            canUseForceSync={canUseForceSync}
            forceSyncRemainingSec={forceSyncRemainingSec}
            syncGuidance={syncGuidance}
            captureRef={webReportCaptureRef}
            onPeriodChange={(next) => {
              void handleChangePeriod(next);
            }}
            onDownloadPdf={handleDownloadPdf}
            onDownloadLegacyPdf={handleDownloadLegacyPdf}
            onRestartAuth={handleRestartAuth}
            onSignAndSync={handleContinueSync}
            onLogout={handleLogout}
            onOpenForceSync={() => setForceConfirmOpen(true)}
          />
        ) : null}

        <ForceRefreshConfirmDialog
          open={forceConfirmOpen}
          busy={busy}
          confirmChecked={forceConfirmChecked}
          confirmText={forceConfirmText}
          canExecuteForceSync={canExecuteForceSync}
          onConfirmCheckedChange={setForceConfirmChecked}
          onConfirmTextChange={setForceConfirmText}
          onClose={closeForceConfirmDialog}
          onConfirm={confirmForceSync}
        />
      </div>
    </div>
  );
}
