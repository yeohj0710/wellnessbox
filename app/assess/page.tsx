"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { evaluate } from "@/app/assess/logic/algorithm";
import { sectionA, sectionB, fixedA, hashChoice } from "./data/questions";
import { NumberInput, MultiSelect } from "@/app/assess/components/inputs";
import CSection, { CSectionResult } from "./components/CSection";
import {
  CATEGORY_LABELS,
  CategoryKey,
  CATEGORY_DESCRIPTIONS,
} from "./data/categories";
import { getCategories } from "@/lib/product";

const KEY_TO_CODE: Record<CategoryKey, string> = {
  vitaminC: "vitc",
  omega3: "omega3",
  calcium: "ca",
  lutein: "lutein",
  vitaminD: "vitd",
  milkThistle: "milkthistle",
  probiotics: "probiotics",
  vitaminB: "vitb",
  magnesium: "mg",
  garcinia: "garcinia",
  multivitamin: "multivitamin",
  zinc: "zn",
  psyllium: "psyllium",
  minerals: "minerals",
  vitaminA: "vita",
  iron: "fe",
  phosphatidylserine: "ps",
  folicAcid: "folate",
  arginine: "arginine",
  chondroitin: "chondroitin",
  coenzymeQ10: "coq10",
  collagen: "collagen",
};

const CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).map(([k, code]) => [
    code,
    CATEGORY_LABELS[k as CategoryKey],
  ])
) as Record<string, string>;
const CODE_TO_DESC: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).map(([k, code]) => [
    code,
    CATEGORY_DESCRIPTIONS[k as CategoryKey],
  ])
) as Record<string, string>;

const labelOf = (code: string) =>
  CODE_TO_LABEL[code as keyof typeof CODE_TO_LABEL] ?? code;
const descOf = (code: string) =>
  CODE_TO_DESC[code as keyof typeof CODE_TO_DESC] ?? "";

const STORAGE_KEY = "assess-state";
const C_PERSIST_KEY = `${STORAGE_KEY}::C`;

export default function Assess() {
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
  const [cChildReady, setCChildReady] = useState(false);

  const registerPrevCb = useCallback((fn: () => boolean) => {
    cPrevRef.current = fn;
    setCChildReady(true);
  }, []);

  const recommendedIds = useMemo(() => {
    if (!cResult || categories.length === 0) return [] as number[];
    return cResult.catsOrdered
      .map((code) => categories.find((c: any) => c.name === labelOf(code))?.id)
      .filter((id): id is number => typeof id === "number");
  }, [cResult, categories]);

  const [cProgress, setCProgress] = useState({ step: 0, total: 0, pct: 0 });
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
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, [hydrated, section, answers, current, fixedIdx, history, cCats, cResult]);

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
    const ratio = total > 0 ? answered / total : 0;
    return ratio === 0 ? "" : "";
  }, [answered, total, section]);

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
          const { top } = evaluate(pruned as any);
          const nextCats = (top as TopItem[]).map(
            (c) => KEY_TO_CODE[c.key as CategoryKey]
          );
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

  if (section === "INTRO") {
    return (
      <div className="w-full max-w-[880px] mx-auto px-4 pb-28">
        <div className="relative mt-10 overflow-hidden rounded-3xl bg-white/80 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-sky-200 to-indigo-200 blur-3xl opacity-60" />
          <div className="relative grid gap-10 sm:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
                <span>총 3개 섹션</span>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span>예상 5–7분</span>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span>자동 저장</span>
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                정밀 AI 진단을 시작해요
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-6 text-gray-600">
                설문은 단계별로 진행되고 이전 답변에 따라 문항이 달라져요.
                중간에 이탈해도 진행 상황이 브라우저에 저장돼요.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-sky-50 text-sky-600 text-xs font-bold">
                    A
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      기초 건강 데이터
                    </p>
                    <p className="text-xs text-gray-600">
                      연령, 기본 상태 등 핵심 정보를 확인해요.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                    B
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      생활 습관·증상
                    </p>
                    <p className="text-xs text-gray-600">
                      생활 패턴과 증상을 바탕으로 우선순위를 좁혀요.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-violet-50 text-violet-600 text-xs font-bold">
                    C
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      세부 진단
                    </p>
                    <p className="text-xs text-gray-600">
                      보완이 필요하다고 판단되는 부분을 집중적으로 분석해요.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-2">
                <button
                  onClick={() => setSection("A")}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 shadow hover:brightness-110 transition [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
                >
                  설문 시작하기
                </button>
              </div>
            </div>

            <div className="grid content-start gap-4">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                <p className="text-sm font-semibold text-gray-900">예상 소요</p>
                <p className="mt-1 text-xs text-gray-600">
                  보통 5–7분 정도 걸려요. 개인화에 따라 문항 수가 달라질 수
                  있어요.
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                <p className="text-sm font-semibold text-gray-900">진행 방식</p>
                <ul className="mt-1 space-y-1 text-xs text-gray-600">
                  <li>이전 답변을 반영해 필요한 질문만 보여줘요.</li>
                  <li>나갔다가 다시 들어와도 이어서 진행돼요.</li>
                  <li>결과는 상위 3개 카테고리와 적합도로 제공돼요.</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <p className="text-xs text-gray-600">
                  입력 내용은 브라우저에 임시 저장되며 서버로 전송되지 않아요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === "C") {
    return (
      <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
        <div className="relative mt-6 sm:mt-10 overflow-hidden rounded-3xl bg-white/70 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
          {loading && (
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
                {loadingText}
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
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            <button
              onClick={handleCPrev}
              className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              이전
            </button>
            <button
              onClick={confirmReset}
              className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              처음부터
            </button>
          </div>

          <div className="flex items-start justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              세부 진단
            </h1>
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>진행률</span>
                <span className="tabular-nums">{cProgress.pct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${cProgress.pct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                {cProgress.step}/{cProgress.total}문항 완료 ·{" "}
                {Math.max(cProgress.total - cProgress.step, 0)}문항 남음
              </div>
            </div>
          </div>

          <CSection
            key={`${cEpoch}:${cCats.join(",")}`}
            cats={cCats}
            onSubmit={(res) => {
              setCResult(res);
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
        </div>
        {confirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setConfirmOpen(false)}
            />
            <div
              className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900">
                처음부터 다시 시작할까요?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                저장된 응답은 모두 삭제돼요.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  ref={cancelBtnRef}
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    reset();
                    setConfirmOpen(false);
                  }}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
                >
                  처음부터
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (section === "DONE" && cResult) {
    return (
      <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
        <div className="relative mt-6 sm:mt-10 overflow-hidden rounded-3xl bg-white/70 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            <button
              onClick={goBack}
              className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              이전
            </button>
            <button
              onClick={confirmReset}
              className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              다시하기
            </button>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            맞춤 추천 결과
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            답변을 바탕으로 아래 세 가지 영양제 카테고리를 우선 추천드려요.
            퍼센트는 현재 상태와의 적합도를 의미해요.
          </p>
          <ul className="space-y-4">
            {cResult.catsOrdered.map((c, i) => (
              <li key={c} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{labelOf(c)}</span>
                  <span className="text-sm text-gray-600">
                    {(cResult.percents[i] * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    style={{
                      width: `${Math.min(100, cResult.percents[i] * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">{descOf(c)}</p>
              </li>
            ))}
          </ul>
          <p className="text-center mt-6 text-sm text-gray-600">
            아래 버튼을 누르면 추천 카테고리가 적용된 상품 목록으로 이동해요.
          </p>
          <div className="mt-4 flex justify-center">
            <Link
              href={`/explore${
                recommendedIds.length
                  ? `?categories=${recommendedIds.join(",")}`
                  : ""
              }#home-products`}
              className="w-full sm:w-2/3 text-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 shadow hover:brightness-110 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              추천 제품 보러 가기
            </Link>
          </div>
        </div>
        {confirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setConfirmOpen(false)}
            />
            <div
              className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900">
                처음부터 다시 시작할까요?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                저장된 응답은 모두 삭제돼요.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  ref={cancelBtnRef}
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    reset();
                    setConfirmOpen(false);
                  }}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
                >
                  처음부터
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-hidden sm:rounded-3xl sm:bg-white/70 sm:ring-1 sm:ring-black/5 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:backdrop-blur">
        {loading && (
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
              {loadingText}
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

        <div className="relative p-4 sm:p-10">
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            <button
              onClick={goBack}
              className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              이전
            </button>
            <button
              onClick={confirmReset}
              className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              처음부터
            </button>
          </div>
          <div className="flex items-start justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {sectionTitle}
            </h1>
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>진행률</span>
                <span className="tabular-nums">{completion}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                {answered}/{total}문항 완료 · {total - answered}문항 남음
              </div>
              <div className="text-[10px] text-sky-600 mt-1">{progressMsg}</div>
            </div>
          </div>

          {isAB && (
            <h2 className="mt-6 text-xl font-bold text-gray-900">
              {currentQuestion?.text}
            </h2>
          )}

          {isAB && currentQuestion?.type === "choice" && (
            <div
              className={[
                "mt-6 grid gap-2",
                currentQuestion.options!.length === 1
                  ? "grid-cols-1"
                  : currentQuestion.options!.length === 2
                  ? "grid-cols-2 sm:grid-cols-2"
                  : currentQuestion.options!.length === 3
                  ? "grid-cols-2 sm:grid-cols-3"
                  : currentQuestion.options!.length === 4
                  ? "grid-cols-2 sm:grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3",
              ].join(" ")}
            >
              {currentQuestion.options!.map((opt) => {
                const active = answers[current] === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => handleAnswer(opt.value)}
                    className={[
                      "rounded-xl border p-3 text-sm transition-colors flex items-center justify-center text-center whitespace-normal leading-tight min-h-[44px]",
                      "[-webkit-tap-highlight-color:transparent] touch-manipulation select-none active:bg-white",
                      active
                        ? "border-sky-300 bg-sky-50 ring-2 ring-sky-400"
                        : "border-gray-200 bg-white supports-[hover:hover]:hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.98]",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {isAB && currentQuestion?.type === "number" && (
            <div className="mt-4">
              <NumberInput
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(v) => handleAnswer(v)}
                initial={answers[currentQuestion.id]}
              />
            </div>
          )}

          {isAB && currentQuestion?.type === "multi" && (
            <div className="mt-4">
              <MultiSelect
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(vals) => handleAnswer(vals)}
                initial={answers[currentQuestion.id]}
              />
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-2">
            <p className="flex-1 min-w-0 truncate text-xs leading-none text-gray-400">
              중간에 나갔다 와도 진행 상황이 저장돼요.
            </p>
            {isAB && currentQuestion && (
              <button
                onClick={() => handleAnswer(undefined)}
                type="button"
                className="shrink-0 text-xs leading-none text-gray-500 underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
              >
                이 질문은 건너뛸래요
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">
              처음부터 다시 시작할까요?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              저장된 응답은 모두 삭제돼요.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                ref={cancelBtnRef}
                onClick={() => setConfirmOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
              >
                취소
              </button>
              <button
                onClick={() => {
                  reset();
                  setConfirmOpen(false);
                }}
                className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
              >
                처음부터
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
