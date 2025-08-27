"use client";

import { useState, useMemo, useEffect } from "react";
import { evaluate } from "./algorithm";
import { sectionA, sectionB, fixedA, hashChoice } from "./questions";
import { NumberInput, MultiSelect } from "./inputs";

const STORAGE_KEY = "assess-state";

export default function Assess() {
  const [section, setSection] = useState<"A" | "B" | "DONE">("A");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [current, setCurrent] = useState<string>(fixedA[0]);
  const [fixedIdx, setFixedIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

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
        setSection(parsed.section ?? "A");
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

  const allQuestions = section === "A" ? sectionA : sectionB;

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
    const completion = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { completion, answered, total };
  }, [answers, section, history]);

  const progressMsg = useMemo(() => {
    const ratio = total > 0 ? answered / total : 0;
    if (section === "A") {
      if (ratio === 0) return "시작해 볼까요?";
      if (ratio < 0.25) return "조금씩 진행 중이에요.";
      if (ratio < 0.5) return "절반을 향해 가고 있어요.";
      if (ratio < 0.9) return "벌써 절반을 넘었어요!";
      if (ratio < 1) return "마무리까지 조금 남았어요.";
      return "1단계가 완료됐어요.";
    } else {
      if (ratio === 0) return "두 번째 섹션을 시작했어요.";
      if (ratio < 0.25) return "좋아요, 계속 진행해요.";
      if (ratio < 0.5) return "절반을 향해 가고 있어요.";
      if (ratio < 0.9) return "벌써 절반을 넘었어요!";
      if (ratio < 1) return "거의 끝났어요.";
      return "모든 문항이 완료됐어요.";
    }
  }, [answered, total, section]);

  const currentQuestion = allQuestions.find((q) => q.id === current)!;

  const sectionTitle = section === "A" ? "건강 프로필" : "생활 습관 및 증상";

  const reset = () => {
    setSection("A");
    setAnswers({});
    setCurrent(fixedA[0]);
    setFixedIdx(0);
    setHistory([]);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  };

  const confirmReset = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "정말 처음부터 다시 시작할까요? 저장된 답변이 모두 사라져요."
      )
    ) {
      reset();
    }
  };

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
    const newAnswers = {
      ...answers,
      [current]: val === undefined ? null : val,
    };
    const newHistory = [...history, current];
    setAnswers(newAnswers);
    setHistory(newHistory);

    let message = "AI가 이전 답변을 분석해서 다음 질문을 고르고 있어요...";
    let action: () => void;
    let delay = 1000;

    if (section === "A" && fixedIdx < fixedA.length - 1) {
      const nextId = fixedA[fixedIdx + 1];
      setFixedIdx(fixedIdx + 1);
      setCurrent(nextId);
      return;
    } else {
      const remaining = computeRemaining(
        section === "A" ? "A" : "B",
        newAnswers,
        newHistory
      );
      if (remaining.length === 0) {
        if (section === "A") {
          message = "이제 생활 습관과 증상에 대해 더 알아볼게요...";
          delay = 2000;
          action = () => {
            const remB = computeRemaining("B", newAnswers, newHistory);
            setSection("B");
            setCurrent(remB[0]);
            setFixedIdx(0);
          };
        } else {
          message = "AI가 결과를 계산하고 있어요...";
          delay = 2000;
          action = () => {
            setSection("DONE");
          };
        }
      } else {
        const nextId = remaining[hashChoice(current, val) % remaining.length];
        action = () => {
          setCurrent(nextId);
        };
      }
    }

    setLoadingText(message);
    setLoading(true);
    setTimeout(() => {
      action();
      setLoading(false);
    }, delay);
  };

  if (section === "DONE") {
    const { top } = evaluate(answers);
    return (
      <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
        <div className="relative mt-6 sm:mt-10 overflow-hidden rounded-3xl bg-white/70 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-4">
            추천 카테고리 Top3
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            점수는 5점 만점 기준으로 계산된 적합도예요.
          </p>
          <ul className="space-y-4">
            {top.map((c) => (
              <li key={c.key} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-sm text-gray-600">
                    {c.score.toFixed(2)}점
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    style={{ width: `${Math.min(100, (c.score / 5) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-hidden sm:rounded-3xl sm:bg-white/70 sm:ring-1 sm:ring-black/5 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:backdrop-blur">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm sm:rounded-3xl">
            {loadingText.includes("생활 습관") ? (
              <svg
                className="h-8 w-8 text-indigo-600 animate-bounce"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6 animate-spin text-sky-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            <p className="mt-3 px-4 text-center text-indigo-700 font-medium">
              {loadingText}
            </p>
          </div>
        )}
        <div className="relative p-4 sm:p-10">
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            <button onClick={goBack} className="underline hover:text-gray-700">
              이전
            </button>
            <button
              onClick={confirmReset}
              className="underline hover:text-gray-700"
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
                <span>진행도</span>
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
                      "rounded-xl border p-3 text-sm transition-colors",
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
              중간에 나갔다 와도 진행 상황은 저장돼요.
            </p>
            <button
              onClick={() => handleAnswer(undefined)}
              type="button"
              className="shrink-0 text-xs leading-none text-gray-500 underline hover:text-gray-700"
            >
              이 질문은 건너뛸래요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
