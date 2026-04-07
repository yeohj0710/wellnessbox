"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePhoneOtpError } from "@/lib/client/phone-otp-error";
import {
  linkPhoneRequest,
  sendPhoneOtpRequest,
  verifyPhoneOtpRequest,
} from "@/lib/client/phone-api";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import { formatPhoneDisplay } from "@/lib/client/phone-format";
import { getLoginStatus } from "@/lib/useLoginStatus";

type UsePhoneLinkSectionStateParams = {
  initialPhone?: string;
  initialLinkedAt?: string;
  onLinked?: (phone: string, linkedAt?: string) => void;
  onBusyChange?: (busy: boolean) => void;
  mode?: "link" | "verify-only";
  fallbackToVerifyOnlyOnUnauthorized?: boolean;
  isUserLoggedIn?: boolean | null;
};

export const LOGIN_REQUIRED_LINK_MESSAGE =
  "전화번호를 계정에 연결하려면 먼저 카카오 로그인해 주세요.";

function normalizePhoneDigits(value?: string) {
  return (value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function usePhoneLinkSectionState({
  initialPhone,
  initialLinkedAt,
  onLinked,
  onBusyChange,
  mode = "link",
  fallbackToVerifyOnlyOnUnauthorized = false,
  isUserLoggedIn,
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
  const linkingBlocked =
    mode === "link" &&
    fallbackToVerifyOnlyOnUnauthorized !== true &&
    isUserLoggedIn === false;

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

  const resolveVerificationMode = useCallback(async () => {
    if (mode === "verify-only") return "verify-only" as const;

    if (isUserLoggedIn === true) return "link" as const;
    if (isUserLoggedIn === false) {
      return fallbackToVerifyOnlyOnUnauthorized ? ("verify-only" as const) : null;
    }

    try {
      const latestLoginStatus = await getLoginStatus();
      if (latestLoginStatus.isUserLoggedIn) {
        return "link" as const;
      }
    } catch {
      // Keep the fallback path below for expired or unavailable sessions.
    }

    return fallbackToVerifyOnlyOnUnauthorized ? ("verify-only" as const) : null;
  }, [fallbackToVerifyOnlyOnUnauthorized, isUserLoggedIn, mode]);

  const handleSendOtp = useCallback(async () => {
    if (!isPhoneValid || busy) return;

    const effectiveMode = await resolveVerificationMode();
    if (!effectiveMode) {
      setSendError(LOGIN_REQUIRED_LINK_MESSAGE);
      setVerifyError(null);
      setStatusMessage(null);
      return;
    }

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
  }, [busy, isPhoneValid, normalizedPhone, resolveVerificationMode]);

  const handleVerify = useCallback(async () => {
    if (!isPhoneValid || code.length === 0 || busy) return;

    const effectiveMode = await resolveVerificationMode();
    if (!effectiveMode) {
      setVerifyError(LOGIN_REQUIRED_LINK_MESSAGE);
      setSendError(null);
      setStatusMessage(null);
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    setSendError(null);
    setStatusMessage(null);

    try {
      if (effectiveMode === "verify-only") {
        const result = await verifyPhoneOtpRequest(normalizedPhone, code);
        if (!result.ok) {
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

        onLinked?.(normalizedPhone);
        setCode("");
        setStatusMessage("전화번호 인증이 완료됐어요.");
        return;
      }

      const result = await linkPhoneRequest(normalizedPhone, code);
      if (
        !result.ok &&
        result.status === 401 &&
        fallbackToVerifyOnlyOnUnauthorized
      ) {
        const fallbackResult = await verifyPhoneOtpRequest(normalizedPhone, code);
        if (!fallbackResult.ok) {
          setVerifyError(
            resolvePhoneOtpError({
              status: fallbackResult.status,
              error: fallbackResult.data?.error,
              retryAfterSec: fallbackResult.data?.retryAfterSec,
              fallback: "전화번호 인증에 실패했어요.",
            })
          );
          return;
        }

        onLinked?.(normalizedPhone);
        setCode("");
        setStatusMessage("전화번호 인증이 완료됐어요.");
        return;
      }

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
      emitAuthSyncEvent({ scope: "phone-link", reason: "link" });
      setCode("");
      setStatusMessage("전화번호 인증이 완료됐어요.");
    } catch {
      setVerifyError("네트워크 오류로 인증을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setVerifyLoading(false);
    }
  }, [
    busy,
    code,
    fallbackToVerifyOnlyOnUnauthorized,
    isPhoneValid,
    normalizedPhone,
    onLinked,
    resolveVerificationMode,
  ]);

  const handleEditPhone = useCallback(() => {
    if (busy) return;
    setPhoneLocked(false);
    setOtpSent(false);
    setCode("");
    setStatusMessage(null);
    setSendError(null);
    setVerifyError(null);
  }, [busy]);

  const sendDisabled = useMemo(
    () => busy || !isPhoneValid || linkingBlocked,
    [busy, isPhoneValid, linkingBlocked]
  );
  const verifyDisabled = useMemo(
    () => busy || !isPhoneValid || code.length === 0 || !otpSent || linkingBlocked,
    [busy, code.length, isPhoneValid, linkingBlocked, otpSent]
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
    linkingBlocked,
    sendDisabled,
    verifyDisabled,
    handlePhoneChange,
    handleCodeChange,
    handleSendOtp,
    handleVerify,
    handleEditPhone,
  };
}
