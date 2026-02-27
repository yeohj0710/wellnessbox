"use client";

import { useEffect, useMemo, useState } from "react";
import {
  sendEmailOtpRequest,
  verifyEmailOtpRequest,
} from "@/lib/client/me-account-api";

type UseEmailChangeModalStateParams = {
  open: boolean;
  initialEmail?: string;
  onClose: () => void;
  onChanged: (email: string) => void;
};

function isEmailValid(value: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim()) && value.trim().length <= 120;
}

export function useEmailChangeModalState({
  open,
  initialEmail,
  onClose,
  onChanged,
}: UseEmailChangeModalStateParams) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const busy = useMemo(() => sendLoading || verifyLoading, [sendLoading, verifyLoading]);
  const cooldownRemaining = useMemo(
    () => (cooldownEndsAt ? Math.max(0, cooldownEndsAt - now) : 0),
    [cooldownEndsAt, now]
  );
  const sendDisabled = useMemo(
    () => !isEmailValid(email) || busy || cooldownRemaining > 0,
    [busy, cooldownRemaining, email]
  );
  const verifyDisabled = useMemo(
    () => busy || !otpSent || code.trim().length === 0,
    [busy, code, otpSent]
  );

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, open]);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail ?? "");
    setCode("");
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);
    setOtpSent(false);
    setCooldownEndsAt(null);
  }, [initialEmail, open]);

  const handleSend = async () => {
    if (sendDisabled) return;

    setSendLoading(true);
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);

    try {
      const result = await sendEmailOtpRequest(email);
      const data = result.data;
      if (!result.ok) {
        setSendError(data?.error || "인증번호 발송에 실패했어요.");
        return;
      }

      setOtpSent(true);
      setStatusMessage("인증번호를 전송했어요. 메일함을 확인해 주세요.");
      setCooldownEndsAt(Date.now() + 60_000);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : String(error));
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyDisabled) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setSendError(null);
    setStatusMessage(null);

    try {
      const result = await verifyEmailOtpRequest(email, code);
      const data = result.data;
      if (!result.ok || !data.email) {
        setVerifyError(data?.error || "이메일 인증에 실패했어요.");
        return;
      }

      onChanged(data.email);
      setStatusMessage("이메일이 변경되었어요.");
      setOtpSent(false);
      setCode("");
      onClose();
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setVerifyLoading(false);
    }
  };

  return {
    email,
    code,
    sendLoading,
    verifyLoading,
    sendError,
    verifyError,
    statusMessage,
    otpSent,
    busy,
    cooldownRemaining,
    sendDisabled,
    verifyDisabled,
    setEmail,
    setCode,
    handleSend,
    handleVerify,
  };
}
