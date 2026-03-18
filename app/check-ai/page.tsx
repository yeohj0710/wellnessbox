"use client";

import Link from "next/link";
import GuestMemberBridgeCard from "@/components/common/GuestMemberBridgeCard";
import PersonalizedTrustPanel from "@/components/common/PersonalizedTrustPanel";
import PersonalizedValuePropositionCard from "@/components/common/PersonalizedValuePropositionCard";
import { useLoading } from "@/components/common/loadingContext.client";
import { CheckAiAnimationStyles } from "@/components/check-ai/CheckAiAnimationStyles";
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
        "rounded-3xl bg-gradient-to-r from-sky-50 to-indigo-50 px-4 py-4 ring-1 ring-sky-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-900">
            {canSubmit
              ? "결과를 볼 준비가 됐어요"
              : `남은 ${remainingCount}문항만 더 답하면 결과를 더 정확하게 보여드릴 수 있어요`}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            {answeredCount < minPreviewAnswers
              ? "몇 문항만 더 답하면 지금 어느 방향을 보고 있는지 먼저 보여드릴게요."
              : previewLabels.length > 0
              ? `지금까지는 ${previewLabels.join(", ")} 쪽 가능성을 더 보고 있어요. 끝까지 답하면 추천 품질이 더 안정적이에요.`
              : previewLoading
              ? "지금까지 답한 흐름으로 추천 방향을 정리하고 있어요."
              : "답변이 쌓일수록 추천 방향이 더 또렷해져요."}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
          {answeredCount}/{questionCount}
        </span>
      </div>

      {previewLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {previewLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
            >
              {label}
            </span>
          ))}
          {previewLoading ? (
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
              업데이트 중
            </span>
          ) : null}
        </div>
      ) : null}
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
    <div className="mx-auto w-full max-w-[1160px] px-2 pb-28 sm:px-4">
      <div className="relative mt-6 overflow-visible sm:mt-10 sm:overflow-hidden sm:rounded-3xl sm:bg-white/70 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:ring-1 sm:ring-black/5 sm:backdrop-blur">
        <div className="pointer-events-none absolute -right-24 -top-24 hidden h-80 w-80 rounded-full bg-gradient-to-br from-sky-400/30 via-indigo-400/20 to-fuchsia-300/20 blur-3xl sm:block" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 hidden h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/30 via-indigo-400/20 to-fuchsia-300/20 blur-3xl sm:block" />

        <div className="relative p-4 sm:p-10">
          <div className="flex items-start justify-between gap-4 sm:items-center">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-extrabold text-white">
                AI
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  영양제 추천 빠른검사
                </h1>
                <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                  웰니스박스 추천 AI가 답변 흐름을 보면서 방향을 먼저 잡아드려요.
                </p>
                <p className="mt-2 text-[11px] text-gray-500 sm:text-xs">
                  전부 답할수록 추천 정확도가 더 안정적으로 올라가요.
                </p>
              </div>
            </div>

            <div className="hidden min-w-[200px] sm:block">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>진행률</span>
                <span className="font-semibold text-gray-700">{completion}%</span>
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
              <span>진행률</span>
              <span className="font-semibold text-gray-700">{completion}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-black/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          {draftRestored && answeredCount > 0 ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800 ring-1 ring-emerald-100">
              이전에 답하던 내용이 남아 있어 이어서 진행하고 있어요.
            </div>
          ) : null}

          <div className="mt-6 xl:mt-8 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-8">
            <div className="min-w-0">
              <CheckAiProgressSummary
                answeredCount={answeredCount}
                remainingCount={remainingCount}
                canSubmit={canSubmit}
                minPreviewAnswers={minPreviewAnswers}
                previewLabels={previewLabels}
                previewLoading={previewLoading}
                questionCount={QUESTIONS.length}
                className="xl:hidden"
              />

              <form
                id="check-ai-form"
                className={answeredCount > 0 ? "mt-6 space-y-6 sm:space-y-7" : "space-y-6 sm:space-y-7"}
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

                <div className="sticky bottom-4 mt-8 flex flex-col items-center sm:bottom-6">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    aria-busy={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-2.5 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(56,121,255,0.35)] transition-all hover:from-sky-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-60 sm:w-4/5"
                  >
                    {loading
                      ? "AI가 분석 중이에요..."
                      : canSubmit
                      ? "AI 추천 결과 보기"
                      : "지금 바로 결과 보기"}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-gray-500">
                    {canSubmit
                      ? "모든 문항에 답한 상태라 결과 신뢰도가 가장 높아요."
                      : "비어 있는 문항은 보통값으로 보고 먼저 결과를 보여드릴 수 있어요. 끝까지 답하면 추천이 더 안정적이에요."}
                  </p>
                </div>
              </form>
            </div>

            {answeredCount > 0 ? (
              <aside className="hidden xl:block">
                <div className="sticky top-24">
                  <CheckAiProgressSummary
                    answeredCount={answeredCount}
                    remainingCount={remainingCount}
                    canSubmit={canSubmit}
                    minPreviewAnswers={minPreviewAnswers}
                    previewLabels={previewLabels}
                    previewLoading={previewLoading}
                    questionCount={QUESTIONS.length}
                    className="bg-gradient-to-br from-white via-sky-50 to-indigo-50 px-5 py-5 shadow-[0_18px_40px_rgba(56,121,255,0.12)]"
                  />
                </div>
              </aside>
            ) : null}
          </div>
        </div>
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
              <p className="mt-6 text-sm text-white/90">
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
                className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 focus:outline-none"
              >
                ×
              </button>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="text-sm text-gray-600">
                아래 추천 카테고리 순서대로 먼저 비교해보세요.
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                더 자세한 추천이 필요하면 정밀검사로 이어서 확인할 수 있어요.
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
                      <span className="text-sm font-semibold text-gray-800">
                        {result.label}
                      </span>
                      <span className="tabular-nums text-sm font-extrabold text-gray-900">
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
                      ? () => openValueAction(valueProposition.secondaryAction!.target)
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
