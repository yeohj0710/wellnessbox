"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type InlineEditableFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  saving?: boolean;
  onSave: (value: string) => Promise<void> | void;
  maxLength?: number;
  type?: "text" | "email";
  helper?: string;
  error?: string | null;
};

export function InlineEditableField({
  label,
  value,
  placeholder,
  saving,
  onSave,
  maxLength,
  type = "text",
  helper,
  error,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setLocalError(null);

    if (draft.trim() === value.trim()) {
      setEditing(false);
      return;
    }

    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "변경을 저장하지 못했어요."
      );
    }
  }, [draft, onSave, saving, value]);

  return (
    <div className="grid grid-cols-[60px_1fr_auto] items-center gap-2 sm:grid-cols-[60px_1fr_auto] sm:gap-3">
      <div className="text-sm font-semibold text-gray-900">{label}</div>

      <div className="min-w-0 text-sm text-gray-800 flex flex-col justify-center">
        {editing ? (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(value);
              }
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none"
            placeholder={placeholder}
          />
        ) : (
          <p className={value ? "text-gray-900" : "text-gray-500"}>
            {value || placeholder || "입력 없음"}
          </p>
        )}

        {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}

        {(localError || error) && (
          <p className="mt-1 text-xs text-rose-600">{localError || error}</p>
        )}
      </div>

      <div className="flex items-center justify-end self-center">
        <button
          type="button"
          onClick={() => {
            if (editing) handleSave();
            else setEditing(true);
          }}
          disabled={!!saving}
          className="inline-flex h-6 min-w-[64px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
              저장 중
            </span>
          ) : editing ? (
            "적용"
          ) : (
            "변경"
          )}
        </button>
      </div>
    </div>
  );
}
