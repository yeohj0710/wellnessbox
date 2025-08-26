"use client";

import { useState, useMemo } from "react";
import { evaluate } from "./algorithm";
import {
  sectionA,
  sectionB,
  fixedA,
  hashChoice,
} from "./questions";
import { NumberInput, MultiSelect } from "./inputs";

export default function Assess() {
  const [section, setSection] = useState<"A" | "B" | "DONE">("A");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const allQuestions = section === "A" ? sectionA : sectionB;
  const [remaining, setRemaining] = useState<string[]>(
    sectionA.map((q) => q.id).filter((id) => !fixedA.includes(id))
  );
  const [current, setCurrent] = useState<string>(fixedA[0]);
  const [fixedIdx, setFixedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const { completion, answered, total } = useMemo(() => {
    const total = section === "A" ? sectionA.length : sectionB.length;
    const answered = (
      section === "A"
        ? Object.keys(answers).filter((k) => k.startsWith("A"))
        : Object.keys(answers).filter((k) => k.startsWith("B"))
    ).length;
    const completion = Math.round((answered / total) * 100);
    return { completion, answered, total };
  }, [answers, section]);

  const progressMsg = useMemo(() => {
    if (completion < 40) return "조금씩 진행 중이에요.";
    if (completion < 70) return "벌써 절반을 넘었어요!";
    return "거의 다 왔어요!";
  }, [completion]);

  const currentQuestion = allQuestions.find((q) => q.id === current)!;

  const sectionTitle =
    section === "A" ? "건강 프로필" : "생활 습관 및 증상";

  const handleAnswer = (val: any) => {
    setAnswers((prev) => ({ ...prev, [current]: val }));

    let message = "다음 질문을 준비하고 있어요...";
    let action: () => void;
    let delay = 1000;

    if (section === "A" && fixedIdx < fixedA.length - 1) {
      const nextId = fixedA[fixedIdx + 1];
      setFixedIdx(fixedIdx + 1);
      setCurrent(nextId);
      return;
    } else {
      const newRemaining = remaining.filter((id) => id !== current);
      if (newRemaining.length === 0) {
        if (section === "A") {
          message = "이제 생활 습관 및 증상에 대한 질문을 할게요...";
          delay = 2000;
          action = () => {
            setSection("B");
            setRemaining(sectionB.map((q) => q.id));
            setCurrent(sectionB[0].id);
            setFixedIdx(0);
          };
        } else {
          message = "결과를 분석하는 중이에요...";
          delay = 2000;
          action = () => {
            setSection("DONE");
          };
        }
      } else {
        const nextId =
          newRemaining[hashChoice(current, val) % newRemaining.length];
        action = () => {
          setRemaining(newRemaining);
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
            점수는 5점 만점 기준으로 계산된 적합도입니다.
          </p>
          <ul className="space-y-4">
            {top.map((c) => (
              <li key={c.key} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-sm text-gray-600">{c.score.toFixed(2)}점</span>
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
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm sm:rounded-3xl">
            {loadingText.includes("생활 습관") ? (
              <svg
                className="h-8 w-8 text-indigo-600 animate-bounce"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path stroke="currentColor" strokeWidth="2" d="M12 4v16m8-8H4" />
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
            <p className="mt-3 text-gray-700 text-center px-4">{loadingText}</p>
        </div>
      )}
      <div className="relative p-4 sm:p-10">
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
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentQuestion.options!.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => handleAnswer(opt.value)}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-sm hover:bg-gray-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === "number" && (
            <div className="mt-4">
              <NumberInput
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(v) => handleAnswer(v)}
              />
            </div>
          )}

          {currentQuestion.type === "multi" && (
            <div className="mt-4">
              <MultiSelect
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(vals) => handleAnswer(vals)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
