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
} from "../logic/algorithm";
import { BANK } from "../data/c-bank";
import { C_OPTIONS } from "../data/c-options";

export type CSectionResult = {
  catsOrdered: string[];
  scores: number[];
  percents: number[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeResultPayload(value: unknown): CSectionResult | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const catsOrderedRaw = Array.isArray(record.catsOrdered)
    ? record.catsOrdered
    : [];
  const scoresRaw = Array.isArray(record.scores) ? record.scores : [];
  const percentsRaw = Array.isArray(record.percents) ? record.percents : [];

  const catsOrdered = catsOrderedRaw.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
  const scores = scoresRaw.map((item) => (isFiniteNumber(item) ? item : 0));
  const percents = percentsRaw.map((item) => (isFiniteNumber(item) ? item : 0));

  if (!catsOrdered.length) return null;

  const normalizedPercents = percents.length
    ? percents
    : scores.map((score) => (score > 1 ? score / 100 : score));
  if (!normalizedPercents.length) return null;

  const length = Math.min(catsOrdered.length, normalizedPercents.length);
  if (length <= 0) return null;

  const normalizedScores = scores.length
    ? scores
    : normalizedPercents.map((value) => Math.round(value * 1000) / 1000);

  return {
    catsOrdered: catsOrdered.slice(0, length),
    scores: normalizedScores.slice(0, length),
    percents: normalizedPercents.slice(0, length).map((value) => {
      if (value < 0) return 0;
      if (value > 1) return 1;
      return value;
    }),
  };
}

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
  onSubmit: (res: CSectionResult, answers: Record<string, number[]>) => void;
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

  useEffect(() => {
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
    const total = stateRef.current.cats.length * 5;
    if (answeredCount(stateRef.current.filled) >= total) {
      const cur = getCurrentPair(stateRef.current);
      if (cur) {
        setState((prev) => {
          const answers = {
            ...prev.answers,
            [cur.cat]: [...prev.answers[cur.cat]],
          };
          const filled = {
            ...prev.filled,
            [cur.cat]: [...prev.filled[cur.cat]],
          };
          filled[cur.cat][cur.qIdx] = false;
          answers[cur.cat][cur.qIdx] = -1;
          return { ...prev, answers, filled };
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!registerPrev) return;
    registerPrev(() => {
      const s = stateRef.current;
      if (s.step <= 0) return false;
      const targetIdx = s.step - 1;
      setState((prev) => ({ ...prev, step: targetIdx, error: undefined }));
      return true;
    });
  }, [registerPrev]);

  const pair = getCurrentPair(state);
  const cat = pair?.cat ?? cats[0];
  const qIdx = pair?.qIdx ?? 0;
  const q = BANK[cat]?.[qIdx];
  const t = (q?.type as QType) ?? getType(cat, qIdx);
  const opts = (q ? C_OPTIONS[t as keyof typeof C_OPTIONS] : []) as readonly {
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
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
    setError("");

    const { state: previewState, finished: willFinish } = selectValue(
      stateRef.current,
      getType,
      val
    );
    const willSubmit = willFinish || shouldSubmit(previewState);

    if (willSubmit) {
      const v = validateBeforeSubmit(previewState, getType);
      if (v.ok) {
        setState(previewState);
        submit(previewState);
      } else {
        setError("답변 값이 범위를 벗어났어요.");
        setState(
          ensureNextQuestion(
            {
              ...previewState,
              plan: [...previewState.plan, v.focus],
              step: Math.max(0, previewState.step),
            },
            getType
          )
        );
      }
      return;
    }

    setTransitioning(true);
    notify(true, "AI가 답변을 분석해서 다음 질문을 고를게요.");

    window.setTimeout(
      () => {
        setTransitioning(false);
        notify(false);
        setState(ensureNextQuestion(previewState, getType));
      },
      typeof TRANSITION_MS === "number" ? TRANSITION_MS : 0
    );
  };

  const skipCurrent = () => {
    if (submitting || transitioning) return;
    select(0);
  };

  function normalizeByType(t: QType, v: number): number {
    if (t === "yesno") return v;
    return v / 3;
  }

  const submit = async (s: CState) => {
    if (submitting) return;
    setSubmitting(true);

    const MIN_SHOW_MS = 5000;
    const t0 =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();

    notify(true, "AI가 최종 결과를 추론하고 있어요.");
    setError("");

    let result: CSectionResult | null = null;

    try {
      const answersNorm = s.cats.map((c) =>
        s.answers[c].map((v, i) => normalizeByType(getType(c, i), v))
      );
      const payload = { cats: s.cats, answers: answersNorm };

      const res = await fetch("/api/c-section-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "서버와 통신 중 오류가 발생했어요.");
      }

      const resultPayload = await res.json().catch(() => null);
      const normalized = normalizeResultPayload(resultPayload);
      if (!normalized) {
        throw new Error("결과 형식이 올바르지 않아요.");
      }
      result = normalized;

      if (typeof window !== "undefined" && persistKey) {
        try {
          const answered = answeredCount(s.filled);
          const lastStep = Math.max(0, answered - 1);
          const bookmarkState = { ...s, step: lastStep };
          const payload = JSON.stringify(toPersist(undefined, bookmarkState));
          localStorage.setItem(persistKey, payload);
        } catch {}
      }
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했어요.");
    } finally {
      const elapsed =
        (typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now()) - t0;
      const wait = Math.max(0, MIN_SHOW_MS - elapsed);
      await new Promise((r) => setTimeout(r, wait));

      setSubmitting(false);
      notify(false);

      if (result) onSubmit(result, s.answers);
    }
  };

  const hasLong = useMemo(() => {
    return opts.some((o) => {
      const t = String(o.label);
      return t.length >= 9 || t.split(/\s+/).length >= 3;
    });
  }, [opts]);

  const gridCols = useMemo(() => {
    if (hasLong) return "grid-cols-1 sm:grid-cols-2";
    if (opts.length === 1) return "grid-cols-1";
    if (opts.length === 2) return "grid-cols-2 sm:grid-cols-2";
    if (opts.length === 3) return "grid-cols-2 sm:grid-cols-3";
    if (opts.length === 4) return "grid-cols-2 sm:grid-cols-2";
    return "grid-cols-2 sm:grid-cols-3";
  }, [hasLong, opts.length]);

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
        className={["mt-6 grid gap-2 p-1 items-stretch", gridCols].join(" ")}
      >
        {opts.map((opt) => {
          const active = isActive(opt.value);
          return (
            <button
              key={`${cat}:${qIdx}:${opt.value}`}
              type="button"
              onClick={() => select(opt.value)}
              aria-pressed={active}
              data-selected={active ? "true" : "false"}
              disabled={transitioning || submitting}
              aria-disabled={transitioning || submitting}
              className={[
                "relative flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition-colors whitespace-normal text-center min-h-[44px] h-full",
                "[-webkit-tap-highlight-color:transparent] touch-manipulation select-none focus:outline-none focus-visible:outline-none",
                transitioning || submitting
                  ? "border-gray-200 bg-white opacity-60 pointer-events-none"
                  : isActive(opt.value)
                  ? "border-transparent bg-sky-50 ring-2 ring-sky-400 ring-offset-1 ring-offset-white focus:ring-0 focus-visible:ring-0"
                  : "border-gray-200 bg-white supports-[hover:hover]:hover:bg-sky-50 supports-[hover:hover]:hover:border-sky-200 active:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
              ].join(" ")}
            >
              {active && (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-sky-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.543-6.543a1 1 0 0 1 1.414 0z" />
                </svg>
              )}
              <span className="leading-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-2">
        <p className="flex-1 min-w-0 truncate text-xs leading-none text-gray-400">
          중간에 나가도 진행 상황이 저장돼요.
        </p>
        <button
          onClick={skipCurrent}
          type="button"
          className="shrink-0 text-xs leading-none text-gray-500 underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          disabled={submitting || transitioning}
        >
          이 질문은 건너뛸래요
        </button>
      </div>
    </div>
  );
}
