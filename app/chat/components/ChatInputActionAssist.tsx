"use client";

import { ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import AutoDismissTimerBar from "@/components/common/AutoDismissTimerBar";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import type { UnifiedAction } from "./chatInput.actions";

type ChatInputActionAssistProps = {
  showCoachmark: boolean;
  coachmarkDurationMs: number;
  showHintPill: boolean;
  helperHint: string;
  actionTrayOpen: boolean;
  hasActionOptions: boolean;
  quickActionDisabled: boolean;
  quickActionLoading: boolean;
  unifiedActions: UnifiedAction[];
  onOpenTray: () => void;
  onCloseTray: () => void;
  onHideCoachmark: () => void;
  onDismissCoachmark: () => void;
  onRunUnifiedAction: (action: UnifiedAction) => void;
};

export function ChatInputActionAssist({
  showCoachmark,
  coachmarkDurationMs,
  showHintPill,
  helperHint,
  actionTrayOpen,
  hasActionOptions,
  quickActionDisabled,
  quickActionLoading,
  unifiedActions,
  onOpenTray,
  onCloseTray,
  onHideCoachmark,
  onDismissCoachmark,
  onRunUnifiedAction,
}: ChatInputActionAssistProps) {
  return (
    <>
      {showCoachmark && (
        <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-3 flex justify-end">
          <div className="pointer-events-auto relative w-[min(19.5rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-slate-700/70 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.16),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.94)_100%)] px-4 py-3 text-white shadow-[0_20px_44px_rgba(15,23,42,0.34)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <p className="text-[14px] font-semibold leading-5">
              말로 지시하면 실행까지 바로 이어서 도와드려요
            </p>
            <p className="mt-1.5 text-[13px] leading-5 text-slate-200/90">
              {helperHint}
            </p>

            <AutoDismissTimerBar
              durationMs={coachmarkDurationMs}
              className="mt-3"
              label="자동으로 닫혀요"
              labelClassName="text-slate-300/85"
              countdownClassName="text-slate-100"
              trackClassName="bg-white/10 ring-1 ring-inset ring-white/8"
              barClassName="bg-[linear-gradient(90deg,rgba(125,211,252,0.98)_0%,rgba(103,232,249,0.92)_58%,rgba(255,255,255,0.82)_100%)] shadow-[0_0_18px_rgba(103,232,249,0.32)]"
            />

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-white/92 transition hover:border-white/20 hover:bg-white/18"
                onClick={() => {
                  onOpenTray();
                  onDismissCoachmark();
                }}
              >
                다시 보기
              </button>
              <button
                type="button"
                className="rounded-full p-1 text-slate-200 transition hover:bg-white/12 hover:text-white"
                onClick={onDismissCoachmark}
                aria-label="힌트 닫기"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-b border-r border-slate-700/70 bg-slate-900" />
          </div>
        </div>
      )}

      {showHintPill && (
        <div className="mx-auto max-w-[760px] px-1">
          <div className="flex items-center justify-between gap-2 rounded-full border border-sky-200 bg-sky-50/90 px-3 py-1.5">
            <p className="min-w-0 flex-1 pr-1 text-[13px] font-medium leading-5 text-sky-800 sm:text-sm">
              장바구니, 주문, 화면 이동까지 빠르게 이어서 도와드릴 수 있어요
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenTray();
                onHideCoachmark();
              }}
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-sky-700 hover:bg-sky-100"
            >
              보기
            </button>
          </div>
        </div>
      )}

      {actionTrayOpen && hasActionOptions && (
        <div className="mx-auto max-w-[760px] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              빠른 실행
            </p>
            <button
              type="button"
              onClick={onCloseTray}
              className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
              aria-label="액션 닫기"
            >
              <ChevronUpIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {unifiedActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`w-full rounded-2xl border px-3 py-2.5 text-left text-[13px] font-medium leading-5 whitespace-normal break-words sm:text-sm ${
                  action.kind === "quick"
                    ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                    : action.kind === "agent"
                      ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                } ${quickActionDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                onClick={() => onRunUnifiedAction(action)}
                title={action.title || action.label}
                disabled={quickActionDisabled}
              >
                {action.label}
              </button>
            ))}
          </div>
          {quickActionLoading && (
            <div className="mt-2 flex justify-center text-[13px] font-medium text-slate-500">
              <InlineSpinnerLabel
                label="요청 동작 실행 중"
                className="text-slate-500"
                spinnerClassName="text-slate-400"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
