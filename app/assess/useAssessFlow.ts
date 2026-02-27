"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluate } from "@/app/assess/logic/algorithm";
import { sectionA, sectionB, fixedA, hashChoice } from "./data/questions";
import { getOrCreateClientId, refreshClientIdCookieIfNeeded } from "@/lib/client-id";
import { KEY_TO_CODE, labelOf, type CategoryKey } from "@/lib/categories";
import type { CSectionResult } from "./components/CSection";
import { fetchCategories, type CategoryLite } from "@/lib/client/categories";
import { getTzOffsetMinutes } from "@/lib/timezone";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";
import { resolveProgressMessage } from "./logic/progress-message";
import { composeAssessAnswers } from "./logic/compose-answers";
import { computeRemainingQuestionIds } from "./logic/question-flow";
import {
  ASSESS_C_PERSIST_KEY,
  ASSESS_STORAGE_KEY,
  clearAssessCPersistStorage,
  clearAssessStorage,
  loadAssessStateSnapshot,
  rollbackLatestCStateAnswer,
  saveAssessStateSnapshot,
} from "./lib/assessStorage";

export type AssessSection = "INTRO" | "A" | "B" | "C" | "DONE";

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

  const registerPrevCb = useCallback((fn: () => boolean) => {
    cPrevRef.current = fn;
  }, []);

  const reset = useCallback(() => {
    setSection("INTRO");
    setAnswers({});
    setCurrent(fixedA[0]);
    setFixedIdx(0);
    setHistory([]);
    setCCats([]);
    setCResult(null);
    setCAnswers({});
    clearAssessStorage(ASSESS_STORAGE_KEY, ASSESS_C_PERSIST_KEY);
  }, []);

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

  const cProgressMsg = useMemo(() => {
    return resolveProgressMessage(cProgress.step, cProgress.total);
  }, [cProgress.step, cProgress.total]);

  const recommendedIds = useMemo(() => {
    if (!cResult || categories.length === 0) return [] as number[];
    const ids = cResult.catsOrdered
      .map((code) => categories.find((item) => item.name === labelOf(code))?.id)
      .filter((id): id is number => typeof id === "number");
    return Array.from(new Set(ids)).slice(0, 3);
  }, [cResult, categories]);

  const allQuestions =
    section === "A" ? sectionA : section === "B" ? sectionB : [];
  const isAB = section === "A" || section === "B";
  const currentQuestion = isAB
    ? allQuestions.find((question) => question.id === current)
    : undefined;

  const { completion, answered, total } = useMemo(() => {
    const applicableIds =
      section === "A"
        ? sectionA
            .map((question) => question.id)
            .filter((id) => !(answers.A1 === "M" && id === "A5"))
        : sectionB
            .map((question) => question.id)
            .filter((id) => !(answers.A1 !== "F" && id === "B22"));
    const answeredSet = new Set(
      history.filter((id) =>
        section === "A" ? id.startsWith("A") : id.startsWith("B")
      )
    );
    const done = applicableIds.filter((id) => answeredSet.has(id)).length;
    const totalCount = applicableIds.length;
    return {
      completion: totalCount > 0 ? Math.round((done / totalCount) * 100) : 0,
      answered: done,
      total: totalCount,
    };
  }, [answers, history, section]);

  const progressMsg = useMemo(() => {
    if (section !== "A" && section !== "B") return "";
    return resolveProgressMessage(answered, total);
  }, [answered, section, total]);

  const sectionTitle = section === "A" ? "기초 건강 데이터" : "생활 습관·증상";

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

      setLoadingText(message);
      setLoading(true);
      setTimeout(() => {
        action();
        setLoading(false);
      }, delay);
    },
    [answers, current, history, section]
  );

  const handleCSubmit = useCallback(
    (res: CSectionResult, cAns: Record<string, number[]>) => {
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
    [answers, cCats]
  );

  const handleCLoadingChange = useCallback((flag: boolean, text?: string) => {
    setLoadingText(text || "");
    setLoading(Boolean(flag));
  }, []);

  useEffect(() => {
    refreshClientIdCookieIfNeeded();
  }, []);

  useChatPageActionListener((detail) => {
    if (detail.action !== "focus_assess_flow") return;
    document
      .getElementById("assess-flow")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  useEffect(() => {
    if (!confirmOpen) return;
    cancelBtnRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
      if (event.key === "Enter") {
        confirmAndReset();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmAndReset, confirmOpen]);

  useEffect(() => {
    try {
      const parsed = loadAssessStateSnapshot(ASSESS_STORAGE_KEY);
      if (parsed) {
        setSection(parsed.section ?? "INTRO");
        setAnswers(parsed.answers ?? {});
        setCurrent(parsed.current ?? fixedA[0]);
        setFixedIdx(parsed.fixedIdx ?? 0);
        setHistory(parsed.history ?? []);
        if (Array.isArray(parsed.cCats)) setCCats(parsed.cCats);
        if (parsed.cResult && parsed.cResult.catsOrdered) {
          setCResult(parsed.cResult);
        }
        if (parsed.cAnswers) setCAnswers(parsed.cAnswers);
      }
    } finally {
      const arm = () => setHydrated(true);
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => requestAnimationFrame(arm));
      } else {
        setTimeout(arm, 0);
      }
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const base = loadAssessStateSnapshot(ASSESS_STORAGE_KEY) ?? {};
      const next = {
        ...base,
        section,
        answers,
        current,
        fixedIdx,
        history,
        cCats,
        cResult,
        cAnswers,
      };
      saveAssessStateSnapshot(ASSESS_STORAGE_KEY, next);
    } catch {}
  }, [hydrated, section, answers, current, fixedIdx, history, cCats, cResult, cAnswers]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = confirmOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirmOpen]);

  useEffect(() => {
    if (section !== "INTRO") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") setSection("A");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [section]);

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
