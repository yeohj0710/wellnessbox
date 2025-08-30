"use client";

import { useState, useEffect } from "react";
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
  useEffect(() => {
    setLocal({ ...(profile || {}) });
  }, [profile]);
  function set<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    setLocal((p) => ({ ...(p || {}), [k]: v }));
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="font-semibold text-slate-800">프로필 설정</div>
          <button
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInput
            label="이름"
            placeholder="홍길동"
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
          <LabeledChips
            label="복용 중인 약"
            placeholder="ex) 메트포르민"
            values={local.medications || []}
            onChange={(vals) => set("medications", vals)}
          />
          <LabeledChips
            label="질환/증상"
            placeholder="ex) 고혈압"
            values={local.conditions || []}
            onChange={(vals) => set("conditions", vals)}
          />
          <LabeledChips
            label="알레르기"
            placeholder="ex) 갑각류"
            values={local.allergies || []}
            onChange={(vals) => set("allergies", vals)}
          />
          <LabeledChips
            label="목표"
            placeholder="ex) 수면, 스트레스"
            values={local.goals || []}
            onChange={(vals) => set("goals", vals)}
          />
          <LabeledChips
            label="식이 제한"
            placeholder="ex) 비건, 글루텐"
            values={local.dietaryRestrictions || []}
            onChange={(vals) => set("dietaryRestrictions", vals)}
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
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            className="text-sm text-red-600 hover:text-red-700"
            onClick={() => onChange(undefined)}
          >
            초기화
          </button>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={onClose}
            >
              취소
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
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
    <label className="grid gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type={type}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
    <label className="grid gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
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
  function addChip() {
    const v = text.trim();
    if (!v) return;
    onChange([...(values || []), v]);
    setText("");
  }
  return (
    <div className="text-sm">
      <div className="text-slate-600 mb-1">{label}</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {(values || []).map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700"
          >
            {v}
            <button
              className="text-slate-500 hover:text-slate-800"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
        />
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100"
          onClick={addChip}
        >
          추가
        </button>
      </div>
    </div>
  );
}
