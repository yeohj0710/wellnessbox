"use client";

import Link from "next/link";
import GuestMemberBridgeCard from "@/components/common/GuestMemberBridgeCard";
import PersonalizedTrustPanel from "@/components/common/PersonalizedTrustPanel";
import PersonalizedValuePropositionCard from "@/components/common/PersonalizedValuePropositionCard";
import { useLoading } from "@/components/common/loadingContext.client";
import { CheckAiAnimationStyles } from "@/components/check-ai/CheckAiAnimationStyles";
import { pageShellClass } from "@/lib/page-shell";
import { CheckAiQuestionField } from "./CheckAiQuestionField";
import { useCheckAiExperience } from "./useCheckAiExperience";

type CheckAiProgressSummaryProps = {
  answeredCount: number;
  remainingCount: number;
  canSubmit: boolean;
  minPreviewAnswers: number;
  previewLabels: string[];
  previewLoading: boolean;
  questionCount: number;
  className?: string;
};

function CheckAiProgressSummary({
  answeredCount,
  remainingCount,
  canSubmit,
  minPreviewAnswers,
  previewLabels,
  previewLoading,
  questionCount,
  className,
}: CheckAiProgressSummaryProps) {
  if (answeredCount <= 0) {
    return null;
  }

  return (
    <div
      className={[
        "rounded-[28px] border border-sky-100/80 bg-[linear-gradient(180deg,rgba(249,252,255,0.98),rgba(241,246,255,0.95))] p-5 shadow-[0_20px_60px_rgba(74,110,255,0.10)] backdrop-blur",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-extrabold leading-8 text-slate-900">
            {canSubmit
              ? "답변이 모두 모여 결과를 바로 확인하실 수 있어요"
              : `남은 ${remainingCount}문항만 더 답하면 결과를 더 정확하게 보여드릴 수 있어요`}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {answeredCount < minPreviewAnswers
              ? "몇 문항만 더 답해주시면 지금 보이는 방향이 조금 더 또렷해져요."
              : previewLabels.length > 0
              ? `지금까지는 ${previewLabels.join(", ")} 쪽 가능성을 먼저 보고 있어요. 끝까지 답하시면 추천 이유를 더 안정적으로 정리해드릴게요.`
              : previewLoading
              ? "지금까지 답해주신 내용을 바탕으로 추천 방향을 정리하고 있어요."
              : "답변 흐름을 바탕으로 추천 방향을 차분히 정리하고 있어요."}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-sky-100 bg-white px-3 py-1.5 text-base font-extrabold text-sky-700 shadow-sm">
          {answeredCount}/{questionCount}
        </span>
      </div>

      {previewLabels.length > 0 || previewLoading ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {previewLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm"
            >
              {label}
            </span>
          ))}
          {previewLoading ? (
            <span className="rounded-full border border-sky-100 bg-white/90 px-3 py-1.5 text-sm font-medium text-sky-700">
              업데이트 중
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CheckAiProgressBar({ completion }: { completion: number }) {
  return (
    <div className="w-full rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur sm:min-w-[220px] sm:max-w-[240px]">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>진행률</span>
        <span className="font-semibold text-slate-800">{completion}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-[width] duration-500"
          style={{ width: `${completion}%` }}
        />
      </div>
    </div>
  );
}

export default function CheckAI() {
  const { showLoading } = useLoading();
  const {
    answers,
    results,
    loading,
    modalOpen,
    animateBars,
    draftRestored,
    previewLoading,
    resultModalDrag,
    answeredCount,
    remainingCount,
    canSubmit,
    completion,
    previewLabels,
    recommendedIds,
    minPreviewAnswers,
    trustSummary,
    valueProposition,
    guestBridgeModel,
    QUESTIONS,
    OPTIONS,
    handleChange,
    handleSubmit,
    openValueAction,
    setModalOpen,
  } = useCheckAiExperience({ showLoading });

  return (
    <div className={pageShellClass("pb-28")}>
      <section className="relative mt-6 overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,255,0.92))] shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:mt-10">
        <div className="pointer-events-none absolute -right-24 -top-24 hidden h-80 w-80 rounded-full bg-gradient-to-br from-sky-400/25 via-indigo-300/20 to-cyan-200/20 blur-3xl sm:block" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 hidden h-80 w-80 rounded-full bg-gradient-to-tr from-white via-sky-200/30 to-indigo-300/15 blur-3xl sm:block" />

        <div className="relative p-5 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(59,130,246,0.30)]">
                AI
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-700 shadow-sm">
                  QUICK CHECK
                </div>
                <h1 className="mt-3 text-[clamp(1.8rem,3vw,2.7rem)] font-extrabold tracking-tight text-slate-900">
                  영양제 추천 빠른검사
                </h1>
                <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
                  웰니스박스 추천 AI가 답변 흐름을 보면서 먼저 방향을
                  잡아드려요.
                </p>
                <p className="mt-1 text-[13px] leading-6 text-slate-500 sm:text-sm">
                  가볍게 시작하셔도 되고, 끝까지 답하실수록 추천 정확도가 더
                  안정적으로 올라가요.
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm lg:w-auto">
              <CheckAiProgressBar completion={completion} />
            </div>
          </div>

          {draftRestored && answeredCount > 0 ? (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-800">
              이전에 답하신 내용이 남아 있어 이어서 진행하실 수 있어요.
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_320px_minmax(0,1fr)] xl:items-start xl:gap-8">
        <section className="min-w-0 xl:col-start-2">
          <div className="mx-auto w-full max-w-3xl">
            <CheckAiProgressSummary
              answeredCount={answeredCount}
              remainingCount={remainingCount}
              canSubmit={canSubmit}
              minPreviewAnswers={minPreviewAnswers}
              previewLabels={previewLabels}
              previewLoading={previewLoading}
              questionCount={QUESTIONS.length}
              className="mb-5 xl:hidden"
            />

            <div className="rounded-[32px] border border-black/5 bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
              <form
                id="check-ai-form"
                className="space-y-6 sm:space-y-7"
              >
                {QUESTIONS.map((question, index) => (
                  <CheckAiQuestionField
                    key={index}
                    index={index}
                    question={question}
                    options={OPTIONS}
                    value={answers[index]}
                    onChange={handleChange}
                  />
                ))}

                <div className="sticky bottom-3 z-10 -mx-1 rounded-[28px] bg-white/92 px-1 pb-1 pt-4 backdrop-blur supports-[backdrop-filter]:bg-white/78 sm:bottom-5 sm:bg-white/90">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    aria-busy={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-3 text-base font-extrabold text-white shadow-[0_14px_36px_rgba(56,121,255,0.32)] transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-60"
                  >
                    {loading
                      ? "AI가 답변을 정리하고 있어요..."
                      : canSubmit
                      ? "AI 추천 결과 보기"
                      : "지금 답변으로 먼저 결과 보기"}
                  </button>
                  <p className="mt-3 text-center text-[13px] leading-6 text-slate-500 sm:text-sm">
                    {canSubmit
                      ? "모든 문항을 답해주셔서 결과를 더 안정적으로 보여드릴 수 있어요."
                      : "비어 있는 문항은 보통값으로 보고 먼저 결과를 보여드려요. 끝까지 답하시면 추천 이유를 더 또렷하게 정리해드릴게요."}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>

        {answeredCount > 0 ? (
          <aside className="hidden xl:col-start-3 xl:block xl:self-start">
            <div className="sticky top-24">
              <CheckAiProgressSummary
                answeredCount={answeredCount}
                remainingCount={remainingCount}
                canSubmit={canSubmit}
                minPreviewAnswers={minPreviewAnswers}
                previewLabels={previewLabels}
                previewLoading={previewLoading}
                questionCount={QUESTIONS.length}
              />
            </div>
          </aside>
        ) : null}
      </div>

      {loading ? (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-0 animate-[pulseGlow_4s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(56,121,255,0.12),transparent_70%)]" />
          <div className="relative z-10 grid h-full w-full place-items-center p-6">
            <div className="flex flex-col items-center">
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 animate-[spin_2.8s_linear_infinite] rounded-full [background:conic-gradient(from_0deg,theme(colors.sky.400),theme(colors.indigo.500),theme(colors.sky.400))] [mask:radial-gradient(farthest-side,transparent_64%,#000_65%)]" />
                <div className="absolute inset-3 grid place-items-center rounded-2xl bg-white/10 text-lg font-extrabold text-white ring-1 ring-inset ring-white/20 backdrop-blur">
                  AI
                </div>
                <div className="absolute inset-0 animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full ring-2 ring-sky-400/30" />
              </div>
              <p className="mt-6 text-center text-sm leading-7 text-white/90">
                AI가 답변 흐름을 바탕으로 추천 방향을 정리하고 있어요.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-2 w-2 animate-[dotBounce_1.2s_ease-in-out_infinite] rounded-full bg-white/90" />
                <span className="h-2 w-2 animate-[dotBounce_1.2s_ease-in-out_infinite] rounded-full bg-white/70 [animation-delay:.15s]" />
                <span className="h-2 w-2 animate-[dotBounce_1.2s_ease-in-out_infinite] rounded-full bg-white/60 [animation-delay:.3s]" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen && Array.isArray(results) ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="flex max-h-[min(88vh,860px)] w-full max-w-lg scale-100 flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(2,6,23,0.25)] ring-1 ring-black/5 animate-[fadeIn_.18s_ease-out]"
            ref={resultModalDrag.panelRef}
            style={resultModalDrag.panelStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`flex touch-none items-start justify-between ${
                resultModalDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              onPointerDown={resultModalDrag.handleDragPointerDown}
            >
              <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">
                AI 추천 결과
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-lg text-gray-500 hover:bg-gray-200 focus:outline-none"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="text-sm text-gray-600">
                아래 추천 카테고리 순서대로 먼저 비교해보시면 좋아요.
              </p>
              <p className="mt-1 text-[13px] leading-5 text-gray-500 sm:text-sm">
                상품 구성과 복용 맥락은 탐색 화면에서 이어서 자세히 확인하실 수
                있어요.
              </p>

              <ul className="mt-5 space-y-3">
                {results.map((result) => (
                  <li
                    key={result.code ?? result.label}
                    className="relative overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-200 to-indigo-200 transition-all duration-700 ease-out"
                      style={{
                        width: animateBars
                          ? `${Math.max(8, result.prob * 100)}%`
                          : "0%",
                      }}
                    />
                    <div className="relative flex items-center justify-between px-4 py-3">
                      <span className="text-base font-semibold text-gray-800">
                        {result.label}
                      </span>
                      <span className="tabular-nums text-base font-extrabold text-gray-900">
                        {(result.prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-3">
                <PersonalizedValuePropositionCard
                  model={valueProposition}
                  compact
                  onPrimaryAction={() =>
                    openValueAction(valueProposition.primaryAction.target)
                  }
                  onSecondaryAction={
                    valueProposition.secondaryAction
                      ? () =>
                          openValueAction(
                            valueProposition.secondaryAction!.target
                          )
                      : undefined
                  }
                />

                <PersonalizedTrustPanel summary={trustSummary} compact />

                {guestBridgeModel ? (
                  <GuestMemberBridgeCard model={guestBridgeModel} compact />
                ) : null}
              </div>
            </div>

            <Link
              href={`/explore${
                recommendedIds.length
                  ? `?categories=${recommendedIds.join(",")}`
                  : ""
              }#home-products`}
              scroll={false}
              className="mt-5 block"
              onClick={showLoading}
            >
              <button className="w-full rounded-xl bg-sky-500 px-6 py-2.5 font-bold text-white shadow hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-300">
                추천 상품 보러 가기
              </button>
            </Link>
          </div>
        </div>
      ) : null}

      <CheckAiAnimationStyles />
    </div>
  );
}
