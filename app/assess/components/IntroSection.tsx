"use client";

import { pageShellClass } from "@/lib/page-shell";

interface Props {
  onStart: () => void;
}

const INTRO_STEPS = [
  {
    id: "1",
    title: "기초 건강 데이터",
    description: "연령, 기본 상태처럼 진단의 기준이 되는 정보를 먼저 확인해요.",
  },
  {
    id: "2",
    title: "생활 습관·증상",
    description: "생활 패턴과 불편감을 바탕으로 필요한 질문을 조금씩 좁혀가요.",
  },
  {
    id: "3",
    title: "세부 진단",
    description: "더 확인이 필요한 부분만 골라서 한 번 더 자세히 살펴봐요.",
  },
];

const INTRO_NOTES = [
  "보통 5~7분 정도 걸리고, 답변에 따라 실제 문항 수는 조금 달라질 수 있어요.",
  "중간에 멈춰도 진행 상황이 이 기기에 저장돼서 다시 들어오면 이어서 할 수 있어요.",
  "결과는 상위 추천 방향부터 먼저 보여드리고, 필요하면 AI 상담으로 자연스럽게 이어갈 수 있어요.",
];

export default function IntroSection({ onStart }: Props) {
  return (
    <div className={pageShellClass("pb-28")}>
      <div className="relative mt-6 overflow-hidden rounded-3xl bg-white/70 p-6 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur sm:mt-10 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.16em] text-sky-600">
              AI ASSESSMENT
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              정밀 AI 진단
            </h1>
            <p className="mt-3 max-w-[32rem] text-sm leading-6 text-gray-600">
              앞쪽 문항도 세부 진단과 같은 흐름으로 차분하게 진행돼요. 필요한
              질문만 순서대로 보여드릴게요.
            </p>
          </div>

          <div className="min-w-[120px]">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>구성</span>
              <span>3단계</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="grid h-full grid-cols-3 gap-[3px]">
                <span className="rounded-full bg-sky-500" />
                <span className="rounded-full bg-sky-400/80" />
                <span className="rounded-full bg-indigo-400/70" />
              </div>
            </div>
            <div className="mt-1 text-[10px] text-sky-600">예상 5~7분</div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {INTRO_STEPS.map((step) => (
            <div
              key={step.id}
              className="rounded-2xl border border-gray-100 bg-white/85 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sm font-bold text-sky-700 ring-1 ring-sky-100">
                  {step.id}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-sky-50/70 px-4 py-4 ring-1 ring-sky-100">
          <div className="space-y-2">
            {INTRO_NOTES.map((note) => (
              <p key={note} className="text-sm leading-6 text-gray-600">
                {note}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-gray-500">
            입력한 내용은 결과를 보기 전까지 이 기기에만 임시 저장돼요.
          </p>
          <button
            onClick={onStart}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(56,121,255,0.28)] transition hover:from-sky-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-sky-200 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none sm:min-w-[220px]"
          >
            설문 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
