"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { evaluate } from "@/app/assess/logic/algorithm";
import { sectionA, sectionB, fixedA, hashChoice } from "./data/questions";
import { useLoading } from "@/components/common/loadingContext.client";
import { getOrCreateClientId, refreshClientIdCookieIfNeeded } from "@/lib/client-id";
import IntroSection from "./components/IntroSection";
import QuestionSection from "./components/QuestionSection";
import CSectionWrapper from "./components/CSectionWrapper";
import DoneSection from "./components/DoneSection";
import ConfirmResetModal from "./components/ConfirmResetModal";
import { KEY_TO_CODE, labelOf, type CategoryKey } from "@/lib/categories";
import type { CSectionResult } from "./components/CSection";
import { fetchCategories, type CategoryLite } from "@/lib/client/categories";
import { getTzOffsetMinutes } from "@/lib/timezone";
import {
  useChatPageActionListener,
} from "@/lib/chat/useChatPageActionListener";
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

export default function Assess() {
  const { showLoading } = useLoading();
  const [section, setSection] = useState<"INTRO" | "A" | "B" | "C" | "DONE">(
    "INTRO"
  );
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

  const handleCProgress = useCallback((step: number, total: number) => {
    setCProgress((prev) => {
      const pct = total > 0 ? Math.round((step / total) * 100) : 0;
      if (prev.step === step && prev.total === total && prev.pct === pct)
        return prev;
      return { step, total, pct };
    });
  }, []);

  const cPrevRef = useRef<(() => boolean) | null>(null);
  const registerPrevCb = useCallback((fn: () => boolean) => {
    cPrevRef.current = fn;
  }, []);

  const recommendedIds = useMemo(() => {
    if (!cResult || categories.length === 0) return [] as number[];
    const ids = cResult.catsOrdered
      .map((code) => categories.find((c) => c.name === labelOf(code))?.id)
      .filter((id): id is number => typeof id === "number");
    return Array.from(new Set(ids)).slice(0, 3);
  }, [cResult, categories]);

  const [cProgress, setCProgress] = useState({ step: 0, total: 0, pct: 0 });

  const cProgressMsg = useMemo(() => {
    return resolveProgressMessage(cProgress.step, cProgress.total);
  }, [cProgress.step, cProgress.total]);

  const [hydrated, setHydrated] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
      if (e.key === "Enter") {
        reset();
        setConfirmOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

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
        if (parsed.cResult && parsed.cResult.catsOrdered)
          setCResult(parsed.cResult);
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
  }, [
    hydrated,
    section,
    answers,
    current,
    fixedIdx,
    history,
    cCats,
    cResult,
    cAnswers,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, []);

  const allQuestions =
    section === "A" ? sectionA : section === "B" ? sectionB : [];

  const { completion, answered, total } = useMemo(() => {
    const applicableIds =
      section === "A"
        ? sectionA
            .map((q) => q.id)
            .filter((id) => !(answers.A1 === "M" && id === "A5"))
        : sectionB
            .map((q) => q.id)
            .filter((id) => !(answers.A1 !== "F" && id === "B22"));
    const answeredSet = new Set(
      history.filter((id) =>
        section === "A" ? id.startsWith("A") : id.startsWith("B")
      )
    );
    const answered = applicableIds.filter((id) => answeredSet.has(id)).length;
    const total = applicableIds.length;
    return {
      completion: total > 0 ? Math.round((answered / total) * 100) : 0,
      answered,
      total,
    };
  }, [answers, section, history]);

  const progressMsg = useMemo(() => {
    if (section !== "A" && section !== "B") return "";
    return resolveProgressMessage(answered, total);
  }, [section, answered, total]);

  const isAB = section === "A" || section === "B";
  const currentQuestion = isAB
    ? allQuestions.find((q) => q.id === current)
    : undefined;
  const sectionTitle = section === "A" ? "기초 건강 데이터" : "생활 습관·증상";

  const reset = () => {
    setSection("INTRO");
    setAnswers({});
    setCurrent(fixedA[0]);
    setFixedIdx(0);
    setHistory([]);
    setCCats([]);
    setCResult(null);
    setCAnswers({});
    clearAssessStorage(ASSESS_STORAGE_KEY, ASSESS_C_PERSIST_KEY);
  };

  const confirmReset = () => setConfirmOpen(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = confirmOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirmOpen]);

  useEffect(() => {
    if (section !== "INTRO") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") setSection("A");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [section]);

  const goBack = () => {
    if (section === "DONE") {
      rollbackLatestCStateAnswer(ASSESS_C_PERSIST_KEY);
      setSection("C");
      setCEpoch((n) => n + 1);
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
  };

  const handleCPrev = () => {
    if (section !== "C") {
      goBack();
      return;
    }

    if (!cPrevRef.current) return;

    const handled = cPrevRef.current();
    if (!handled) {
      goBack();
    }
  };

  const handleAnswer = (val: any) => {
    (document.activeElement as HTMLElement | null)?.blur();
    const base = { ...answers, [current]: val === undefined ? null : val };
    const newHistory = [...history, current];
    const pruned: Record<string, any> = {};
    for (const k of Object.keys(base))
      if (newHistory.includes(k)) pruned[k] = base[k];
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
        type TopItem = { key: CategoryKey; label: string; score: number };
        action = () => {
          clearAssessCPersistStorage(ASSESS_C_PERSIST_KEY);

          const { top } = evaluate(pruned as any) as { top: TopItem[] };
          const nextCats = top.map(({ key }) => KEY_TO_CODE[key]);
          setCCats(nextCats);
          setCProgress({ step: 0, total: 0, pct: 0 });
          setSection("C");
          setCEpoch((n) => n + 1);
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
  };

  let content: JSX.Element | null = null;
  if (section === "INTRO") {
    content = <IntroSection onStart={() => setSection("A")} />;
  } else if (section === "C") {
    content = (
      <CSectionWrapper
        loading={loading}
        loadingText={loadingText}
        onPrev={handleCPrev}
        onReset={confirmReset}
        cCats={cCats}
        cProgress={cProgress}
        cProgressMsg={cProgressMsg}
        cEpoch={cEpoch}
        onSubmit={(res, cAns) => {
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
        }}
        onProgress={handleCProgress}
        registerPrev={registerPrevCb}
        persistKey={ASSESS_C_PERSIST_KEY}
        onLoadingChange={(flag, text) => {
          setLoadingText(text || "");
          setLoading(!!flag);
        }}
      />
    );
  } else if (section === "DONE" && cResult) {
    content = (
      <DoneSection
        cResult={cResult}
        recommendedIds={recommendedIds}
        onBack={goBack}
        onReset={confirmReset}
        showLoading={showLoading}
      />
    );
  } else {
    content = (
      <QuestionSection
        loading={loading}
        loadingText={loadingText}
        onBack={goBack}
        onReset={confirmReset}
        sectionTitle={sectionTitle}
        completion={completion}
        answered={answered}
        total={total}
        progressMsg={progressMsg}
        currentQuestion={currentQuestion}
        answers={answers}
        current={current}
        handleAnswer={handleAnswer}
      />
    );
  }

  return (
    <>
      <div id="assess-flow">{content}</div>
      <ConfirmResetModal
        open={confirmOpen}
        cancelBtnRef={cancelBtnRef}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          reset();
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
