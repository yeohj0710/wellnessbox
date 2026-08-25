"use client";

import { useState } from "react";

type Phase = "BASELINE" | "FOLLOWUP";

const GOAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "sleep", label: "잠" },
  { value: "fatigue", label: "피로" },
  { value: "digestion", label: "소화" },
  { value: "immunity", label: "면역" },
  { value: "joint", label: "관절" },
  { value: "stress", label: "스트레스" },
  { value: "blood_sugar", label: "혈당" },
  { value: "other", label: "그 밖" },
];

// 목표가 달라도 같은 자로 재려면 문항이 고정되어야 한다.
// 이 세 축은 어떤 목표로 오셔도 답할 수 있게 골랐다.
const FIXED_ITEMS: Array<{ key: string; label: string; hint: string }> = [
  { key: "sleepScore", label: "요즘 잠", hint: "0은 아주 나쁨, 10은 아주 좋음" },
  { key: "digestionScore", label: "요즘 속", hint: "0은 아주 나쁨, 10은 아주 좋음" },
  { key: "energyScore", label: "요즘 기운", hint: "0은 아주 없음, 10은 아주 좋음" },
];

const labelClass = "block text-sm font-semibold text-slate-900";

function ScoreRow({
  name,
  label,
  hint,
  value,
  onChange,
}: {
  name: string;
  label: string;
  hint: string;
  value: number | null;
  onChange: (next: number) => void;
}) {
  return (
    <div className="mt-6">
      <label className={labelClass}>{label}</label>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, index) => index).map((score) => {
          const selected = value === score;
          return (
            <button
              key={`${name}-${score}`}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(score)}
              className={`h-10 w-10 rounded-xl border text-sm font-semibold transition ${
                selected
                  ? "border-sky-500 bg-sky-500 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProOutcomeForm({
  phase,
  participantToken,
}: {
  phase: Phase;
  participantToken: string;
}) {
  const [goalKey, setGoalKey] = useState("");
  const [scores, setScores] = useState<Record<string, number | null>>({
    goalScore: null,
    generalScore: null,
    sleepScore: null,
    digestionScore: null,
    energyScore: null,
  });
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isFollowup = phase === "FOLLOWUP";

  function setScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");

    if (!goalKey) {
      setError("무엇을 좋게 하고 싶으신지 골라 주세요.");
      return;
    }
    const missing = Object.entries(scores).find(([, value]) => value === null);
    if (missing) {
      setError("모든 문항에 답해 주세요.");
      return;
    }
    if (!consented) {
      setError("연구 이용에 동의해 주셔야 답변을 남길 수 있습니다.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch("/api/pro-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase,
          participantToken,
          goalKey,
          goalScore: scores.goalScore,
          generalScore: scores.generalScore,
          sleepScore: scores.sleepScore,
          digestionScore: scores.digestionScore,
          energyScore: scores.energyScore,
          daysTaken: isFollowup ? Number(form.get("daysTaken") ?? 0) : null,
          adherencePercent: isFollowup
            ? Number(form.get("adherencePercent") ?? 0)
            : null,
          note: String(form.get("note") ?? ""),
          researchConsented: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "답변을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setDone(true);
    } catch {
      setError("연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-sm font-bold text-emerald-900">답변 잘 받았습니다.</p>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          {isFollowup
            ? "두 번 다 답해 주셔서 고맙습니다. 남겨 주신 답은 제품 안내를 고치는 데 씁니다."
            : "2주 뒤에 같은 문항을 한 번 더 여쭤봅니다. 그때 답해 주시면 한 쌍이 됩니다."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <div>
        <label className={labelClass}>무엇을 좋게 하고 싶으신가요</label>
        <div className="mt-3 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((option) => {
            const selected = goalKey === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setGoalKey(option.value)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <ScoreRow
        name="goalScore"
        label={isFollowup ? "고르신 그것, 지금 어떠세요" : "고르신 그것, 지금 어떠세요"}
        hint="0은 아주 나쁨, 10은 아주 좋음"
        value={scores.goalScore}
        onChange={(value) => setScore("goalScore", value)}
      />
      <ScoreRow
        name="generalScore"
        label="몸 상태를 통틀어 보면"
        hint="0은 아주 나쁨, 10은 아주 좋음"
        value={scores.generalScore}
        onChange={(value) => setScore("generalScore", value)}
      />
      {FIXED_ITEMS.map((item) => (
        <ScoreRow
          key={item.key}
          name={item.key}
          label={item.label}
          hint={item.hint}
          value={scores[item.key]}
          onChange={(value) => setScore(item.key, value)}
        />
      ))}

      {isFollowup ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="daysTaken">
              며칠이나 드셨나요
            </label>
            <input
              id="daysTaken"
              name="daysTaken"
              type="number"
              min={0}
              max={365}
              defaultValue={14}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="adherencePercent">
              정해진 만큼 챙겨 드신 비율
            </label>
            <input
              id="adherencePercent"
              name="adherencePercent"
              type="number"
              min={0}
              max={100}
              defaultValue={100}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <label className={labelClass} htmlFor="note">
          더 하실 말씀이 있으면 적어 주세요
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={500}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm leading-6 text-slate-700">
            남긴 답을 연구에 쓰는 데 동의합니다. 이름과 연락처는 받지 않고, 답변만
            번호로 모아서 봅니다. 개인이 드러나는 형태로는 쓰지 않고, 마음이 바뀌면
            언제든 지워 달라고 하실 수 있습니다.
          </span>
        </label>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-2xl bg-sky-600 px-6 py-4 text-base font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {submitting ? "보내는 중" : "답변 남기기"}
      </button>
    </form>
  );
}
