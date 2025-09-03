"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { UserProfile } from "@/types/chat";

export default function ProfileModal({
  profile,
  onClose,
  onChange,
}: {
  profile?: UserProfile;
  onClose: () => void;
  onChange: (p?: UserProfile) => void;
}) {
  const [local, setLocal] = useState<UserProfile>({ ...(profile || {}) });
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setLocal({ ...(profile || {}) });
  }, [profile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmReset) setConfirmReset(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmReset, onClose]);

  function set<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    setLocal((p) => ({ ...(p || {}), [k]: v }));
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-[min(100vw-32px,700px)] max-h-[88dvh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-5">
          <div className="text-lg font-semibold text-slate-900">
            프로필 설정
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput
              label="이름"
              placeholder="김웰니"
              value={local.name || ""}
              onChange={(v) => set("name", v)}
            />
            <LabeledInput
              label="나이"
              type="number"
              placeholder="34"
              value={local.age?.toString() || ""}
              onChange={(v) => set("age", v ? Number(v) : undefined)}
            />
            <LabeledSelect
              label="성별"
              value={local.sex || ""}
              onChange={(v) => set("sex", v as any)}
              options={[
                { label: "선택 안함", value: "" },
                { label: "남성", value: "male" },
                { label: "여성", value: "female" },
                { label: "기타", value: "other" },
              ]}
            />
            <LabeledInput
              label="키(cm)"
              type="number"
              placeholder="170"
              value={local.heightCm?.toString() || ""}
              onChange={(v) => set("heightCm", v ? Number(v) : undefined)}
            />
            <LabeledInput
              label="몸무게(kg)"
              type="number"
              placeholder="65"
              value={local.weightKg?.toString() || ""}
              onChange={(v) => set("weightKg", v ? Number(v) : undefined)}
            />
            <LabeledSelect
              label="임신/수유"
              value={
                local.pregnantOrBreastfeeding
                  ? "yes"
                  : local.pregnantOrBreastfeeding === false
                  ? "no"
                  : ""
              }
              onChange={(v) =>
                set(
                  "pregnantOrBreastfeeding",
                  v === "yes" ? true : v === "no" ? false : undefined
                )
              }
              options={[
                { label: "선택 안함", value: "" },
                { label: "예", value: "yes" },
                { label: "아니오", value: "no" },
              ]}
            />
            <LabeledSelect
              label="카페인 민감"
              value={
                local.caffeineSensitivity
                  ? "yes"
                  : local.caffeineSensitivity === false
                  ? "no"
                  : ""
              }
              onChange={(v) =>
                set(
                  "caffeineSensitivity",
                  v === "yes" ? true : v === "no" ? false : undefined
                )
              }
              options={[
                { label: "선택 안함", value: "" },
                { label: "예", value: "yes" },
                { label: "아니오", value: "no" },
              ]}
            />
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledChips
                label="복용 중인 약"
                placeholder="예: 메트포르민"
                values={local.medications || []}
                onChange={(vals) => set("medications", vals)}
              />
              <LabeledChips
                label="질환/증상"
                placeholder="예: 고혈압"
                values={local.conditions || []}
                onChange={(vals) => set("conditions", vals)}
              />
              <LabeledChips
                label="알레르기"
                placeholder="예: 갑각류"
                values={local.allergies || []}
                onChange={(vals) => set("allergies", vals)}
              />
              <LabeledChips
                label="목표"
                placeholder="예: 수면, 스트레스"
                values={local.goals || []}
                onChange={(vals) => set("goals", vals)}
              />
              <LabeledChips
                label="식이 제한"
                placeholder="예: 채식, 글루텐"
                values={local.dietaryRestrictions || []}
                onChange={(vals) => set("dietaryRestrictions", vals)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              className="text-sm text-rose-600 hover:text-rose-700"
              onClick={() => setConfirmReset(true)}
            >
              초기화
            </button>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={onClose}
              >
                취소
              </button>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90 active:opacity-95"
                onClick={() => {
                  onChange(local);
                  onClose();
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmReset && (
        <div
          className="absolute inset-0 z-[60] grid place-items-center p-4"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="w-[min(100%,420px)] rounded-2xl bg-white shadow-xl border border-slate-200 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-slate-900">
              초기화하시겠어요?
            </div>
            <p className="mt-2 text-sm text-slate-600">
              입력한 프로필 정보가 모두 삭제됩니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmReset(false)}
              >
                취소
              </button>
              <button
                className="rounded-full bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
                onClick={() => {
                  onChange(undefined);
                  setConfirmReset(false);
                }}
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type={type}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        inputMode={type === "number" ? "numeric" : undefined}
        maxLength={type === "number" ? undefined : 64}
      />
    </label>
  );
}

function LabeledChips({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const MAX_CHIP_LEN = 40;
  function addChip() {
    const v = text.trim().slice(0, MAX_CHIP_LEN);
    if (!v) return;
    onChange([...(values || []), v]);
    setText("");
  }
  return (
    <div className="text-sm">
      <div className="text-slate-600 mb-1.5">{label}</div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHIP_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          maxLength={MAX_CHIP_LEN}
        />
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 hover:bg-slate-50"
          onClick={addChip}
        >
          추가
        </button>
      </div>
      <div className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-2 min-h-[40px] max-h-28 overflow-y-auto transform-gpu [backface-visibility:hidden] [contain:paint]">
        <div className="flex flex-wrap gap-2">
          {(values || []).map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-800"
            >
              {v}
              <button
                className="grid h-5 w-5 place-items-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                aria-label="삭제"
                title="삭제"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
