"use client";

import { useCallback, useRef, useState } from "react";
import { evaluate } from "@/app/assess/logic/algorithm";
import { fixedA, hashChoice } from "./data/questions";
import { getOrCreateClientId } from "@/lib/client-id";
import { KEY_TO_CODE, type CategoryKey } from "@/lib/categories";
import type { CSectionResult } from "./components/CSection";
import type { CategoryLite } from "@/lib/client/categories";
import { getTzOffsetMinutes } from "@/lib/timezone";
import { composeAssessAnswers } from "./logic/compose-answers";
import { computeRemainingQuestionIds } from "./logic/question-flow";
import {
  ASSESS_C_PERSIST_KEY,
  ASSESS_STORAGE_KEY,
  clearAssessCPersistStorage,
  clearAssessStorage,
  rollbackLatestCStateAnswer,
} from "./lib/assessStorage";
import { useAssessFlowDerivedState } from "./useAssessFlow.derived";
import { useAssessFlowLifecycle } from "./useAssessFlow.lifecycle";
import type { AssessSection } from "./useAssessFlow.types";

type TopItem = { key: CategoryKey; label: string; score: number };

export function useAssessFlow() {
  const [section, setSection] = useState<AssessSection>("INTRO");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [current, setCurrent] = useState<string>(fixedA[0]);
  const [fixedIdx, setFixedIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cCats, setCCats] = useState<string[]>([]);
  const [cAnswers, setCAnswers] = useState<Record<string, number[]>>({});
  const [cResult, setCResult] = useState<CSectionResult | null>(null);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [cEpoch, setCEpoch] = useState(0);
  const [cProgress, setCProgress] = useState({ step: 0, total: 0, pct: 0 });
  const [hydrated, setHydrated] = useState(false);

  const cPrevRef = useRef<(() => boolean) | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadingTimer = useCallback(() => {
    if (!loadingTimerRef.current) return;
    clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = null;
  }, []);

  const registerPrevCb = useCallback((fn: () => boolean) => {
    cPrevRef.current = fn;
  }, []);

  const reset = useCallback(() => {
    clearLoadingTimer();
    setSection("INTRO");
    setAnswers({});
    setCurrent(fixedA[0]);
    setFixedIdx(0);
    setHistory([]);
    setLoading(false);
    setLoadingText("");
    setCCats([]);
    setCResult(null);
    setCAnswers({});
    setCProgress({ step: 0, total: 0, pct: 0 });
    clearAssessStorage(ASSESS_STORAGE_KEY, ASSESS_C_PERSIST_KEY);
  }, [clearLoadingTimer]);

  const confirmReset = useCallback(() => setConfirmOpen(true), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  const confirmAndReset = useCallback(() => {
    reset();
    setConfirmOpen(false);
  }, [reset]);

  const startIntro = useCallback(() => setSection("A"), []);

  const handleCProgress = useCallback((step: number, total: number) => {
    setCProgress((prev) => {
      const pct = total > 0 ? Math.round((step / total) * 100) : 0;
      if (prev.step === step && prev.total === total && prev.pct === pct) {
        return prev;
      }
      return { step, total, pct };
    });
  }, []);

  const {
    cProgressMsg,
    recommendedIds,
    currentQuestion,
    completion,
    answered,
    total,
    progressMsg,
    sectionTitle,
  } = useAssessFlowDerivedState({
    section,
    answers,
    history,
    current,
    cResult,
    categories,
    cProgress,
  });

  const goBack = useCallback(() => {
    if (section === "DONE") {
      rollbackLatestCStateAnswer(ASSESS_C_PERSIST_KEY);
      setSection("C");
      setCEpoch((prev) => prev + 1);
      return;
    }

    if (history.length === 0) {
      reset();
      return;
    }

    const prevId = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setSection(prevId.startsWith("A") ? "A" : "B");
    setCurrent(prevId);

    if (prevId.startsWith("A")) {
      const idx = fixedA.indexOf(prevId);
      if (idx !== -1) setFixedIdx(idx);
    }
  }, [history, reset, section]);

  const handleCPrev = useCallback(() => {
    if (section !== "C") {
      goBack();
      return;
    }

    if (!cPrevRef.current) return;

    const handled = cPrevRef.current();
    if (!handled) {
      goBack();
    }
  }, [goBack, section]);

  const handleAnswer = useCallback(
    (val: any) => {
      (document.activeElement as HTMLElement | null)?.blur();

      const base = { ...answers, [current]: val === undefined ? null : val };
      const newHistory = [...history, current];
      const pruned: Record<string, any> = {};
      for (const key of Object.keys(base)) {
        if (newHistory.includes(key)) pruned[key] = base[key];
      }
      setAnswers(pruned);
      setHistory(newHistory);

      let message = "AI가 답변을 분석해서 다음 질문을 고를게요.";
      let action: () => void;
      let delay = 800;

      if (section === "A" && fixedA.includes(current)) {
        const idx = fixedA.indexOf(current);
        if (idx < fixedA.length - 1) {
          setFixedIdx(idx + 1);
          setCurrent(fixedA[idx + 1]);
          return;
        }
      }

      const remaining = computeRemainingQuestionIds(
        section === "A" ? "A" : "B",
        pruned,
        newHistory
      );

      if (remaining.length === 0) {
        if (section === "A") {
          message = "이제 생활 습관과 증상들을 알아볼게요.";
          delay = 2500;
          action = () => {
            const remB = computeRemainingQuestionIds("B", pruned, newHistory);
            setSection("B");
            setCurrent(remB[0]);
            setFixedIdx(0);
          };
        } else {
          message = "마지막으로 세부적인 데이터를 분석할게요.";
          delay = 2500;
          action = () => {
            clearAssessCPersistStorage(ASSESS_C_PERSIST_KEY);
            const { top } = evaluate(pruned as any) as { top: TopItem[] };
            const nextCats = top.map(({ key }) => KEY_TO_CODE[key]);
            setCCats(nextCats);
            setCProgress({ step: 0, total: 0, pct: 0 });
            setSection("C");
            setCEpoch((prev) => prev + 1);
          };
        }
      } else {
        const nextId = remaining[hashChoice(current, val) % remaining.length];
        action = () => setCurrent(nextId);
      }

      clearLoadingTimer();
      setLoadingText(message);
      setLoading(true);
      loadingTimerRef.current = setTimeout(() => {
        loadingTimerRef.current = null;
        action();
        setLoading(false);
      }, delay);
    },
    [answers, clearLoadingTimer, current, history, section]
  );

  const handleCSubmit = useCallback(
    (res: CSectionResult, cAns: Record<string, number[]>) => {
      clearLoadingTimer();
      setLoading(false);
      setLoadingText("");
      setCAnswers(cAns);
      setCResult(res);
      const payload = {
        clientId: getOrCreateClientId(),
        answers: composeAssessAnswers(answers, cAns, cCats),
        cResult: res,
        tzOffsetMinutes: getTzOffsetMinutes(),
      };
      fetch("/api/assess/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
      setSection("DONE");
    },
    [answers, cCats, clearLoadingTimer]
  );

  const handleCLoadingChange = useCallback((flag: boolean, text?: string) => {
    setLoadingText(text || "");
    setLoading(Boolean(flag));
  }, []);

  useAssessFlowLifecycle({
    confirmOpen,
    confirmAndReset,
    cancelBtnRef,
    setConfirmOpen,
    section,
    setSection,
    answers,
    setAnswers,
    current,
    setCurrent,
    fixedIdx,
    setFixedIdx,
    history,
    setHistory,
    cCats,
    setCCats,
    cResult,
    setCResult,
    cAnswers,
    setCAnswers,
    hydrated,
    setHydrated,
    setCategories,
    clearLoadingTimer,
  });

  return {
    section,
    loading,
    loadingText,
    confirmOpen,
    cCats,
    cProgress,
    cProgressMsg,
    cEpoch,
    cResult,
    recommendedIds,
    completion,
    answered,
    total,
    progressMsg,
    currentQuestion,
    sectionTitle,
    answers,
    current,
    cancelBtnRef,
    startIntro,
    confirmReset,
    closeConfirm,
    confirmAndReset,
    goBack,
    handleAnswer,
    handleCPrev,
    handleCProgress,
    handleCSubmit,
    registerPrevCb,
    handleCLoadingChange,
  };
}
