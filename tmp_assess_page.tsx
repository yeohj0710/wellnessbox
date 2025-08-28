"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { evaluate } from "./algorithm";
import { sectionA, sectionB, fixedA, hashChoice } from "./questions";
import { NumberInput, MultiSelect } from "@/app/assess/inputs";
import CSection, { CSectionResult } from "./c-section";
import {
  CATEGORY_LABELS,
  CategoryKey,
  CATEGORY_DESCRIPTIONS,
} from "./categories";
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

const STORAGE_KEY = "assess-state";

export default function Assess() {
  const [section, setSection] = useState<"A" | "B" | "C" | "DONE">("A");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [current, setCurrent] = useState<string>(fixedA[0]);
  const [fixedIdx, setFixedIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cCats, setCCats] = useState<string[]>([]);
  const [cResult, setCResult] = useState<CSectionResult | null>(null);
  const [recommendedIds, setRecommendedIds] = useState<number[]>([]);
  const cPrevRef = useRef<(() => void) | null>(null);
  const [cProgress, setCProgress] = useState({ step: 0, total: 0, pct: 0 });
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmOpen) return;
    cancelBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setConfirmOpen(false);
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSection(parsed.section ?? "INTRO");
        setAnswers(parsed.answers ?? {});
        setCurrent(parsed.current ?? fixedA[0]);
        setFixedIdx(parsed.fixedIdx ?? 0);
        setHistory(parsed.history ?? []);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ section, answers, current, fixedIdx, history })
    );
  }, [section, answers, current, fixedIdx, history]);

  useEffect(() => {
    async function syncIds() {
      if (!cResult) {
        setRecommendedIds([]);
        return;
      }
      try {
        const cats = await getCategories();
        const names = cResult.catsOrdered.map((code) => CODE_TO_LABEL[code]);
        const ids = names
          .map((n) => cats.find((c: any) => c.name === n)?.id)
          .filter((v): v is number => typeof v === "number");
        setRecommendedIds(ids);
      } catch {}
    }
    syncIds();
  }, [cResult]);

  const allQuestions = section === "A" ? sectionA : section === "B" ? sectionB : [];

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

  const currentQuestion = allQuestions.find((q) => q.id === current)!;
  const sectionTitle = section === "A" ? "���� �ǰ� ������" : "��Ȱ ����������";const reset = () => {
    setSection("A");
    setAnswers({});
    setCurrent(fixedA[0]);
    setFixedIdx(0);
    setHistory([]);
    setCCats([]);
    setCResult(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  };

  const confirmReset = () => setConfirmOpen(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = confirmOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirmOpen]);

  const goBack = () => {
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

  const handleAnswer = (val: any) => {
    (document.activeElement as HTMLElement | null)?.blur();
    // record and prune future answers for better UX when revisiting
    const base = { ...answers, [current]: val === undefined ? null : val };
    const newHistory = [...history, current];
    const pruned: Record<string, any> = {};
    for (const k of Object.keys(base))
      if (newHistory.includes(k)) pruned[k] = base[k];
    setAnswers(pruned);
    setHistory(newHistory);

    let message = "AI�� �亯�� �м��ؼ� ���� ������ ���Կ�.";
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
        message = "���� ��Ȱ ������ ������� �˾ƺ��Կ�.";
        delay = 1200;
        action = () => {
          const remB = computeRemaining("B", pruned, newHistory);
          setSection("B");
          setCurrent(remB[0]);
          setFixedIdx(0);
        };
      } else {
        message = "AI�� �߰� ������ �غ��߾��.";
        delay = 1200;
        action = () => {
          const { top } = evaluate(pruned);
          setCCats(top.map((c) => KEY_TO_CODE[c.key]));
          setSection("C");
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
  }
      <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
        <div className="relative mt-6 sm:mt-10 overflow-hidden rounded-3xl bg-white/70 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            <button onClick={goBack} className="underline hover:text-gray-700">
              ����
            </button>
            <button
              onClick={confirmReset}
              className="underline hover:text-gray-700"
            >
              ó������
            </button>
          </div>
          <CSection
            cats={cCats}
            onSubmit={(res) => {
              setCResult(res);
              setSection("DONE");
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
                ó������ �ٽ� �����ұ��?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                ����� ������ ��� �����ſ�.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  ref={cancelBtnRef}
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  ���
                </button>
                <button
                  onClick={() => {
                    reset();
                    setConfirmOpen(false);
                  }}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500"
                >
                  ó������
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
            <button onClick={goBack} className="underline hover:text-gray-700">
              ����
            </button>
            <button
              onClick={confirmReset}
              className="underline hover:text-gray-700"
            >
              ó������
            </button>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            ��õ ī�װ� Top3
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            ī�װ��� ���յ� �ۼ�Ƽ������. �Ʒ� ������� ���캼�Կ�.
          </p>
          <ul className="space-y-4">
            {cResult.catsOrdered.map((c, i) => (
              <li key={c} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{CODE_TO_LABEL[c]}</span>
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
                <p className="mt-2 text-sm text-gray-600">{CODE_TO_DESC[c]}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center gap-3">
            <a
              href={`/explore${
                recommendedIds.length
                  ? `?categories=${recommendedIds.join(",")}`
                  : ""
              }#home-products`}
              className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 shadow hover:brightness-110"
            >
              �����Ϸ� ����
            </a>
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
                ó������ �ٽ� �����ұ��?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                ����� ������ ��� �����ſ�.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  ref={cancelBtnRef}
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  ���
                </button>
                <button
                  onClick={() => {
                    reset();
                    setConfirmOpen(false);
                  }}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500"
                >
                  ó������
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
            <button onClick={goBack} className="underline hover:text-gray-700">
              ����
            </button>
            <button
              onClick={confirmReset}
              className="underline hover:text-gray-700"
            >
              ó������
            </button>
          </div>
          <div className="flex items-start justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {sectionTitle}
            </h1>
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>�����</span>
                <span className="tabular-nums">{completion}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                {answered}/{total}���� �Ϸ� �� {total - answered}���� ����
              </div>
              <div className="text-[10px] text-sky-600 mt-1">{progressMsg}</div>
            </div>
          </div>

          <h2 className="mt-6 text-xl font-bold text-gray-900">
            {currentQuestion.text}
          </h2>

          {currentQuestion.type === "choice" && (
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
                      active
                        ? "border-sky-300 bg-sky-50 ring-2 ring-sky-400"
                        : "border-gray-200 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.98]",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "number" && (
            <div className="mt-4">
              <NumberInput
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(v) => handleAnswer(v)}
                initial={answers[currentQuestion.id]}
              />
            </div>
          )}

          {currentQuestion.type === "multi" && (
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
              �߰��� ������ �͵� ���� ��Ȳ�� ����ſ�.
            </p>
            <button
              onClick={() => handleAnswer(undefined)}
              type="button"
              className="shrink-0 text-xs leading-none text-gray-500 underline hover:text-gray-700"
            >
              �� ������ �ǳʶ۷���
            </button>
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
              ó������ �ٽ� �����ұ��?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              ����� ������ ��� �����ſ�.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                ref={cancelBtnRef}
                onClick={() => setConfirmOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              >
                ���
              </button>
              <button
                onClick={() => {
                  reset();
                  setConfirmOpen(false);
                }}
                className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500"
              >
                ó������
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






