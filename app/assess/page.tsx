"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { evaluate } from "@/app/assess/logic/algorithm";
import { sectionA, sectionB, fixedA, hashChoice } from "./data/questions";
import { BANK } from "./data/c-bank";
import { C_OPTIONS } from "./data/c-options";
import { getCategories } from "@/lib/product";
import { useLoading } from "@/components/common/loadingContext.client";
import IntroSection from "./components/IntroSection";
import QuestionSection from "./components/QuestionSection";
import CSectionWrapper from "./components/CSectionWrapper";
import DoneSection from "./components/DoneSection";
import ConfirmResetModal from "./components/ConfirmResetModal";
import { KEY_TO_CODE, labelOf } from "./lib/categories";
import type { CategoryKey } from "./data/categories";
import type { CSectionResult } from "./components/CSection";

const STORAGE_KEY = "assess-state";
const C_PERSIST_KEY = `${STORAGE_KEY}::C`;

// clientId helpers (local only to avoid extra imports)
const LS_CLIENT_ID_KEY = "wb_client_id_v1";
function getClientIdLocal(): string {
  try {
    const existing = localStorage.getItem(LS_CLIENT_ID_KEY);
    if (existing) return existing;
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_CLIENT_ID_KEY, id);
    return id;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
function getTzOffsetMinutes(): number {
  try {
    return -new Date().getTimezoneOffset();
  } catch {
    return 0;
  }
}

function composeAnswers(
  ab: Record<string, any>,
  cAns: Record<string, number[]>,
  cats: string[]
) {
  const out: Record<string, any> = {};
  for (const q of [...sectionA, ...sectionB]) {
    if (ab[q.id] !== undefined) out[q.id] = ab[q.id];
  }
  for (const cat of cats) {
    const arr = cAns[cat] || [];
    const bankArr = BANK[cat] || [];
    for (let i = 0; i < Math.min(arr.length, bankArr.length); i++) {
      const v = arr[i];
      if (v < 0) continue;
      const q = bankArr[i];
      const opts = C_OPTIONS[q.type as keyof typeof C_OPTIONS] as readonly {
        value: number;
        label: string;
      }[];
      const label = opts.find((o) => o.value === v)?.label ?? v;
      out[q.prompt] = label;
    }
  }
  return out;
}

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
  const [categories, setCategories] = useState<any[]>([]);
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
      .map((code) => categories.find((c: any) => c.name === labelOf(code))?.id)
      .filter((id): id is number => typeof id === "number");
    return Array.from(new Set(ids)).slice(0, 3);
  }, [cResult, categories]);

  const [cProgress, setCProgress] = useState({ step: 0, total: 0, pct: 0 });

  const cProgressMsg = useMemo(() => {
    const tot = cProgress.total;
    const ans = cProgress.step;
    if (tot <= 0) return "";

    const remain = Math.max(tot - ans, 0);
    const ratio = ans / tot;

    if (remain === 0) return "";
    if (remain === 1) return "마지막 문항이에요!";
    if (remain === 2) return "거의 끝! 2문항만 더 하면 돼요.";
    if (remain <= 3) return "마무리 단계예요. 조금만 더 힘내요!";

    if (ratio === 0) return "시작해볼까요?";
    if (ratio < 0.2) return "좋은 출발이에요!";
    if (ratio < 0.35) return "순조롭게 진행 중이에요.";
    if (ratio < 0.5) return "잘하고 있어요, 곧 절반이에요.";
    if (ratio < 0.55) return "절반 넘겼어요! 계속 가볼까요?";
    if (ratio < 0.7) return "벌써 절반을 넘겼어요.";
    if (ratio < 0.85) return "많이 왔어요! 막바지로 가는 중이에요.";
    return "거의 다 왔어요! 페이스 그대로 가면 돼요.";
  }, [cProgress.step, cProgress.total]);

  const [hydrated, setHydrated] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

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

  const computeRemaining = (
    sec: "A" | "B",
    ans: Record<string, any>,
    hist: string[]
  ) => {
    const answeredSet = new Set(hist.filter((id) => id.startsWith(sec)));
    if (sec === "A") {
      let ids = sectionA.map((q) => q.id).filter((id) => !fixedA.includes(id));
      if (ans.A1 === "M") ids = ids.filter((id) => id !== "A5");
      return ids.filter((id) => !answeredSet.has(id));
    } else {
      let ids = sectionB.map((q) => q.id);
      if (ans.A1 !== "F") ids = ids.filter((id) => id !== "B22");
      return ids.filter((id) => !answeredSet.has(id));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
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
    if (typeof window === "undefined" || !hydrated) return;
    try {
      const baseRaw = localStorage.getItem(STORAGE_KEY);
      const base = baseRaw ? JSON.parse(baseRaw) : {};
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    getCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
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
    if (total <= 0) return "";

    const remain = Math.max(total - answered, 0);
    const ratio = answered / total;

    if (remain === 0) return "";
    if (remain === 1) return "마지막 문항이에요!";
    if (remain === 2) return "거의 끝! 2문항만 더 하면 돼요.";
    if (remain <= 3) return "마무리 단계예요. 조금만 더 힘내요!";

    if (ratio === 0) return "시작해볼까요?";
    if (ratio < 0.2) return "좋은 출발이에요!";
    if (ratio < 0.35) return "순조롭게 진행 중이에요.";
    if (ratio < 0.5) return "잘하고 있어요, 곧 절반이에요.";
    if (ratio < 0.55) return "절반 넘겼어요! 계속 가볼까요?";
    if (ratio < 0.7) return "벌써 절반을 넘겼어요.";
    if (ratio < 0.85) return "많이 왔어요! 막바지로 가는 중이에요.";
    return "거의 다 왔어요! 페이스 그대로 가면 돼요.";
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
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(C_PERSIST_KEY);
    }
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
      try {
        const raw = localStorage.getItem(C_PERSIST_KEY);
        if (raw) {
          const obj = JSON.parse(raw);
          const s = obj?.cState;
          const step = typeof s?.step === "number" ? s.step : 0;
          const pair = Array.isArray(s?.plan) ? s.plan[step] : null;
          if (pair && s?.filled?.[pair.cat]?.[pair.qIdx]) {
            s.filled[pair.cat][pair.qIdx] = false;
            if (Array.isArray(s?.answers?.[pair.cat])) {
              s.answers[pair.cat][pair.qIdx] = -1;
            }
            obj.cState = s;
            localStorage.setItem(C_PERSIST_KEY, JSON.stringify(obj));
          }
        }
      } catch {}
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
    const remaining = computeRemaining(
      section === "A" ? "A" : "B",
      pruned,
      newHistory
    );
    if (remaining.length === 0) {
      if (section === "A") {
        message = "이제 생활 습관과 증상들을 알아볼게요.";
        delay = 2500;
        action = () => {
          const remB = computeRemaining("B", pruned, newHistory);
          setSection("B");
          setCurrent(remB[0]);
          setFixedIdx(0);
        };
      } else {
        message = "마지막으로 세부적인 데이터를 분석할게요.";
        delay = 2500;
        type TopItem = { key: CategoryKey; label: string; score: number };
        action = () => {
          try {
            localStorage.removeItem(C_PERSIST_KEY);
          } catch {}

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
            clientId: getClientIdLocal(),
            answers: composeAnswers(answers, cAns, cCats),
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
        persistKey={C_PERSIST_KEY}
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
      {content}
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
