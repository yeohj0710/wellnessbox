"use client";

import axios from "axios";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { formatPhoneDisplay } from "../utils/formatPhoneDisplay";
import { LookupConfig } from "../types";

const LOCAL_STORAGE_KEYS = {
  phonePart1: "my-orders-phonePart1",
  phonePart2: "my-orders-phonePart2",
  phonePart3: "my-orders-phonePart3",
  password: "my-orders-password",
};

interface UseManualLookupFormParams {
  onLookupSuccess: (config: LookupConfig) => void;
}

export function useManualLookupForm({ onLookupSuccess }: UseManualLookupFormParams) {
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    setPhonePart1(localStorage.getItem(LOCAL_STORAGE_KEYS.phonePart1) || "010");
    setPhonePart2(localStorage.getItem(LOCAL_STORAGE_KEYS.phonePart2) || "");
    setPhonePart3(localStorage.getItem(LOCAL_STORAGE_KEYS.phonePart3) || "");
    setPassword(localStorage.getItem(LOCAL_STORAGE_KEYS.password) || "");
  }, []);

  const manualPhone = useMemo(
    () => `${phonePart1}-${phonePart2}-${phonePart3}`,
    [phonePart1, phonePart2, phonePart3]
  );

  const manualPhoneDisplay = useMemo(
    () => formatPhoneDisplay(manualPhone),
    [manualPhone]
  );

  const updatePhonePart1 = useCallback((value: string) => {
    setPhonePart1(value);
    localStorage.setItem(LOCAL_STORAGE_KEYS.phonePart1, value);
  }, []);

  const updatePhonePart2 = useCallback((value: string) => {
    setPhonePart2(value);
    localStorage.setItem(LOCAL_STORAGE_KEYS.phonePart2, value);
  }, []);

  const updatePhonePart3 = useCallback((value: string) => {
    setPhonePart3(value);
    localStorage.setItem(LOCAL_STORAGE_KEYS.phonePart3, value);
  }, []);

  const updatePassword = useCallback((value: string) => {
    setPassword(value);
    localStorage.setItem(LOCAL_STORAGE_KEYS.password, value);
  }, []);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const handleManualLookup = useCallback(async () => {
    if (loading) return;

    if (!phonePart2 || !phonePart3 || !password) {
      setError("전화번호와 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.post("/api/orders-by-phone", {
        phone: manualPhone,
        password,
      });

      if (response.data.isOrderExists) {
        onLookupSuccess({
          phone: manualPhone,
          password,
          mode: "phone-password",
        });
      } else {
        setError("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "주문 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [loading, manualPhone, onLookupSuccess, password, phonePart2, phonePart3]);

  const onSubmitManual = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      handleManualLookup();
    },
    [handleManualLookup]
  );

  return {
    phonePart1,
    phonePart2,
    phonePart3,
    password,
    showPw,
    setShowPw,
    loading,
    error,
    manualPhoneDisplay,
    updatePhonePart1,
    updatePhonePart2,
    updatePhonePart3,
    updatePassword,
    onSubmitManual,
    clearError,
  };
}
