"use client";

import { useRef, useState } from "react";
import type {
  EmployeeReportResponse,
  IdentityInput,
  SyncGuidance,
} from "./client-types";

export type EmployeeReportSyncNextAction = "init" | "sign" | "retry" | null;
export type EmployeeReportStoredIdentitySource =
  | "none"
  | "v2"
  | "legacy"
  | "expired"
  | "invalid";

export function useEmployeeReportPageState() {
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
  const [syncNextAction, setSyncNextAction] =
    useState<EmployeeReportSyncNextAction>(null);
  const [syncGuidance, setSyncGuidance] = useState<SyncGuidance | null>(null);
  const [pendingSignForceRefresh, setPendingSignForceRefresh] = useState(false);
  const [adminOnlyReportBlocked, setAdminOnlyReportBlocked] = useState(false);
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const [forceConfirmText, setForceConfirmText] = useState("");
  const [forceConfirmChecked, setForceConfirmChecked] = useState(false);
  const [storedIdentitySource, setStoredIdentitySource] =
    useState<EmployeeReportStoredIdentitySource>("none");
  const [hasAuthAttempt, setHasAuthAttempt] = useState(false);

  return {
    identity,
    setIdentity,
    booting,
    setBooting,
    notice,
    setNotice,
    error,
    setError,
    reportData,
    setReportData,
    selectedPeriodKey,
    setSelectedPeriodKey,
    syncNextAction,
    setSyncNextAction,
    syncGuidance,
    setSyncGuidance,
    pendingSignForceRefresh,
    setPendingSignForceRefresh,
    adminOnlyReportBlocked,
    setAdminOnlyReportBlocked,
    forceConfirmOpen,
    setForceConfirmOpen,
    forceConfirmText,
    setForceConfirmText,
    forceConfirmChecked,
    setForceConfirmChecked,
    storedIdentitySource,
    setStoredIdentitySource,
    hasAuthAttempt,
    setHasAuthAttempt,
  };
}

export function useEmployeeReportPageRefs() {
  const hasTriedStoredLogin = useRef(false);
  const lastMockNoticeKeyRef = useRef<string | null>(null);
  const lastMedicationStatusKeyRef = useRef<string | null>(null);
  const webReportCaptureRef = useRef<HTMLDivElement | null>(null);

  return {
    hasTriedStoredLogin,
    lastMockNoticeKeyRef,
    lastMedicationStatusKeyRef,
    webReportCaptureRef,
  };
}
