"use client";

import { useMemo } from "react";
import type { EmployeeReportResponse } from "./client-types";
import { resolveIdentityPrimaryActionLabel } from "./client-utils.identity";
import { resolveMedicationStatusMessage } from "./client-utils.guidance";
import {
  resolveEmployeeReportOverlayDescription,
  resolveEmployeeReportOverlayDetailLines,
} from "./overlay-copy";
import type { BusyHint } from "./use-busy-state";

type SyncNextAction = "init" | "sign" | "retry" | null;
type StoredIdentitySource = "none" | "v2" | "legacy" | "expired" | "invalid";

type UseEmployeeReportPageDerivedStateInput = {
  reportData: EmployeeReportResponse | null;
  selectedPeriodKey: string;
  debugMode: boolean;
  isAdminLoggedIn: boolean;
  adminOnlyReportBlocked: boolean;
  forceConfirmChecked: boolean;
  forceConfirmText: string;
  hasAuthAttempt: boolean;
  syncNextAction: SyncNextAction;
  storedIdentitySource: StoredIdentitySource;
  busyHint: BusyHint;
  busyElapsedSec: number;
  forceConfirmPhrase: string;
};

export function useEmployeeReportPageDerivedState({
  reportData,
  selectedPeriodKey,
  debugMode,
  isAdminLoggedIn,
  adminOnlyReportBlocked,
  forceConfirmChecked,
  forceConfirmText,
  hasAuthAttempt,
  syncNextAction,
  storedIdentitySource,
  busyHint,
  busyElapsedSec,
  forceConfirmPhrase,
}: UseEmployeeReportPageDerivedStateInput) {
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
      forceConfirmChecked && forceConfirmText.trim() === forceConfirmPhrase,
    [forceConfirmChecked, forceConfirmPhrase, forceConfirmText]
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

  return {
    medicationStatus,
    periodOptions,
    canUseForceSync,
    canExecuteForceSync,
    identityPrimaryActionLabel,
    overlayDescription,
    overlayDetailLines,
    readyReportData,
    showIdentityFlow,
  };
}
