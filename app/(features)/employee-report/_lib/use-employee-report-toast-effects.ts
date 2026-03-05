"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { EmployeeReportResponse } from "./client-types";

type ToastType = "success" | "error" | "info";

type ShowToast = (message: string, options: { type: ToastType; duration: number }) => void;

type MedicationStatusNotice =
  | {
      tone: "warn" | "error";
      text: string;
    }
  | null;

export function useEmployeeReportToastEffects(input: {
  notice: string;
  setNotice: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  reportData: EmployeeReportResponse | null;
  medicationStatus: MedicationStatusNotice;
  showToast: ShowToast;
  lastMockNoticeKeyRef: MutableRefObject<string | null>;
  lastMedicationStatusKeyRef: MutableRefObject<string | null>;
}) {
  const {
    notice,
    setNotice,
    error,
    setError,
    reportData,
    medicationStatus,
    showToast,
    lastMockNoticeKeyRef,
    lastMedicationStatusKeyRef,
  } = input;

  useEffect(() => {
    const text = notice.trim();
    if (!text) return;
    showToast(text, { type: "success", duration: 3200 });
    setNotice("");
  }, [notice, setNotice, showToast]);

  useEffect(() => {
    const text = error.trim();
    if (!text) return;
    showToast(text, { type: "error", duration: 4600 });
    setError("");
  }, [error, setError, showToast]);

  useEffect(() => {
    if (!reportData?.report?.id) {
      lastMockNoticeKeyRef.current = null;
      return;
    }
    const isMock = reportData.report.payload?.meta?.isMockData === true;
    if (!isMock) return;
    const key = `${reportData.report.id}:mock`;
    if (lastMockNoticeKeyRef.current === key) return;
    lastMockNoticeKeyRef.current = key;
    showToast("현재 레포트는 데모 데이터 기반으로 생성되었습니다.", {
      type: "info",
      duration: 3600,
    });
  }, [
    reportData?.report?.id,
    reportData?.report?.payload?.meta?.isMockData,
    showToast,
    lastMockNoticeKeyRef,
  ]);

  useEffect(() => {
    if (!medicationStatus?.text) return;
    const reportId = reportData?.report?.id ?? "no-report";
    const key = `${reportId}:${medicationStatus.tone}:${medicationStatus.text}`;
    if (lastMedicationStatusKeyRef.current === key) return;
    lastMedicationStatusKeyRef.current = key;
    showToast(medicationStatus.text, {
      type: medicationStatus.tone === "error" ? "error" : "info",
      duration: medicationStatus.tone === "error" ? 5000 : 3400,
    });
  }, [
    medicationStatus,
    reportData?.report?.id,
    showToast,
    lastMedicationStatusKeyRef,
  ]);
}
