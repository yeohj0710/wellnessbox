"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const QUESTIONS = [
  "최근에 쉽게 피로를 느끼고 에너지가 부족하다.",
  "뼈나 관절 건강이 걱정된다.",
  "스트레스나 불안, 수면 질이 좋지 않다.",
  "소화가 잘 안 되고, 변비·복통이 자주 있다.",
  "면역력이 약해 자주 감기에 걸린다.",
  "피부·모발·손톱 건강이 고민된다.",
  "눈이 쉽게 피로하고, 시야가 뿌옇다.",
  "임신 준비 중이거나 임신 중이다.",
  "심혈관 건강(고지혈·혈압)이 걱정된다.",
  "항산화·노화 방지가 필요하다.",
];

const OPTIONS = [
  { value: 1, label: "매우 그렇지 않다" },
  { value: 2, label: "그렇지 않다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];

type Result = { label: string; prob: number };

export default function CheckAI() {
  const [answers, setAnswers] = useState<number[]>(
    Array(QUESTIONS.length).fill(0)
  );
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [animateBars, setAnimateBars] = useState(false);

  const completion = useMemo(() => {
    const answered = answers.filter((v) => v > 0).length;
    return Math.round((answered / QUESTIONS.length) * 100);
  }, [answers]);

  useEffect(() => {
    if (modalOpen) {
      setAnimateBars(false);
      const t = setTimeout(() => setAnimateBars(true), 120);
      return () => clearTimeout(t);
    } else {
      setAnimateBars(false);
    }
  }, [modalOpen]);

  const handleChange = (idx: number, val: number) => {
    const next = [...answers];
    next[idx] = val;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const start = Date.now();
    const filled = answers.map((v) => (v > 0 ? v : 3));
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: filled }),
    });
    const data: Result[] = await res.json();
    if (!Array.isArray(data)) {
      setLoading(false);
      return;
    }
    const elapsed = Date.now() - start;
    if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed));
    setResults(data);
    setLoading(false);
    setModalOpen(true);
  };

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-visible sm:overflow-hidden sm:rounded-3xl sm:bg-white/70 sm:ring-1 sm:ring-black/5 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:backdrop-blur">
        <div className="hidden sm:block pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-sky-400/30 via-indigo-400/20 to-fuchsia-300/20 blur-3xl" />
        <div className="hidden sm:block pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/30 via-indigo-400/20 to-fuchsia-300/20 blur-3xl" />
        <div className="relative p-4 sm:p-10">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white grid place-items-center text-sm font-extrabold">
                AI
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                  영양제 추천 자가진단
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  웰니스박스의 영양제 추천 AI는 ONNX Runtime 기반 딥러닝 모델로
                  작동합니다.
                </p>
              </div>
            </div>
            <div className="hidden sm:block min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>진행도</span>
                <span className="tabular-nums">{completion}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-black/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 sm:hidden">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>진행도</span>
              <span className="tabular-nums">{completion}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-black/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <form className="mt-6 sm:mt-8 space-y-6 sm:space-y-7">
            {QUESTIONS.map((q, i) => (
              <fieldset
                key={i}
                className="group rounded-2xl border border-gray-100 p-3 sm:p-5 hover:border-sky-200 transition"
              >
                <legend className="px-1 text-[15px] sm:text-base font-semibold text-gray-900">
                  {q}
                </legend>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {OPTIONS.map((opt) => {
                    const active = answers[i] === opt.value;
                    return (
                      <label
                        key={opt.value}
                        title={opt.label}
                        className={[
                          "relative cursor-pointer select-none rounded-xl px-3 py-1 text-center ring-1 transition",
                          "bg-white ring-gray-200 hover:bg-gray-50",
                          active ? "ring-2 ring-sky-400 bg-sky-50/60" : "",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name={`q-${i}`}
                          value={opt.value}
                          checked={active}
                          onChange={() => handleChange(i, opt.value)}
                          className="sr-only"
                        />
                        <span className="block h-9 leading-9 text-xs sm:text-[13px] text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis break-keep">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex flex-col items-center sticky bottom-4 sm:bottom-6 mt-8">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                aria-busy={loading}
                className="w-full sm:w-4/5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(56,121,255,0.35)] transition-all hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-60"
              >
                {loading ? "AI가 분석 중..." : "AI 추천 결과 보기"}
              </button>
              <p className="mt-2 text-center text-[11px] text-gray-500">
                미선택 문항은 평균값으로 보정하여 분석합니다.
              </p>
            </div>
          </form>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-sky-500" />
            <p className="text-sm text-gray-100">
              AI가 영양제를 추천하고 있어요...
            </p>
          </div>
        </div>
      )}

      {modalOpen && Array.isArray(results) && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md scale-100 rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(2,6,23,0.25)] ring-1 ring-black/5 animate-[fadeIn_.18s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                AI 추천 결과
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="h-9 w-9 rounded-full bg-gray-100 text-gray-500 grid place-items-center hover:bg-gray-200 focus:outline-none"
              >
                ×
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-600">
              아래는{" "}
              <span className="font-semibold text-sky-600">추천 카테고리</span>
              와 예상 적합도예요.
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              웰니스박스 추천 AI는 ONNX Runtime 기반 딥러닝 모델입니다.
            </p>

            <ul className="mt-5 space-y-3">
              {results.map((r) => (
                <li
                  key={r.label}
                  className="relative overflow-hidden rounded-xl ring-1 ring-gray-100 bg-gray-50"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-200 to-indigo-200 transition-all duration-700 ease-out"
                    style={{
                      width: animateBars
                        ? `${Math.max(8, r.prob * 100)}%`
                        : "0%",
                    }}
                  />
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {r.label}
                    </span>
                    <span className="tabular-nums text-sm font-extrabold text-gray-900">
                      {(r.prob * 100).toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <Link href="/explore" className="mt-6 block">
              <button className="w-full rounded-xl bg-sky-500 px-6 py-2 text-white font-bold shadow hover:bg-sky-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sky-300">
                구매하러 가기
              </button>
            </Link>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.98) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
