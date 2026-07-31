"use client";

import {
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export function MessageLoadingCard({ hint }: { hint: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-[min(92vw,31rem)] rounded-[1.35rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-4 py-3.5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.24)] sm:max-w-[28rem] sm:px-4.5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 ring-1 ring-sky-100">
          <div className="inline-flex items-center justify-center gap-1">
            <span className="h-1.25 w-1.25 animate-[wb-dot_1.2s_ease-in-out_infinite] rounded-full bg-sky-500" />
            <span
              className="h-1.25 w-1.25 animate-[wb-dot_1.2s_ease-in-out_infinite] rounded-full bg-sky-500"
              style={{ animationDelay: "0.18s" }}
            />
            <span
              className="h-1.25 w-1.25 animate-[wb-dot_1.2s_ease-in-out_infinite] rounded-full bg-sky-500"
              style={{ animationDelay: "0.36s" }}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-600">
            Loading
          </p>
          <p className="mt-1 min-w-0 text-pretty break-keep text-[13px] font-medium leading-6 text-slate-700 sm:text-[14px]">
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A failed turn. Styled unlike an answer on purpose - the copy is service text,
 * not something the assistant concluded, and the user needs one obvious way out.
 */
export function MessageErrorCard({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="w-full max-w-[min(92vw,31rem)] rounded-[1.35rem] border border-rose-200 bg-rose-50/70 px-4 py-3.5 sm:max-w-[28rem]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <ExclamationCircleIcon
          className="mt-0.5 h-5 w-5 shrink-0 text-rose-500"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="min-w-0 break-keep text-[13px] font-medium leading-6 text-rose-900 sm:text-[14px]">
            {message}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowPathIcon
                className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`}
                aria-hidden
              />
              {retrying ? "다시 시도하는 중" : "다시 시도"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Footer for a turn the user stopped. The partial answer stays readable above
 * it, so this only explains why it ends abruptly and offers to finish.
 */
export function MessageStoppedFooter({
  onRetry,
  retrying,
}: {
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
        답변이 중단되었어요
      </span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon
            className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`}
            aria-hidden
          />
          다시 생성
        </button>
      ) : null}
    </div>
  );
}
