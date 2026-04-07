"use client";

interface Props {
  onStart: () => void;
}

const INTRO_STEPS = [
  {
    id: "01",
    title: "기본 정보 입력",
    description: "나이, 성별 등 간단한 정보를 알려주세요.",
  },
  {
    id: "02",
    title: "생활 습관 체크",
    description: "평소 생활 패턴과 불편한 점을 체크해 주세요.",
  },
  {
    id: "03",
    title: "상세 확인",
    description: "추가로 확인이 필요한 부분만 몇 가지 더 여쭤봐요.",
  },
];

export default function IntroSection({ onStart }: Props) {
  return (
    <section className="w-full max-w-[640px] mx-auto pb-28">
      <div className="relative mt-6 overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.96))] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:mt-10 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(56,189,248,0.10),rgba(99,102,241,0.08),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute -right-16 top-0 hidden h-36 w-36 rounded-full bg-sky-200/25 blur-3xl sm:block" />

        <div className="relative">
          <span className="inline-flex items-center rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-sky-700 shadow-sm">
            정밀 진단
          </span>
          <h1 className="mt-4 break-keep text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-tight text-slate-900">
            맞춤 영양 진단
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            몇 가지 질문에 답하면 맞춤 영양제를 추천해 드려요.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            약 5~7분 소요 · 중간에 나가도 저장돼요.
          </p>
        </div>

        <div className="relative mt-8">
          <div className="hidden sm:block">
            <div className="absolute left-[9%] right-[9%] top-5 h-px bg-[linear-gradient(90deg,rgba(148,163,184,0.18),rgba(56,189,248,0.35),rgba(99,102,241,0.28),rgba(148,163,184,0.18))]" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {INTRO_STEPS.map((step) => (
              <div
                key={step.id}
                className="relative rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(56,121,255,0.24)]">
                    {step.id}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">
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
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">3단계로 차근차근 진행돼요.</p>
          <button
            onClick={onStart}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(56,121,255,0.28)] transition hover:from-sky-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-sky-200 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none sm:min-w-[220px]"
          >
            진단 시작
          </button>
        </div>
      </div>
    </section>
  );
}
