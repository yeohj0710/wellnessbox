interface LinkedPhoneLookupSectionProps {
  isPhoneLinked: boolean;
  phoneStatusLoading: boolean;
  phoneStatusError: string | null;
  linkedPhoneDisplay: string;
  onOpenVerify: () => void;
  onLinkedLookup: () => void;
  onDismissLinkedView: () => void;
  onScrollToManual: () => void;
}

export function LinkedPhoneLookupSection({
  isPhoneLinked,
  phoneStatusLoading,
  phoneStatusError,
  linkedPhoneDisplay,
  onOpenVerify,
  onLinkedLookup,
  onDismissLinkedView,
  onScrollToManual,
}: LinkedPhoneLookupSectionProps) {
  return (
    <section className="mt-6 rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">전화번호 인증으로 조회</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            카카오 로그인 계정과 연결된 번호가 있다면 즉시 주문 내역을 확인할 수 있어요.
          </p>
        </div>
        {phoneStatusLoading ? (
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        {phoneStatusError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {phoneStatusError}
          </p>
        ) : null}

        {isPhoneLinked ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm text-slate-500">연결된 번호</div>
              <div className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {linkedPhoneDisplay}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                아래 버튼으로 비밀번호 입력 없이 주문 내역을 조회할 수 있어요.
              </p>
              <button
                type="button"
                onClick={onOpenVerify}
                className="mt-3 inline-flex items-center text-xs font-semibold text-sky-700 hover:text-sky-800"
              >
                번호 변경/재인증
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={onLinkedLookup}
                disabled={phoneStatusLoading}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                인증된 번호로 주문 조회
              </button>
              <button
                type="button"
                onClick={onDismissLinkedView}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                다른 전화번호로 조회
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                아직 인증된 전화번호가 없어요
              </div>
              <p className="mt-1 text-xs text-slate-600">
                전화번호를 인증하면 비밀번호 없이 주문 내역을 바로 확인할 수 있어요.
              </p>
            </div>
            <div className="flex gap-2 sm:flex-col sm:items-end">
              <button
                type="button"
                onClick={onOpenVerify}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
              >
                전화번호 인증하기
              </button>
              <button
                type="button"
                onClick={onScrollToManual}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                수동 조회로 이동
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
