"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QType,
  CState,
  initState,
  currentPair as getCurrentPair,
  selectValue,
  ensureNextQuestion,
  validateBeforeSubmit,
  toPersist,
  fromPersist,
  shouldSubmit,
  answeredCount,
  TRANSITION_MS,
  prev as algPrev,
} from "../logic/algorithm";
import { BANK } from "../data/c-bank";

export type CSectionResult = {
  catsOrdered: string[];
  scores: number[];
  percents: number[];
};

const OPTIONS = {
  yesno: [
    { value: 0, label: "아니요" },
    { value: 1, label: "예" },
  ],
  likert4: [
    { value: 0, label: "전혀 아니에요" },
    { value: 1, label: "가끔 그래요" },
    { value: 2, label: "자주 그래요" },
    { value: 3, label: "매우 그래요" },
  ],
  freq_wk4: [
    { value: 0, label: "거의 없음" },
    { value: 1, label: "주 1회" },
    { value: 2, label: "주 2회" },
    { value: 3, label: "주 3회 이상" },
  ],
} as const;

function getType(cat: string, idx: number): QType {
  return (BANK[cat]?.[idx]?.type as QType) ?? "likert4";
}

export default function CSection({
  cats,
  onSubmit,
  onProgress,
  registerPrev,
  persistKey,
  onLoadingChange,
}: {
  cats: string[];
  onSubmit: (res: CSectionResult) => void;
  onProgress?: (step: number, total: number) => void;
  registerPrev?: (fn: () => boolean) => void;
  persistKey?: string;
  onLoadingChange?: (loading: boolean, text?: string) => void;
}) {
  const initialState = () => {
    let persisted: Partial<CState> | undefined;
    if (typeof window !== "undefined" && persistKey) {
      try {
        const raw = localStorage.getItem(persistKey);
        if (raw && raw.length < 200000) {
          persisted = fromPersist(JSON.parse(raw));
        }
      } catch {}
    }
    return initState(cats, getType, persisted);
  };

  const [state, setState] = useState<CState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => cats.length * 5, [cats.join(",")]);
  const lastProgRef = useRef<{ step: number; total: number } | null>(null);
  const hydratedRef = useRef(false);

  +useEffect(() => {
    setState(initialState());
    const arm = () => {
      hydratedRef.current = true;
    };
    if (typeof queueMicrotask === "function") queueMicrotask(arm);
    else Promise.resolve().then(arm);
  }, [cats.join(","), persistKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !persistKey) return;
    if (!hydratedRef.current) return;
    try {
      const payload = JSON.stringify(toPersist(undefined, state));
      if (payload.length < 200000) {
        localStorage.setItem(persistKey, payload);
      }
    } catch {}
  }, [persistKey, state]);

  useEffect(() => {
    if (!onProgress) return;
    const total = state.cats.length * 5;
    const done = Math.max(0, Math.min(state.step, total));
    if (
      lastProgRef.current?.step === done &&
      lastProgRef.current?.total === total
    )
      return;
    lastProgRef.current = { step: done, total };
    onProgress(done, total);
  }, [state.step, state.cats.length, onProgress]);

  useEffect(() => {
    if (!registerPrev) return;
    registerPrev(() => {
      const can = stateRef.current.step > 0;
      if (can) {
        setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }));
        return true;
      }
      return false;
    });
  }, [registerPrev]);

  const pair = getCurrentPair(state);
  const cat = pair?.cat ?? cats[0];
  const qIdx = pair?.qIdx ?? 0;
  const q = BANK[cat]?.[qIdx];
  const t = (q?.type as QType) ?? getType(cat, qIdx);
  const opts = (q ? OPTIONS[t as keyof typeof OPTIONS] : []) as readonly {
    value: number;
    label: string;
  }[];

  const isActive = (v: number) =>
    !!state.filled[cat]?.[qIdx] && state.answers[cat]?.[qIdx] === v;

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const notify = useCallback(
    (flag: boolean, text?: string) => {
      if (!onLoadingChange) return;
      setTimeout(() => onLoadingChange(flag, text), 0);
    },
    [onLoadingChange]
  );

  const select = (val: number) => {
    if (!q || submitting || transitioning) return;
    setError("");
    setTransitioning(true);
    notify(true, "AI가 답변을 분석해서 다음 질문을 고를게요.");
    window.setTimeout(
      () => {
        setTransitioning(false);
        notify(false);
        const { state: nextState, finished } = selectValue(
          stateRef.current,
          getType,
          val
        );
        const canSubmit = finished || shouldSubmit(nextState);
        if (canSubmit) {
          const v = validateBeforeSubmit(nextState, getType);
          if (v.ok) {
            setState(nextState);
            submit(nextState);
          } else {
            setError("답변 값이 범위를 벗어났어요.");
            setState(
              ensureNextQuestion(
                {
                  ...nextState,
                  plan: [...nextState.plan, v.focus],
                  step: Math.max(0, nextState.step),
                },
                getType
              )
            );
          }
        } else {
          setState(ensureNextQuestion(nextState, getType));
        }
      },
      typeof TRANSITION_MS === "number" ? TRANSITION_MS : 0
    );
  };

  function normalizeByType(t: QType, v: number): number {
    if (t === "yesno") return v;
    return v / 3;
  }

  const submit = async (s: CState) => {
    if (submitting) return;
    setSubmitting(true);
    notify(true, "AI가 최종 결과를 추론하고 있어요.");
    setError("");
    try {
      const answersNorm = s.cats.map((c) =>
        s.answers[c].map((v, i) => normalizeByType(getType(c, i), v))
      );
      const payload = {
        cats: s.cats,
        answers: answersNorm,
      };
      const res = await fetch("/api/c-section-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "서버와 통신 중 오류가 발생했어요.");
      }
      const data = (await res.json()) as CSectionResult;

      if (typeof window !== "undefined" && persistKey) {
        try {
          const answered = answeredCount(s.filled);
          const lastStep = Math.max(0, answered - 1);
          const bookmarkState = { ...s, step: lastStep };
          const payload = JSON.stringify(toPersist(undefined, bookmarkState));
          localStorage.setItem(persistKey, payload);
        } catch {}
      }

      onSubmit(data);
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
      notify(false);
    }
  };

  return (
    <div className="relative">
      {!onLoadingChange && submitting && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm sm:rounded-3xl">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot"
              style={{ animationDelay: "240ms" }}
            />
          </div>
          <p className="mt-4 px-4 text-center text-slate-700 font-medium">
            결과 계산 중
          </p>
          <style jsx>{`
            .dot {
              animation: dot 1.2s ease-in-out infinite;
              will-change: opacity, transform;
            }
            @keyframes dot {
              0%,
              20% {
                opacity: 0.35;
                transform: scale(0.92);
              }
              50% {
                opacity: 1;
                transform: scale(1);
              }
              80%,
              100% {
                opacity: 0.35;
                transform: scale(0.92);
              }
            }
          `}</style>
        </div>
      )}
      {!onLoadingChange && transitioning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm sm:rounded-3xl">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot"
              style={{ animationDelay: "240ms" }}
            />
          </div>
          <p className="mt-4 px-4 text-center text-slate-700 font-medium">
            AI가 답변을 분석해서 다음 질문을 고를게요.
          </p>
          <style jsx>{`
            .dot {
              animation: dot 1.2s ease-in-out infinite;
              will-change: opacity, transform;
            }
            @keyframes dot {
              0%,
              20% {
                opacity: 0.35;
                transform: scale(0.92);
              }
              50% {
                opacity: 1;
                transform: scale(1);
              }
              80%,
              100% {
                opacity: 0.35;
                transform: scale(0.92);
              }
            }
          `}</style>
        </div>
      )}

      <h2 className="mt-6 text-xl font-bold text-gray-900">{q?.prompt}</h2>

      <div
        className={[
          "mt-6 grid gap-2",
          opts.length === 1
            ? "grid-cols-1"
            : opts.length === 2
            ? "grid-cols-2 sm:grid-cols-2"
            : opts.length === 3
            ? "grid-cols-2 sm:grid-cols-3"
            : opts.length === 4
            ? "grid-cols-2 sm:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3",
        ].join(" ")}
      >
        {opts.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            className={[
              "rounded-xl border p-3 text-sm transition-colors flex items-center justify-center text-center whitespace-normal leading-tight min-h-[44px]",
              "[-webkit-tap-highlight-color:transparent] touch-manipulation select-none active:bg-white",
              transitioning || submitting
                ? "border-gray-200 bg-white opacity-60 pointer-events-none"
                : isActive(opt.value)
                ? "border-sky-300 bg-sky-50 ring-2 ring-sky-400"
                : "border-gray-200 bg-white supports-[hover:hover]:hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.98]",
            ].join(" ")}
            disabled={transitioning || submitting}
            aria-disabled={transitioning || submitting}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <p className="mt-8 text-xs leading-none text-gray-400">
        중간에 나가도 진행 상황이 저장돼요.
      </p>
    </div>
  );
}
