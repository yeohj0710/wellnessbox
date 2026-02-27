"use client";

import { useEffect, useMemo, useState } from "react";
import { checkNicknameAvailabilityRequest } from "@/lib/client/me-account-api";

type UseNicknameChangeModalStateParams = {
  open: boolean;
  initialNickname?: string;
  onClose: () => void;
  onChanged: (nickname: string) => void;
  onSaveNickname: (nickname: string) => Promise<void>;
};

function isNicknameValid(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 60;
}

export function useNicknameChangeModalState({
  open,
  initialNickname,
  onClose,
  onChanged,
  onSaveNickname,
}: UseNicknameChangeModalStateParams) {
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  const busy = useMemo(() => checking || saving, [checking, saving]);
  const checkDisabled = useMemo(
    () => !isNicknameValid(nickname) || busy,
    [busy, nickname]
  );
  const saveDisabled = useMemo(
    () => !available || !isNicknameValid(nickname) || busy,
    [available, busy, nickname]
  );

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
    setNickname(initialNickname ?? "");
    setChecking(false);
    setSaving(false);
    setStatusMessage(null);
    setError(null);
    setAvailable(false);
  }, [initialNickname, open]);

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    setAvailable(false);
    setError(null);
    setStatusMessage(null);
  };

  const handleCheck = async () => {
    if (checkDisabled) return;

    setChecking(true);
    setStatusMessage(null);
    setError(null);
    setAvailable(false);

    try {
      const result = await checkNicknameAvailabilityRequest(nickname);
      const data = result.data;

      if (!result.ok) {
        setError(data?.error || "중복 확인에 실패했어요.");
        return;
      }

      if (data.available) {
        setAvailable(true);
        setStatusMessage("사용할 수 있는 닉네임이에요.");
      } else {
        setAvailable(false);
        setError("이미 사용 중인 닉네임이에요.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "중복 확인에 실패했어요.");
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (saveDisabled) return;

    setSaving(true);
    setError(null);
    setStatusMessage(null);

    try {
      const nextNickname = nickname.trim();
      await onSaveNickname(nextNickname);
      setStatusMessage("닉네임이 변경되었어요.");
      setAvailable(false);
      onChanged(nextNickname);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "변경에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return {
    nickname,
    checking,
    saving,
    statusMessage,
    error,
    busy,
    checkDisabled,
    saveDisabled,
    setStatusMessage,
    handleNicknameChange,
    handleCheck,
    handleSave,
  };
}
