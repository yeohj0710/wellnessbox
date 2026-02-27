"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CState,
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
import { C_OPTIONS } from "../data/c-options";
import { BANK } from "../data/c-bank";
import {
  type CSectionOption,
  type CSectionResultPayload,
  getCQuestionType,
  normalizeCAnswerByType,
  normalizeCSectionResultPayload,
} from "./cSection.helpers";

const MAX_PERSIST_PAYLOAD_LENGTH = 200000;
const MINIMUM_SUBMIT_LOADING_MS = 5000;

export const C_SECTION_COPY = {
  transitionText: "AI가 응답을 분석해서 다음 질문으로 이동하고 있어요.",
  submitText: "AI가 최종 결과를 계산하고 있어요.",
  rangeErrorText: "응답 값이 허용 범위를 벗어났어요.",
  serverErrorText: "서버 통신 중 오류가 발생했어요.",
  resultFormatErrorText: "결과 형식이 올바르지 않아요.",
  unknownErrorText: "예상치 못한 오류가 발생했어요.",
  skipHintText: "중간 저장 없이 진행 상황을 바로 반영해요.",
  skipButtonText: "이 질문 건너뛰기",
} as const;

type CSectionControllerParams = {
  cats: string[];
  onSubmit: (res: CSectionResultPayload, answers: Record<string, number[]>) => void;
  onProgress?: (step: number, total: number) => void;
  registerPrev?: (fn: () => boolean) => void;
  persistKey?: string;
  onLoadingChange?: (loading: boolean, text?: string) => void;
};

function nowMs() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
}

async function waitForMinimumDuration(startedAt: number, minimumMs: number) {
  const elapsed = nowMs() - startedAt;
  const wait = Math.max(0, minimumMs - elapsed);
  await new Promise((resolve) => setTimeout(resolve, wait));
}

function readPersistedState(cats: string[], persistKey?: string): CState {
  let persisted: Partial<CState> | undefined;
  if (typeof window !== "undefined" && persistKey) {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw && raw.length < MAX_PERSIST_PAYLOAD_LENGTH) {
        persisted = fromPersist(JSON.parse(raw));
      }
    } catch {}
  }
  return initState(cats, getCQuestionType, persisted);
}

function persistProgressState(persistKey: string | undefined, state: CState) {
  if (typeof window === "undefined" || !persistKey) return;
  try {
    const payload = JSON.stringify(toPersist(undefined, state));
    if (payload.length < MAX_PERSIST_PAYLOAD_LENGTH) {
      localStorage.setItem(persistKey, payload);
    }
  } catch {}
}

function persistBookmarkState(persistKey: string | undefined, state: CState) {
  if (typeof window === "undefined" || !persistKey) return;
  try {
    const answered = answeredCount(state.filled);
    const lastStep = Math.max(0, answered - 1);
    const bookmarkState = { ...state, step: lastStep };
    const payload = JSON.stringify(toPersist(undefined, bookmarkState));
    localStorage.setItem(persistKey, payload);
  } catch {}
}

export default function useCSectionController({
  cats,
  onSubmit,
  onProgress,
  registerPrev,
  persistKey,
  onLoadingChange,
}: CSectionControllerParams) {
  const initialState = useCallback(
    () => readPersistedState(cats, persistKey),
    [cats, persistKey]
  );

  const [state, setState] = useState<CState>(() => initialState());
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");

  const stateRef = useRef(state);
  const hydratedRef = useRef(false);
  const lastProgressRef = useRef<{ step: number; total: number } | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setState(initialState());
    hydratedRef.current = false;
    const armHydrated = () => {
      hydratedRef.current = true;
    };
    if (typeof queueMicrotask === "function") queueMicrotask(armHydrated);
    else Promise.resolve().then(armHydrated);
  }, [initialState]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistProgressState(persistKey, state);
  }, [persistKey, state]);

  useEffect(() => {
    if (!onProgress) return;
    const nextTotal = state.cats.length * 5;
    const done = Math.max(0, Math.min(state.step, nextTotal));
    if (
      lastProgressRef.current?.step === done &&
      lastProgressRef.current?.total === nextTotal
    ) {
      return;
    }
    lastProgressRef.current = { step: done, total: nextTotal };
    onProgress(done, nextTotal);
  }, [onProgress, state.cats.length, state.step]);

  useEffect(() => {
    const snapshot = stateRef.current;
    const nextTotal = snapshot.cats.length * 5;
    if (answeredCount(snapshot.filled) < nextTotal) return;

    const current = getCurrentPair(snapshot);
    if (!current) return;

    setState((previous) => {
      const answers = {
        ...previous.answers,
        [current.cat]: [...previous.answers[current.cat]],
      };
      const filled = {
        ...previous.filled,
        [current.cat]: [...previous.filled[current.cat]],
      };
      filled[current.cat][current.qIdx] = false;
      answers[current.cat][current.qIdx] = -1;
      return { ...previous, answers, filled };
    });
  }, []);

  useEffect(() => {
    if (!registerPrev) return;
    registerPrev(() => {
      const snapshot = stateRef.current;
      if (snapshot.step <= 0) return false;
      const previousStep = snapshot.step - 1;
      setState((current) => ({ ...current, step: previousStep, error: undefined }));
      return true;
    });
  }, [registerPrev]);

  const pair = getCurrentPair(state);
  const cat = pair?.cat ?? cats[0];
  const qIdx = pair?.qIdx ?? 0;
  const question = BANK[cat]?.[qIdx];
  const options = (question
    ? C_OPTIONS[getCQuestionType(cat, qIdx) as keyof typeof C_OPTIONS]
    : []) as readonly CSectionOption[];

  const isActive = useCallback(
    (value: number) =>
      Boolean(state.filled[cat]?.[qIdx] && state.answers[cat]?.[qIdx] === value),
    [cat, qIdx, state.answers, state.filled]
  );

  const notify = useCallback(
    (flag: boolean, text?: string) => {
      if (!onLoadingChange) return;
      setTimeout(() => onLoadingChange(flag, text), 0);
    },
    [onLoadingChange]
  );

  const submit = useCallback(
    async (snapshot: CState) => {
      if (submitting) return;
      setSubmitting(true);
      notify(true, C_SECTION_COPY.submitText);
      setError("");

      const startedAt = nowMs();
      let result: CSectionResultPayload | null = null;

      try {
        const answersNorm = snapshot.cats.map((nextCat) =>
          snapshot.answers[nextCat].map((value, index) =>
            normalizeCAnswerByType(getCQuestionType(nextCat, index), value)
          )
        );
        const payload = { cats: snapshot.cats, answers: answersNorm };

        const response = await fetch("/api/c-section-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || C_SECTION_COPY.serverErrorText);
        }

        const resultPayload = await response.json().catch(() => null);
        const normalized = normalizeCSectionResultPayload(resultPayload);
        if (!normalized) {
          throw new Error(C_SECTION_COPY.resultFormatErrorText);
        }
        result = normalized;
        persistBookmarkState(persistKey, snapshot);
      } catch (caught) {
        if (caught instanceof Error) setError(caught.message);
        else setError(C_SECTION_COPY.unknownErrorText);
      } finally {
        await waitForMinimumDuration(startedAt, MINIMUM_SUBMIT_LOADING_MS);
        setSubmitting(false);
        notify(false);
        if (result) onSubmit(result, snapshot.answers);
      }
    },
    [notify, onSubmit, persistKey, submitting]
  );

  const select = useCallback(
    (value: number) => {
      if (!question || submitting || transitioning) return;

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) activeElement.blur();
      setError("");

      const { state: previewState, finished: willFinish } = selectValue(
        stateRef.current,
        getCQuestionType,
        value
      );
      const willSubmit = willFinish || shouldSubmit(previewState);

      if (willSubmit) {
        const validation = validateBeforeSubmit(previewState, getCQuestionType);
        if (validation.ok) {
          setState(previewState);
          void submit(previewState);
        } else {
          setError(C_SECTION_COPY.rangeErrorText);
          setState(
            ensureNextQuestion(
              {
                ...previewState,
                plan: [...previewState.plan, validation.focus],
                step: Math.max(0, previewState.step),
              },
              getCQuestionType
            )
          );
        }
        return;
      }

      setTransitioning(true);
      notify(true, C_SECTION_COPY.transitionText);
      window.setTimeout(
        () => {
          setTransitioning(false);
          notify(false);
          setState(ensureNextQuestion(previewState, getCQuestionType));
        },
        typeof TRANSITION_MS === "number" ? TRANSITION_MS : 0
      );
    },
    [notify, question, submit, submitting, transitioning]
  );

  const skipCurrent = useCallback(() => {
    if (submitting || transitioning) return;
    select(0);
  }, [select, submitting, transitioning]);

  const total = useMemo(() => cats.length * 5, [cats]);

  return {
    cat,
    qIdx,
    total,
    question,
    options,
    error,
    submitting,
    transitioning,
    isActive,
    select,
    skipCurrent,
  };
}
