import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import type { FormEvent } from "react";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";

interface ManualLookupSectionProps {
  phonePart1: string;
  phonePart2: string;
  phonePart3: string;
  manualPhoneDisplay: string;
  password: string;
  showPw: boolean;
  loading: boolean;
  error: string;
  onSubmitManual: (e?: FormEvent) => void;
  onToggleShowPw: () => void;
  onChangePhonePart1: (value: string) => void;
  onChangePhonePart2: (value: string) => void;
  onChangePhonePart3: (value: string) => void;
  onChangePassword: (value: string) => void;
}

export function ManualLookupSection({
  phonePart1,
  phonePart2,
  phonePart3,
  manualPhoneDisplay,
  password,
  showPw,
  loading,
  error,
  onSubmitManual,
  onToggleShowPw,
  onChangePhonePart1,
  onChangePhonePart2,
  onChangePhonePart3,
  onChangePassword,
}: ManualLookupSectionProps) {
  const isPhoneComplete = phonePart2.length === 4 && phonePart3.length === 4;

  return (
    <section
      id="manual-form"
      className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.4)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            전화번호 + 비밀번호로 조회
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            결제할 때 쓴 정보로 찾아보세요.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          보조 조회
        </span>
      </div>

      <form className="mt-5 space-y-5" onSubmit={onSubmitManual}>
        <div>
          <label className="text-sm font-semibold text-slate-900">
            전화번호
          </label>

          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
            <div className="grid grid-cols-[4.4rem_1px_1fr_1px_1fr] items-center">
              <input
                type="text"
                autoComplete="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={phonePart1}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/\D/g, "");
                  onChangePhonePart1(nextValue);
                  if (nextValue.length === 3) {
                    document.getElementById("phonePart2")?.focus();
                  }
                }}
                className="h-12 w-full border-0 bg-transparent px-3 text-center text-sm font-semibold text-slate-800 outline-none"
                placeholder="010"
              />
              <div className="h-6 bg-slate-200" />
              <input
                id="phonePart2"
                type="text"
                autoComplete="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={phonePart2}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/\D/g, "");
                  onChangePhonePart2(nextValue);
                  if (nextValue.length === 4) {
                    document.getElementById("phonePart3")?.focus();
                  }
                }}
                className="h-12 w-full border-0 bg-transparent px-3 text-center text-sm font-semibold text-slate-800 outline-none"
                placeholder="1234"
              />
              <div className="h-6 bg-slate-200" />
              <input
                id="phonePart3"
                type="text"
                autoComplete="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={phonePart3}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/\D/g, "");
                  onChangePhonePart3(nextValue);
                }}
                className="h-12 w-full border-0 bg-transparent px-3 text-center text-sm font-semibold text-slate-800 outline-none"
                placeholder="5678"
              />
            </div>
          </div>

          {isPhoneComplete && manualPhoneDisplay ? (
            <p className="mt-2 text-xs text-slate-500">{manualPhoneDisplay}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">
            주문 조회 비밀번호
          </label>

          <div className="relative mt-2">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => onChangePassword(event.target.value)}
              placeholder="결제할 때 입력한 비밀번호"
              className="h-12 w-full rounded-2xl border border-slate-300 px-4 pr-11 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              disabled={loading}
            />
            <button
              type="button"
              onClick={onToggleShowPw}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              tabIndex={-1}
            >
              {showPw ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className={`inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 ${
            loading ? "cursor-not-allowed opacity-60" : ""
          }`}
          disabled={loading}
        >
          {loading ? (
            <InlineSpinnerLabel label="주문 조회 중" />
          ) : (
            "입력한 정보로 조회"
          )}
        </button>
      </form>
    </section>
  );
}
