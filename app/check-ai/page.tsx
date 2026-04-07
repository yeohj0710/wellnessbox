"use client";

import Link from "next/link";
import ModalLayer from "@/components/common/modalLayer";
import { useLoading } from "@/components/common/loadingContext.client";
import { CheckAiAnimationStyles } from "@/components/check-ai/CheckAiAnimationStyles";
import { CheckAiQuestionField } from "./CheckAiQuestionField";
import { useCheckAiExperience } from "./useCheckAiExperience";

function CheckAiProgressBar({
  completion,
  answeredCount,
  totalCount,
}: {
  completion: number;
  answeredCount: number;
  totalCount: number;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-sky-600">
            진행률
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {answeredCount} / {totalCount} 문항 답변
          </p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">
          {completion}%
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/80">
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
    resultModalDrag,
    answeredCount,
    canSubmit,
    completion,
    recommendedIds,
    QUESTIONS,
    OPTIONS,
    handleChange,
    handleSubmit,
    setModalOpen,
  } = useCheckAiExperience({ showLoading });

  return (
    <div className="px-4 pb-28 sm:px-6">
      <section className="mx-auto w-full max-w-[760px]">
        <div className="mt-6 sm:mt-10">
          <CheckAiProgressBar
            completion={completion}
            answeredCount={answeredCount}
            totalCount={QUESTIONS.length}
          />
        </div>

        <section className="relative mt-4 overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,rgba(240,249,255,0.92),rgba(255,255,255,0.98)_38%,rgba(243,247,255,0.96)_68%,rgba(239,246,255,0.94))] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(125,211,252,0.22),transparent_34%),radial-gradient(circle_at_58%_24%,rgba(165,180,252,0.18),transparent_26%),radial-gradient(circle_at_88%_22%,rgba(186,230,253,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0))]" />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-100/80 to-transparent" />
          <div className="pointer-events-none absolute -left-14 top-16 hidden h-36 w-36 rounded-full bg-sky-100/35 blur-3xl sm:block" />
          <div className="pointer-events-none absolute -right-20 top-0 hidden h-44 w-44 rounded-full bg-indigo-100/35 blur-3xl sm:block" />
          <div className="relative p-5 sm:p-8">
            <span className="inline-flex items-center rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-sky-700 shadow-sm">
              빠른 검사
            </span>
            <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.8rem)] font-extrabold tracking-tight text-slate-900">
              나에게 맞는 영양제 찾기
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              간단한 질문에 답하면 맞춤 영양제를 추천해 드려요.
            </p>

            {draftRestored && answeredCount > 0 ? (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-800">
                이전에 입력하던 답변을 이어서 볼 수 있어요.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5">
          <div className="rounded-[32px] border border-black/5 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
            <form id="check-ai-form" className="space-y-4 sm:space-y-5">
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

              <div className="sticky bottom-3 z-10 -mx-1 rounded-[28px] border border-slate-200/80 bg-white/95 px-4 pb-4 pt-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:bottom-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      지금 답변으로 먼저 추천을 볼 수 있어요.
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-slate-500">
                      답하지 않은 문항은 보통이에요 기준으로 먼저 보여드려요.
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 sm:inline-flex">
                    {completion}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  aria-busy={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-3 text-base font-extrabold text-white shadow-[0_14px_36px_rgba(56,121,255,0.32)] transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-60"
                >
                  {loading
                    ? "추천을 준비하고 있어요..."
                    : canSubmit
                      ? "추천 결과 보기"
                      : "지금 답변으로 결과 보기"}
                </button>
                <p className="mt-3 text-center text-[13px] leading-6 text-slate-500 sm:text-sm">
                  {canSubmit
                    ? "답변을 모두 반영해 결과를 더 정확하게 정리했어요."
                    : "가볍게 시작해도 괜찮아요. 답변을 더할수록 추천이 더 또렷해져요."}
                </p>
              </div>
            </form>
          </div>
        </section>

        <ModalLayer open={loading}>
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="absolute inset-0 animate-[pulseGlow_4s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(56,121,255,0.12),transparent_70%)]" />
            <div className="relative z-10 grid h-full w-full place-items-center p-6">
              <div className="flex flex-col items-center">
                <div className="relative h-28 w-28">
                  <div className="absolute inset-0 animate-[spin_2.8s_linear_infinite] rounded-full [background:conic-gradient(from_0deg,theme(colors.sky.400),theme(colors.indigo.500),theme(colors.sky.400))] [mask:radial-gradient(farthest-side,transparent_64%,#000_65%)]" />
                  <div className="absolute inset-5 rounded-full bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur" />
                  <div className="absolute inset-[38%] rounded-full bg-white" />
                  <div className="absolute inset-0 animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full ring-2 ring-sky-400/30" />
                </div>
                <p className="mt-6 text-center text-sm leading-7 text-white/90">
                  답변을 바탕으로 추천을 정리하고 있어요.
                </p>
                <p className="mt-1 text-center text-[13px] text-white/70">
                  잠시만 기다려 주세요.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2 w-2 animate-[dotBounce_1.2s_ease-in-out_infinite] rounded-full bg-white/90" />
                  <span className="h-2 w-2 animate-[dotBounce_1.2s_ease-in-out_infinite] rounded-full bg-white/70 [animation-delay:.15s]" />
                  <span className="h-2 w-2 animate-[dotBounce_1.2s_ease-in-out_infinite] rounded-full bg-white/60 [animation-delay:.3s]" />
                </div>
              </div>
            </div>
          </div>
        </ModalLayer>

        <ModalLayer open={modalOpen && Array.isArray(results)}>
          <div
            className="fixed inset-0 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
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
                  추천 결과
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
                  답변을 바탕으로 잘 맞는 카테고리부터 정리했어요.
                </p>
                <p className="mt-1 text-[13px] leading-5 text-gray-500 sm:text-sm">
                  상품 구성과 복용 방식은 다음 화면에서 이어서 볼 수 있어요.
                </p>

                <ul className="mt-5 space-y-3">
                  {results?.map((result) => (
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

                {/* Beta 카드들은 잠시 비노출. 필요하면 아래 블록 주석 해제해서 바로 복구 가능.
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
                */}
              </div>

              <Link
                href={`/explore${
                  recommendedIds.length
                    ? `?categories=${recommendedIds.join(",")}`
                    : ""
                }#home-products`}
                scroll={false}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-center font-bold text-white shadow transition hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-300"
                onClick={showLoading}
              >
                추천 상품 보러 가기
              </Link>
            </div>
          </div>
        </ModalLayer>
      </section>

      <CheckAiAnimationStyles />
    </div>
  );
}
