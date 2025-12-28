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
      className="mt-8 rounded-2xl bg-white ring-1 ring-gray-200 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            다른 전화번호로 주문 조회
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            결제 시 입력한 전화번호와 주문 조회 비밀번호를 입력해주세요.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={onSubmitManual}>
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">전화번호</h3>
          </div>
          <div className="mt-2 flex gap-2 items-center">
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
              className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-14 border rounded-md px-2 py-2 text-center text-sm transition-colors ${
                phonePart1.length === 3 ? "bg-gray-100 text-gray-500" : ""
              }`}
            />
            <span className="text-gray-500">-</span>
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
              className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-2 text-center text-sm transition-colors ${
                phonePart2.length === 4 ? "bg-gray-100 text-gray-500" : ""
              }`}
            />
            <span className="text-gray-500">-</span>
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
              className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-2 text-center text-sm transition-colors ${
                phonePart3.length === 4 ? "bg-gray-100 text-gray-500" : ""
              }`}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              주문 조회 비밀번호
            </h3>
          </div>
          <div className="relative mt-2">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="주문 시 입력한 비밀번호"
              className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-400"
              disabled={loading}
            />
            <button
              type="button"
              onClick={onToggleShowPw}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              tabIndex={-1}
            >
              {showPw ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            className={`w-full h-11 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                주문 조회 중...
              </div>
            ) : (
              "해당 정보로 주문 조회"
            )}
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-2" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
