import {
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";

interface LinkedPhoneLookupSectionProps {
  hasVerifiedPhone: boolean;
  phoneStatusLoading: boolean;
  phoneStatusError: string | null;
  linkedPhoneDisplay: string;
  onOpenVerify: () => void;
  onLinkedLookup: () => void;
  onDismissLinkedView: () => void;
}

export function LinkedPhoneLookupSection({
  hasVerifiedPhone,
  phoneStatusLoading,
  phoneStatusError,
  linkedPhoneDisplay,
  onOpenVerify,
  onLinkedLookup,
  onDismissLinkedView,
}: LinkedPhoneLookupSectionProps) {
  return (
    <section className="rounded-[1.75rem] border border-sky-200 bg-[linear-gradient(180deg,rgba(240,247,255,0.98),rgba(255,255,255,0.98))] p-5 shadow-[0_18px_36px_-30px_rgba(59,91,255,0.35)] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-sky-600 ring-1 ring-sky-100 shadow-sm">
          {phoneStatusLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
          ) : hasVerifiedPhone ? (
            <CheckCircleIcon className="h-6 w-6" />
          ) : (
            <ShieldCheckIcon className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black tracking-tight text-slate-950">
              전화번호 인증
            </h2>
            {hasVerifiedPhone ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                인증 완료
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
                더 빠른 조회
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            {hasVerifiedPhone
              ? "인증된 번호로 바로 주문을 찾아보세요."
              : "내 번호 인증하면 비밀번호 없이 조회할 수 있어요."}
          </p>
        </div>
      </div>

      {phoneStatusError ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {phoneStatusError}
        </p>
      ) : null}

      {hasVerifiedPhone ? (
        <div className="mt-4 flex flex-col gap-3 rounded-[1.35rem] border border-slate-200 bg-white/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[0.14em] text-slate-400">
              VERIFIED PHONE
            </div>
            <div className="mt-1 text-xl font-black tracking-tight text-slate-950">
              {linkedPhoneDisplay}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={onLinkedLookup}
              disabled={phoneStatusLoading}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              이 번호로 주문 조회
            </button>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={onOpenVerify}
                className="text-slate-500 transition hover:text-sky-700"
              >
                번호 다시 인증
              </button>
              <button
                type="button"
                onClick={onDismissLinkedView}
                className="text-slate-500 transition hover:text-slate-800"
              >
                다른 번호로 조회
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            인증하면 다음부터 더 간편하게 볼 수 있어요.
          </div>
          <button
            type="button"
            onClick={onOpenVerify}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
          >
            전화번호 인증하기
          </button>
        </div>
      )}
    </section>
  );
}
