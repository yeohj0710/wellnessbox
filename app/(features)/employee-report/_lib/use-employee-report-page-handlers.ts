"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { IdentityInput } from "./client-types";
import { normalizeDigits } from "./client-utils.identity";

type UseEmployeeReportPageHandlersInput = {
  setIdentity: Dispatch<SetStateAction<IdentityInput>>;
};

export function useEmployeeReportPageHandlers({
  setIdentity,
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

  return {
    handleIdentityNameChange,
    handleIdentityBirthDateChange,
    handleIdentityPhoneChange,
  };
}
