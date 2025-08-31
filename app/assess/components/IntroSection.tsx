"use client";

interface Props {
  onStart: () => void;
}

export default function IntroSection({ onStart }: Props) {
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
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">정밀 AI 진단을 시작해요</h1>
            <p className="mt-3 text-sm sm:text-base leading-6 text-gray-600">
              설문은 단계별로 진행되고 이전 답변에 따라 문항이 달라져요.
              중간에 이탈해도 진행 상황이 브라우저에 저장돼요.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-sky-50 text-sky-600 text-xs font-bold">A</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">기초 건강 데이터</p>
                  <p className="text-xs text-gray-600">연령, 기본 상태 등 핵심 정보를 확인해요.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">B</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">생활 습관·증상</p>
                  <p className="text-xs text-gray-600">생활 패턴과 증상을 바탕으로 우선순위를 좁혀요.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-violet-50 text-violet-600 text-xs font-bold">C</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">세부 진단</p>
                  <p className="text-xs text-gray-600">보완이 필요하다고 판단되는 부분을 집중적으로 분석해요.</p>
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-2">
              <button
                onClick={onStart}
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
                보통 5–7분 정도 걸려요. 개인화에 따라 문항 수가 달라질 수 있어요.
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
