"use client";

import { ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import type { UnifiedAction } from "./chatInput.actions";

type ChatInputActionAssistProps = {
  showCoachmark: boolean;
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
        <div className="mx-auto flex max-w-[760px] justify-end px-1">
          <div className="relative max-w-[300px] rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-[0_14px_28px_rgba(15,23,42,0.35)]">
            <p className="text-[12px] font-semibold">
              말로 지시하면 실행까지 바로 이어서 도와드려요
            </p>
            <p className="mt-0.5 text-[11px] text-slate-200">{helperHint}</p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium hover:bg-white/25"
                onClick={() => {
                  onOpenTray();
                  onDismissCoachmark();
                }}
              >
                다시 보기
              </button>
              <button
                type="button"
                className="rounded-full p-0.5 text-slate-200 hover:bg-white/15 hover:text-white"
                onClick={onDismissCoachmark}
                aria-label="힌트 닫기"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 bg-slate-900" />
          </div>
        </div>
      )}

      {showHintPill && (
        <div className="mx-auto max-w-[760px] px-1">
          <div className="flex items-center justify-between gap-2 rounded-full border border-sky-200 bg-sky-50/90 px-3 py-1.5">
            <p className="truncate text-[11px] font-medium text-sky-800">
              장바구니, 주문, 화면 이동까지 빠르게 이어서 도와드릴 수 있어요
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenTray();
                onHideCoachmark();
              }}
              className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
            >
              보기
            </button>
          </div>
        </div>
      )}

      {actionTrayOpen && hasActionOptions && (
        <div className="mx-auto max-w-[760px] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
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
                className={`w-full rounded-2xl border px-3 py-2 text-left text-[11px] font-medium leading-5 whitespace-normal break-words sm:text-xs ${
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
            <div className="mt-2 flex justify-center text-[11px] font-medium text-slate-500">
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
