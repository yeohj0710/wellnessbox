"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

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
    Array(QUESTIONS.length).fill(3)
  );
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [animateBars, setAnimateBars] = useState(false);
  useEffect(() => {
    if (modalOpen) {
      setAnimateBars(false);
      setTimeout(() => setAnimateBars(true), 100);
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
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: answers }),
    });
    const data: Result[] = await res.json();
    const elapsed = Date.now() - start;
    if (elapsed < 3000) {
      await new Promise((resolve) => setTimeout(resolve, 3000 - elapsed));
    }
    setResults(data);
    setLoading(false);
    setModalOpen(true);
  };
  return (
    <div className="w-full max-w-[640px] mt-8 mb-12 mx-auto relative">
      <div className="px-10 pt-10 pb-10 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-gray-800">
          AI에게 영양제 추천받기
        </h1>
        <p className="text-sm text-gray-600 mt-6">
          간단한
          <span className="text-sky-400 font-bold"> 자가진단</span>을 통해
          <span className="text-sky-400 font-bold"> AI</span>에게 영양제 추천을
          받아보세요!
        </p>
        <p className="text-xs text-gray-500 mt-1">
          웰니스박스의 영양제 추천 AI는 ONNX 런타임 기반 딥러닝 모델로
          구현되었습니다.
        </p>
        <form className="mt-8 space-y-6">
          {QUESTIONS.map((q, i) => (
            <fieldset key={i} className="border-b pb-6">
              <legend className="text-gray-700 font-medium text-sm sm:text-base">
                {q}
              </legend>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:space-x-4">
                {OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center space-x-1"
                  >
                    <input
                      type="radio"
                      name={`q-${i}`}
                      value={opt.value}
                      checked={answers[i] === opt.value}
                      onChange={() => handleChange(i, opt.value)}
                      className="text-sky-500 focus:ring-0"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? "로딩 중..." : "결과 확인하기"}
          </button>
        </form>
      </div>
      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-40">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white" />
          <span className="text-white mt-4 text-lg">
            AI가 영양제를 추천하고 있어요...
          </span>
        </div>
      )}
      {modalOpen && results && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 max-w-md relative shadow-xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-5 text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              AI 추천 결과
            </h2>
            <p className="text-sm text-gray-600 mt-6">
              <span className="text-sky-400 font-bold">AI</span>가 추천하는
              <span className="text-sky-400 font-bold"> 영양제 카테고리</span>는
              아래와 같아요.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              웰니스박스의 추천 AI는 ONNX 런타임 기반 딥러닝 모델로
              구현되었어요.
            </p>
            <ul className="mt-4 space-y-2">
              {results.map((r) => (
                <li
                  key={r.label}
                  className="relative bg-gray-100 px-4 py-2 rounded-md overflow-hidden"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-sky-200 transition-all duration-1000 ease-out"
                    style={{ width: animateBars ? `${r.prob * 100}%` : "0%" }}
                  />
                  <div className="relative flex justify-between">
                    <span className="font-medium text-gray-700">{r.label}</span>
                    <span className="font-bold text-gray-800">
                      {(r.prob * 100).toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/">
              <button className="mt-6 w-full py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600">
                구매하러 가기
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
