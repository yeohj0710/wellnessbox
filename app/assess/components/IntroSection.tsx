"use client";

interface Props {
  onStart: () => void;
}

const INTRO_STEPS = [
  {
    id: "A",
    tone: "bg-sky-50 text-sky-700 ring-sky-100",
    title: "기초 건강 데이터",
    description: "연령, 기본 상태 같은 핵심 정보를 먼저 가볍게 확인해요.",
  },
  {
    id: "B",
    tone: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    title: "생활 습관·증상",
    description: "생활 패턴과 증상을 바탕으로 우선순위를 조금씩 좁혀가요.",
  },
  {
    id: "C",
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
    title: "세부 진단",
    description: "보완이 더 필요해 보이는 부분을 집중적으로 확인해요.",
  },
];

const INTRO_FACTS = [
  {
    title: "예상 소요",
    body: "보통 5~7분 정도 걸려요. 답변 흐름에 따라 실제 문항 수는 조금 달라질 수 있어요.",
  },
  {
    title: "진행 방식",
    body: "이전 답변을 반영해 필요한 질문만 이어지고, 중간에 나갔다가 돌아와도 같은 흐름으로 이어서 진행돼요.",
  },
];

export default function IntroSection({ onStart }: Props) {
  return (
    <div className="mx-auto w-full max-w-[920px] px-3 pb-24 sm:px-4 sm:pb-28">
      <div className="relative mt-4 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:mt-8 sm:rounded-[34px] sm:p-7 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-sky-200/60 blur-3xl sm:h-72 sm:w-72" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-indigo-200/40 blur-3xl sm:h-56 sm:w-56" />

        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-7">
          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 sm:text-xs">
                총 3개 섹션
              </span>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 sm:text-xs">
                예상 5~7분
              </span>
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 sm:text-xs">
                자동 저장
              </span>
            </div>

            <h1 className="mt-4 max-w-[10ch] text-[2.35rem] font-extrabold tracking-[-0.05em] text-slate-900 sm:max-w-none sm:text-5xl sm:leading-[0.95]">
              정밀 AI 진단을 시작해요
            </h1>

            <p className="mt-4 max-w-[32rem] text-[15px] leading-7 text-slate-600 sm:text-lg sm:leading-8">
              설문은 단계별로 진행되고, 이전 답변에 따라 필요한 문항만 이어져요.
              중간에 멈춰도 진행 상황이 브라우저에 저장돼서 다시 이어보기 쉬워요.
            </p>

            <div className="mt-6 grid gap-3">
              {INTRO_STEPS.map((step) => (
                <div
                  key={step.id}
                  className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-100/80 backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-sm font-extrabold ring-1 ${step.tone}`}
                    >
                      {step.id}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900 sm:text-base">
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <button
                onClick={onStart}
                className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-sky-500 to-indigo-500 px-6 py-3 text-base font-extrabold text-white shadow-[0_14px_36px_rgba(59,130,246,0.35)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-sky-200 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none sm:w-auto sm:min-w-[220px]"
              >
                설문 시작하기
              </button>
              <p className="text-sm leading-6 text-slate-500 sm:max-w-[18rem]">
                입력 내용은 브라우저에 임시 저장되며, 결과를 보기 전까지 서버로 전송되지 않아요.
              </p>
            </div>
          </section>

          <aside className="grid content-start gap-3 sm:gap-4">
            {INTRO_FACTS.map((fact) => (
              <div
                key={fact.title}
                className="rounded-[24px] border border-slate-200/90 bg-white/88 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur"
              >
                <p className="text-base font-bold text-slate-900">{fact.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-[15px]">
                  {fact.body}
                </p>
              </div>
            ))}

            <div className="rounded-[24px] border border-slate-200/90 bg-slate-50/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <p className="text-[13px] leading-6 text-slate-600 sm:text-sm">
                결과는 상위 3개 카테고리와 적합도를 중심으로 먼저 보여드리고,
                필요하면 이후 추천 상품 비교나 약사 상담으로 자연스럽게 이어갈 수 있어요.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
