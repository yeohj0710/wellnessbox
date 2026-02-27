import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { FormEvent } from "react";

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
  return (
    <section
      id="manual-form"
      className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900">다른 전화번호로 조회</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          결제 시 입력한 전화번호와 주문 조회 비밀번호를 입력해 주세요.
        </p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={onSubmitManual}>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">전화번호</h3>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              autoComplete="tel"
              maxLength={3}
              value={phonePart1}
              onChange={(e) => {
                const newValue = e.target.value.replace(/\D/g, "");
                onChangePhonePart1(newValue);
                if (newValue.length === 3) {
                  document.getElementById("phonePart2")?.focus();
                }
              }}
              className={`h-11 w-14 rounded-xl border border-slate-300 px-2 text-center text-sm transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                phonePart1.length === 3
                  ? "bg-slate-100 text-slate-500"
                  : "text-slate-800"
              }`}
            />
            <span className="text-slate-400">-</span>
            <input
              id="phonePart2"
              type="text"
              autoComplete="tel"
              maxLength={4}
              value={phonePart2}
              onChange={(e) => {
                const newValue = e.target.value.replace(/\D/g, "");
                onChangePhonePart2(newValue);
                if (newValue.length === 4) {
                  document.getElementById("phonePart3")?.focus();
                }
              }}
              className={`h-11 w-20 rounded-xl border border-slate-300 px-2 text-center text-sm transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                phonePart2.length === 4
                  ? "bg-slate-100 text-slate-500"
                  : "text-slate-800"
              }`}
            />
            <span className="text-slate-400">-</span>
            <input
              id="phonePart3"
              type="text"
              autoComplete="tel"
              maxLength={4}
              value={phonePart3}
              onChange={(e) => {
                const newValue = e.target.value.replace(/\D/g, "");
                onChangePhonePart3(newValue);
              }}
              className={`h-11 w-20 rounded-xl border border-slate-300 px-2 text-center text-sm transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                phonePart3.length === 4
                  ? "bg-slate-100 text-slate-500"
                  : "text-slate-800"
              }`}
            />
          </div>
          {manualPhoneDisplay ? (
            <p className="mt-1 text-xs text-slate-500">입력값: {manualPhoneDisplay}</p>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">주문 조회 비밀번호</h3>
          <div className="relative mt-2">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="주문 시 입력한 비밀번호"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 pr-10 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              disabled={loading}
            />
            <button
              type="button"
              onClick={onToggleShowPw}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-slate-100"
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              tabIndex={-1}
            >
              {showPw ? (
                <EyeSlashIcon className="h-5 w-5 text-slate-600" />
              ) : (
                <EyeIcon className="h-5 w-5 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            className={`h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 ${
              loading ? "cursor-not-allowed opacity-60" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                주문 조회 중...
              </span>
            ) : (
              "해당 정보로 주문 조회"
            )}
          </button>
        </div>

        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
