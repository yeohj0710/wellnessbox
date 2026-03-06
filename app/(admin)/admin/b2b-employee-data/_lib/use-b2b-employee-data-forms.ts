import { useCallback, useState } from "react";
import type { EmployeeOpsResponse } from "./client-types";

const DEFAULT_PROVIDER = "HYPHEN_NHIS";
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const NON_DIGIT_PATTERN = /\D/g;

export function useB2bEmployeeDataForms() {
  const [createName, setCreateName] = useState("");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createAppUserId, setCreateAppUserId] = useState("");
  const [createProvider, setCreateProvider] = useState(DEFAULT_PROVIDER);

  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAppUserId, setEditAppUserId] = useState("");
  const [editProvider, setEditProvider] = useState(DEFAULT_PROVIDER);

  const [periodResetKey, setPeriodResetKey] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const setCreateBirthDateDigits = useCallback((value: string) => {
    setCreateBirthDate(value.replace(NON_DIGIT_PATTERN, ""));
  }, []);

  const setCreatePhoneDigits = useCallback((value: string) => {
    setCreatePhone(value.replace(NON_DIGIT_PATTERN, ""));
  }, []);

  const setEditBirthDateDigits = useCallback((value: string) => {
    setEditBirthDate(value.replace(NON_DIGIT_PATTERN, ""));
  }, []);

  const setEditPhoneDigits = useCallback((value: string) => {
    setEditPhone(value.replace(NON_DIGIT_PATTERN, ""));
  }, []);

  const hydrateEditorFromOps = useCallback((data: EmployeeOpsResponse) => {
    setEditName(data.employee.name);
    setEditBirthDate(data.employee.birthDate);
    setEditPhone(data.employee.phoneNormalized);
    setEditAppUserId(data.employee.appUserId ?? "");
    setEditProvider(data.employee.linkedProvider || DEFAULT_PROVIDER);
    setDeleteConfirmName("");
    setPeriodResetKey((prev) => {
      if (MONTH_KEY_PATTERN.test(prev)) return prev;
      return data.summary.periods[0] ?? "";
    });
  }, []);

  const resetCreateForm = useCallback(() => {
    setCreateName("");
    setCreateBirthDate("");
    setCreatePhone("");
    setCreateAppUserId("");
    setCreateProvider(DEFAULT_PROVIDER);
  }, []);

  const toCreatePayload = useCallback(
    () => ({
      name: createName.trim(),
      birthDate: createBirthDate.trim(),
      phone: createPhone.trim(),
      appUserId: createAppUserId.trim() || null,
      linkedProvider: createProvider.trim() || DEFAULT_PROVIDER,
    }),
    [createAppUserId, createBirthDate, createName, createPhone, createProvider]
  );

  const toEditPayload = useCallback(
    () => ({
      name: editName.trim(),
      birthDate: editBirthDate.trim(),
      phone: editPhone.trim(),
      appUserId: editAppUserId.trim() || null,
      linkedProvider: editProvider.trim() || DEFAULT_PROVIDER,
    }),
    [editAppUserId, editBirthDate, editName, editPhone, editProvider]
  );

  return {
    createName,
    createBirthDate,
    createPhone,
    createAppUserId,
    createProvider,
    editName,
    editBirthDate,
    editPhone,
    editAppUserId,
    editProvider,
    periodResetKey,
    deleteConfirmName,
    setCreateName,
    setCreateBirthDateDigits,
    setCreatePhoneDigits,
    setCreateAppUserId,
    setCreateProvider,
    setEditName,
    setEditBirthDateDigits,
    setEditPhoneDigits,
    setEditAppUserId,
    setEditProvider,
    setPeriodResetKey,
    setDeleteConfirmName,
    hydrateEditorFromOps,
    resetCreateForm,
    toCreatePayload,
    toEditPayload,
  };
}
