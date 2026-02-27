"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { UserProfile } from "@/types/chat";

type SetProfileField = <K extends keyof UserProfile>(
  key: K,
  value: UserProfile[K]
) => void;

type ProfileModalFormProps = {
  local: UserProfile;
  setField: SetProfileField;
};

export function ProfileModalForm({ local, setField }: ProfileModalFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LabeledInput
        label="이름"
        placeholder="김애니"
        value={local.name || ""}
        onChange={(value) => setField("name", value)}
      />
      <LabeledInput
        label="나이"
        type="number"
        placeholder="34"
        value={local.age?.toString() || ""}
        onChange={(value) => setField("age", value ? Number(value) : undefined)}
      />
      <LabeledSelect
        label="성별"
        value={local.sex || ""}
        onChange={(value) => setField("sex", value as UserProfile["sex"])}
        options={[
          { label: "선택 안 함", value: "" },
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
        onChange={(value) =>
          setField("heightCm", value ? Number(value) : undefined)
        }
      />
      <LabeledInput
        label="몸무게(kg)"
        type="number"
        placeholder="65"
        value={local.weightKg?.toString() || ""}
        onChange={(value) =>
          setField("weightKg", value ? Number(value) : undefined)
        }
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
        onChange={(value) =>
          setField(
            "pregnantOrBreastfeeding",
            value === "yes" ? true : value === "no" ? false : undefined
          )
        }
        options={[
          { label: "선택 안 함", value: "" },
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
        onChange={(value) =>
          setField(
            "caffeineSensitivity",
            value === "yes" ? true : value === "no" ? false : undefined
          )
        }
        options={[
          { label: "선택 안 함", value: "" },
          { label: "예", value: "yes" },
          { label: "아니오", value: "no" },
        ]}
      />
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledChips
          label="복용 중인 약"
          placeholder="예: 메트포르민"
          values={local.medications || []}
          onChange={(values) => setField("medications", values)}
        />
        <LabeledChips
          label="질환/증상"
          placeholder="예: 고혈압"
          values={local.conditions || []}
          onChange={(values) => setField("conditions", values)}
        />
        <LabeledChips
          label="알레르기"
          placeholder="예: 갑각류"
          values={local.allergies || []}
          onChange={(values) => setField("allergies", values)}
        />
        <LabeledChips
          label="목표"
          placeholder="예: 수면, 스트레스"
          values={local.goals || []}
          onChange={(values) => setField("goals", values)}
        />
        <LabeledChips
          label="식이 제한"
          placeholder="예: 채식, 글루텐"
          values={local.dietaryRestrictions || []}
          onChange={(values) => setField("dietaryRestrictions", values)}
        />
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
  onChange: (value: string) => void;
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
        onChange={(event) => onChange(event.target.value)}
        inputMode={type === "number" ? "numeric" : undefined}
        maxLength={type === "number" ? undefined : 64}
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
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const maxChipLength = 40;

  const addChip = () => {
    const nextValue = text.trim().slice(0, maxChipLength);
    if (!nextValue) return;
    onChange([...(values || []), nextValue]);
    setText("");
  };

  return (
    <div className="text-sm">
      <div className="text-slate-600 mb-1.5">{label}</div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={text}
          placeholder={placeholder}
          onChange={(event) =>
            setText(event.target.value.slice(0, maxChipLength))
          }
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addChip();
          }}
          maxLength={maxChipLength}
        />
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 hover:bg-slate-50"
          onClick={addChip}
        >
          추가
        </button>
      </div>

      <div className="relative z-0 mt-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-2 min-h-[40px] max-h-28 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {(values || []).map((value, index) => (
            <span
              key={`${value}-${index}`}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-800"
            >
              {value}
              <button
                className="grid h-5 w-5 place-items-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                onClick={() =>
                  onChange(values.filter((_, itemIndex) => itemIndex !== index))
                }
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
