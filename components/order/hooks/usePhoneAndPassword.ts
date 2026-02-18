"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { resolvePhoneOtpError } from "@/lib/client/phone-otp-error";

export function usePhoneAndPassword() {
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [userContact, setUserContact] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpStatusMessage, setOtpStatusMessage] = useState<string | null>(null);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const phoneHydrated = useRef(false);

  const persistPhone = useCallback((p1: string, p2: string, p3: string) => {
    localStorage.setItem("phonePart1", p1);
    localStorage.setItem("phonePart2", p2);
    localStorage.setItem("phonePart3", p3);
    localStorage.setItem("phoneParts", JSON.stringify({ p1, p2, p3 }));
  }, []);

  const setPhonePart1Persist = useCallback(
    (v: string) => {
      setPhonePart1(v);
      persistPhone(v, phonePart2, phonePart3);
    },
    [persistPhone, phonePart2, phonePart3]
  );

  const setPhonePart2Persist = useCallback(
    (v: string) => {
      setPhonePart2(v);
      persistPhone(phonePart1, v, phonePart3);
    },
    [persistPhone, phonePart1, phonePart3]
  );

  const setPhonePart3Persist = useCallback(
    (v: string) => {
      setPhonePart3(v);
      persistPhone(phonePart1, phonePart2, v);
    },
    [persistPhone, phonePart1, phonePart2]
  );

  useEffect(() => {
    const savedParts = localStorage.getItem("phoneParts");
    const storedPhonePart1 = localStorage.getItem("phonePart1");
    const storedPhonePart2 = localStorage.getItem("phonePart2");
    const storedPhonePart3 = localStorage.getItem("phonePart3");
    const savedPassword = localStorage.getItem("password");
    if (savedParts) {
      try {
        const { p1, p2, p3 } = JSON.parse(savedParts);
        if (p1 !== undefined) setPhonePart1(p1 || "");
        if (p2 !== undefined) setPhonePart2(p2 || "");
        if (p3 !== undefined) setPhonePart3(p3 || "");
      } catch {}
    } else {
      if (storedPhonePart1) setPhonePart1(storedPhonePart1);
      if (storedPhonePart2) setPhonePart2(storedPhonePart2);
      if (storedPhonePart3) setPhonePart3(storedPhonePart3);
    }
    if (savedPassword) setPassword(savedPassword);
    if ((window as any).IMP) {
      setSdkLoaded(true);
    }
    phoneHydrated.current = true;
  }, []);

  useEffect(() => {
    const storedVerifiedPhone = localStorage.getItem("verifiedPhone");
    if (storedVerifiedPhone) {
      setVerifiedPhone(storedVerifiedPhone);
    }
  }, []);

  useEffect(() => {
    setUserContact(`${phonePart1}-${phonePart2}-${phonePart3}`);
  }, [phonePart1, phonePart2, phonePart3]);

  useEffect(() => {
    if (!phoneHydrated.current) return;
    const has = [phonePart1, phonePart2, phonePart3].some(Boolean);
    if (!has) return;
  }, [phonePart1, phonePart2, phonePart3]);

  useEffect(() => {
    localStorage.setItem("password", password);
  }, [password]);

  const normalizePhone = useCallback((input: string) => {
    const digits = input.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("82")) {
      return `0${digits.slice(2)}`;
    }
    if (digits.startsWith("0")) return digits;
    return digits;
  }, []);

  const normalizedContact = useMemo(
    () => normalizePhone(userContact),
    [normalizePhone, userContact]
  );

  const isValidPhone = useMemo(() => {
    return /^[0-9]{3}-[0-9]{4}-[0-9]{4}$/.test(userContact);
  }, [userContact]);

  const isPhoneVerified = useMemo(() => {
    return (
      Boolean(normalizedContact) &&
      Boolean(verifiedPhone) &&
      normalizedContact === verifiedPhone
    );
  }, [normalizedContact, verifiedPhone]);

  const handleSendOtp = useCallback(async () => {
    if (!isValidPhone) {
      alert("전화번호를 올바른 형식으로 입력해 주세요.");
      return;
    }

    setOtpSendLoading(true);
    setOtpErrorMessage(null);
    setOtpStatusMessage(null);

    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userContact }),
      });

      const raw = await res.text();
      let data: { ok?: boolean; error?: string; retryAfterSec?: number };

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false) {
        setOtpErrorMessage(
          resolvePhoneOtpError({
            status: res.status,
            error: data?.error,
            retryAfterSec: data?.retryAfterSec,
            fallback: "인증번호를 발송하지 못했어요.",
          })
        );
        return;
      }

      setOtpStatusMessage("인증번호를 전송했어요. 문자 메시지를 확인해 주세요.");
    } catch {
      setOtpErrorMessage("네트워크 오류로 인증번호를 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setOtpSendLoading(false);
    }
  }, [isValidPhone, userContact]);

  const handleVerifyOtp = useCallback(async () => {
    if (!normalizedContact || !isValidPhone) {
      alert("전화번호를 올바르게 입력하고 인증을 진행해 주세요.");
      return;
    }

    if (!otpCode) {
      alert("수신한 인증번호를 입력해 주세요.");
      return;
    }

    setOtpVerifyLoading(true);
    setOtpErrorMessage(null);
    setOtpStatusMessage(null);

    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userContact, code: otpCode }),
      });

      const raw = await res.text();
      let data: { ok?: boolean; error?: string; retryAfterSec?: number };

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false) {
        setVerifiedPhone(null);
        localStorage.removeItem("verifiedPhone");
        setOtpErrorMessage(
          resolvePhoneOtpError({
            status: res.status,
            error: data?.error,
            retryAfterSec: data?.retryAfterSec,
            fallback: "인증번호 확인에 실패했어요.",
          })
        );
        return;
      }

      setVerifiedPhone(normalizedContact);
      localStorage.setItem("verifiedPhone", normalizedContact);
      setOtpStatusMessage("전화번호 인증이 완료됐어요.");
      setOtpCode("");
    } catch {
      setVerifiedPhone(null);
      localStorage.removeItem("verifiedPhone");
      setOtpErrorMessage("네트워크 오류로 인증을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setOtpVerifyLoading(false);
    }
  }, [isValidPhone, normalizedContact, otpCode, userContact]);

  useEffect(() => {
    if (!normalizedContact) return;

    if (isPhoneVerified) {
      setOtpErrorMessage(null);
      setOtpStatusMessage("전화번호 인증이 완료됐어요.");
    } else if (verifiedPhone && verifiedPhone !== normalizedContact) {
      setOtpStatusMessage(null);
      setOtpErrorMessage("입력한 번호로 다시 인증이 필요해요.");
    }
  }, [isPhoneVerified, normalizedContact, verifiedPhone]);

  return {
    phonePart1,
    phonePart2,
    phonePart3,
    setPhonePart1Persist,
    setPhonePart2Persist,
    setPhonePart3Persist,
    userContact,
    password,
    setPassword,
    otpCode,
    setOtpCode,
    otpSendLoading,
    otpVerifyLoading,
    otpStatusMessage,
    otpErrorMessage,
    isValidPhone,
    isPhoneVerified,
    handleSendOtp,
    handleVerifyOtp,
    normalizedContact,
    sdkLoaded,
    setSdkLoaded,
  };
}
