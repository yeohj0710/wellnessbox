interface OrderPhoneContextProps {
  isPhoneLinked: boolean;
  linkedPhoneDisplay: string;
  onOpenVerify: () => void;
  onOtherNumber: () => void;
}

export function OrderPhoneContext({
  isPhoneLinked,
  linkedPhoneDisplay,
  onOpenVerify,
  onOtherNumber,
}: OrderPhoneContextProps) {
  if (isPhoneLinked) {
    return (
      <section className="mb-4 rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/80 to-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">인증된 번호</div>
            <div className="mt-1 break-words text-lg font-black tracking-tight text-slate-900">
              {linkedPhoneDisplay}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              현재 인증된 번호로 주문을 불러왔습니다. 번호를 바꾸거나 다른 번호로 조회할 수도 있어요.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={onOpenVerify}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 hover:bg-sky-50"
            >
              번호 변경하기
            </button>
            <button
              type="button"
              onClick={onOtherNumber}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              다른 번호로 조회하기
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white/95 px-5 py-5 shadow-sm">
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
            className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          >
            전화번호 인증하기
          </button>
          <button
            type="button"
            onClick={onOtherNumber}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            다른 번호로 조회하기
          </button>
        </div>
      </div>
    </section>
  );
}
