"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { IdentityInput } from "./client-types";
import { normalizeDigits } from "./client-utils.identity";

type UseEmployeeReportPageHandlersInput = {
  busy: boolean;
  pendingSignForceRefresh: boolean;
  setIdentity: Dispatch<SetStateAction<IdentityInput>>;
  setForceConfirmOpen: (next: boolean) => void;
  setForceConfirmText: (next: string) => void;
  setForceConfirmChecked: (next: boolean) => void;
  handleSignAndSync: (forceRefresh?: boolean) => Promise<void>;
};

export function useEmployeeReportPageHandlers({
  busy,
  pendingSignForceRefresh,
  setIdentity,
  setForceConfirmOpen,
  setForceConfirmText,
  setForceConfirmChecked,
  handleSignAndSync,
}: UseEmployeeReportPageHandlersInput) {
  const handleIdentityNameChange = useCallback(
    (value: string) => {
      setIdentity((prev) => ({ ...prev, name: value }));
    },
    [setIdentity]
  );

  const handleIdentityBirthDateChange = useCallback(
    (value: string) => {
      setIdentity((prev) => ({
        ...prev,
        birthDate: normalizeDigits(value).slice(0, 8),
      }));
    },
    [setIdentity]
  );

  const handleIdentityPhoneChange = useCallback(
    (value: string) => {
      setIdentity((prev) => ({
        ...prev,
        phone: normalizeDigits(value).slice(0, 11),
      }));
    },
    [setIdentity]
  );

  const resetForceConfirmDialog = useCallback(() => {
    setForceConfirmOpen(false);
    setForceConfirmText("");
    setForceConfirmChecked(false);
  }, [setForceConfirmChecked, setForceConfirmOpen, setForceConfirmText]);

  const handleContinueSync = useCallback(() => {
    void handleSignAndSync(pendingSignForceRefresh);
  }, [handleSignAndSync, pendingSignForceRefresh]);

  const closeForceConfirmDialog = useCallback(() => {
    if (busy) return;
    resetForceConfirmDialog();
  }, [busy, resetForceConfirmDialog]);

  const confirmForceSync = useCallback(() => {
    resetForceConfirmDialog();
    void handleSignAndSync(true);
  }, [handleSignAndSync, resetForceConfirmDialog]);

  return {
    handleIdentityNameChange,
    handleIdentityBirthDateChange,
    handleIdentityPhoneChange,
    handleContinueSync,
    closeForceConfirmDialog,
    confirmForceSync,
  };
}
