"use client";

import { useEffect, useMemo, useState } from "react";
import { useDraggableModal } from "@/components/common/useDraggableModal";

type ApiResponse = { ok?: boolean; error?: string; nickname?: string; available?: boolean };

type NicknameChangeModalProps = {
  open: boolean;
  onClose: () => void;
  initialNickname?: string;
  onChanged: (nickname: string) => void;
  onSaveNickname: (nickname: string) => Promise<void>;
};

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

function isNicknameValid(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 60;
}

export default function NicknameChangeModal({
  open,
  onClose,
  initialNickname,
  onChanged,
  onSaveNickname,
}: NicknameChangeModalProps) {
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  const busy = useMemo(() => checking || saving, [checking, saving]);
  const checkDisabled = useMemo(
    () => !isNicknameValid(nickname) || busy,
    [nickname, busy]
  );
  const saveDisabled = useMemo(
    () => !available || !isNicknameValid(nickname) || busy,
    [available, nickname, busy]
  );
  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(open, { resetOnOpen: true });

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (busy) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, busy]);

  useEffect(() => {
    if (!open) return;
    setNickname(initialNickname ?? "");
    setChecking(false);
    setSaving(false);
    setStatusMessage(null);
    setError(null);
    setAvailable(false);
  }, [open, initialNickname]);

  const handleCheck = async () => {
    if (checkDisabled) return;

    setChecking(true);
    setStatusMessage(null);
    setError(null);
    setAvailable(false);

    try {
      const res = await fetch("/api/me/nickname/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });

      const raw = await res.text();
      let data: ApiResponse = {};

      try {
        data = raw ? (JSON.parse(raw) as ApiResponse) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false) {
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "중복 확인에 실패했어요."
      );
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
      await onSaveNickname(nickname.trim());
      setStatusMessage("닉네임이 변경되었어요.");
      setAvailable(false);
      onChanged(nickname.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        ref={panelRef}
        style={panelStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 sm:px-7 py-5">
          <div
            className={`flex items-center justify-between gap-3 touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onPointerDown={handleDragPointerDown}
          >
            <div className="text-xl font-bold text-gray-900">닉네임 변경</div>

            <button
              type="button"
              onClick={() => {
                if (busy) return;
                onClose();
              }}
              disabled={busy}
              className="inline-flex min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              닫기
            </button>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            원하는 닉네임을 입력하고 중복 검사를 진행해 주세요.
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 sm:px-7 py-5 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">닉네임</div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={nickname}
                disabled={busy}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setAvailable(false);
                  setError(null);
                  setStatusMessage(null);
                }}
                placeholder="예: 상큼한 수달"
                maxLength={60}
                className="min-w-0 flex-1 h-10 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={handleCheck}
                disabled={checkDisabled}
                aria-busy={checking}
                className="shrink-0 w-28 h-10 rounded-lg bg-sky-100 text-sm font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
              >
                <span className="grid h-full w-full place-items-center">
                  {checking ? <Spinner className="text-sky-700" /> : "중복 검사"}
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              2~60자의 한글, 영문, 숫자를 사용할 수 있어요. 공백은 앞뒤만 제거돼요.
            </p>
          </div>

          {statusMessage ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
              {statusMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (busy) return;
                onClose();
              }}
              disabled={busy}
              className="inline-flex h-10 min-w-[96px] items-center justify-center whitespace-nowrap rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveDisabled}
              aria-busy={saving}
              className="inline-flex h-10 min-w-[120px] items-center justify-center whitespace-nowrap rounded-lg bg-sky-400 px-4 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
            >
              <span className="grid h-full w-full place-items-center">
                {saving ? <Spinner className="text-white" /> : "변경"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
