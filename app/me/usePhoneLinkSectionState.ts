"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePhoneOtpError } from "@/lib/client/phone-otp-error";
import { linkPhoneRequest, sendPhoneOtpRequest } from "@/lib/client/phone-api";
import { formatPhoneDisplay } from "@/lib/client/phone-format";

type UsePhoneLinkSectionStateParams = {
  initialPhone?: string;
  initialLinkedAt?: string;
  onLinked?: (phone: string, linkedAt?: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

function normalizePhoneDigits(value?: string) {
  return (value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function usePhoneLinkSectionState({
  initialPhone,
  initialLinkedAt,
  onLinked,
  onBusyChange,
}: UsePhoneLinkSectionStateParams) {
  const [phoneDigits, setPhoneDigits] = useState(() =>
    normalizePhoneDigits(initialPhone)
  );
  const [code, setCode] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLocked, setPhoneLocked] = useState(Boolean(initialPhone));

  const normalizedPhone = phoneDigits;
  const phoneDisplay = useMemo(
    () => formatPhoneDisplay(phoneDigits),
    [phoneDigits]
  );

  const isPhoneValid = useMemo(
    () => normalizedPhone.length >= 9 && normalizedPhone.length <= 11,
    [normalizedPhone.length]
  );
  const busy = sendLoading || verifyLoading;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    setPhoneDigits(normalizePhoneDigits(initialPhone));
    setCode("");
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);
    setOtpSent(false);
    setPhoneLocked(Boolean(initialPhone));
  }, [initialPhone, initialLinkedAt]);

  const handlePhoneChange = useCallback((value: string) => {
    setPhoneDigits(value.replace(/\D/g, "").slice(0, 11));
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!isPhoneValid || busy) return;

    setSendLoading(true);
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);

    try {
      const result = await sendPhoneOtpRequest(normalizedPhone);
      if (!result.ok) {
        setSendError(
          resolvePhoneOtpError({
            status: result.status,
            error: result.data?.error,
            retryAfterSec: result.data?.retryAfterSec,
            fallback: "인증번호 발송에 실패했어요.",
          })
        );
        return;
      }

      setOtpSent(true);
      setPhoneLocked(true);
      setStatusMessage("인증번호를 전송했어요. 문자 메시지를 확인해 주세요.");
    } catch {
      setSendError("네트워크 오류로 인증번호를 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSendLoading(false);
    }
  }, [busy, isPhoneValid, normalizedPhone]);

  const handleVerify = useCallback(async () => {
    if (!isPhoneValid || code.length === 0 || busy) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setSendError(null);
    setStatusMessage(null);

    try {
      const result = await linkPhoneRequest(normalizedPhone, code);
      if (!result.ok || !result.data.phone) {
        setVerifyError(
          resolvePhoneOtpError({
            status: result.status,
            error: result.data?.error,
            retryAfterSec: result.data?.retryAfterSec,
            fallback: "전화번호 인증에 실패했어요.",
          })
        );
        return;
      }

      onLinked?.(result.data.phone, result.data.linkedAt);
      setCode("");
      setStatusMessage("전화번호 인증이 완료됐어요.");
    } catch {
      setVerifyError("네트워크 오류로 인증을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setVerifyLoading(false);
    }
  }, [busy, code, isPhoneValid, normalizedPhone, onLinked]);

  const handleEditPhone = useCallback(() => {
    if (busy) return;
    setPhoneLocked(false);
    setOtpSent(false);
    setCode("");
    setStatusMessage(null);
    setSendError(null);
    setVerifyError(null);
  }, [busy]);

  const sendDisabled = useMemo(() => busy || !isPhoneValid, [busy, isPhoneValid]);
  const verifyDisabled = useMemo(
    () => busy || !isPhoneValid || code.length === 0 || !otpSent,
    [busy, code.length, isPhoneValid, otpSent]
  );

  return {
    phoneDisplay,
    code,
    sendLoading,
    verifyLoading,
    sendError,
    verifyError,
    statusMessage,
    otpSent,
    phoneLocked,
    busy,
    sendDisabled,
    verifyDisabled,
    handlePhoneChange,
    handleCodeChange,
    handleSendOtp,
    handleVerify,
    handleEditPhone,
  };
}
