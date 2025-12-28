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
    <section className="mt-8 rounded-2xl bg-gray-50 px-5 py-6 ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-gray-900">
            전화번호 인증으로 조회
          </div>
          <p className="mt-1 text-sm text-gray-600">
            카카오 로그인 계정에 연결된 번호가 있다면 즉시 주문 내역을
            보여드려요.
          </p>
        </div>
        {phoneStatusLoading ? (
          <div className="h-9 w-9 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
        ) : null}
      </div>

      <div className="mt-5 rounded-xl bg-white ring-1 ring-gray-200 p-4 sm:p-5">
        {phoneStatusError ? (
          <div className="text-sm text-red-600">{phoneStatusError}</div>
        ) : null}

        {isPhoneLinked ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">연결된 번호</div>
              <div className="mt-1 text-xl font-bold text-gray-900">
                {linkedPhoneDisplay}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                인증된 번호가 맞다면 버튼을 눌러 바로 조회하세요.
              </p>
              <button
                type="button"
                onClick={onOpenVerify}
                className="mt-3 inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                번호 변경 또는 재인증하기
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={onLinkedLookup}
                disabled={phoneStatusLoading}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                인증된 번호로 주문 조회
              </button>
              <button
                type="button"
                onClick={onDismissLinkedView}
                className="text-xs font-semibold text-gray-600 hover:text-gray-800"
              >
                이 전화번호가 아닌가요?
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                아직 인증된 전화번호가 없어요.
              </div>
              <p className="mt-1 text-xs text-gray-600">
                전화번호를 인증하면 비밀번호 없이도 주문을 바로 확인할 수
                있어요.
              </p>
            </div>
            <div className="flex gap-2 sm:flex-col sm:items-end sm:gap-2">
              <button
                type="button"
                onClick={onOpenVerify}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
              >
                전화번호 인증하기
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
