"use client";

import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";

export type SurveyIntroBusy = "idle" | "session" | "init" | "sign" | "sync";

export type SurveyIntroPanelText = {
  introBadge: string;
  introTitle: string;
  introDesc1: string;
  introDesc2: string;
  preAuthTitle: string;
  preAuthDesc: string;
  namePlaceholder: string;
  birthPlaceholder: string;
  phonePlaceholder: string;
  sendAuth: string;
  resendAuth: string;
  checkAuth: string;
  authDone: string;
  authCheckingTitle: string;
  authCheckingDesc: string;
  authLockedHint: string;
  switchIdentity: string;
  startSurvey: string;
  needAuthNotice: string;
  busyRequest: string;
  busyChecking: string;
  completedRestartHint: string;
};

export default function SurveyIntroPanel(props: {
  text: SurveyIntroPanelText;
  identity: IdentityInput;
  identityEditable: boolean;
  identityLocked: boolean;
  authBusy: SurveyIntroBusy;
  authPendingSign: boolean;
  authVerified: boolean;
  authInitializing: boolean;
  authNoticeText: string | null;
  authErrorText: string | null;
  hasCompletedSubmission: boolean;
  startDisabled: boolean;
  onNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onStartKakaoAuth: () => void;
  onConfirmKakaoAuth: () => void;
  onSwitchIdentity: () => void;
  onStartSurvey: () => void;
}) {
  const {
    text,
    identity,
    identityEditable,
    identityLocked,
    authBusy,
    authPendingSign,
    authVerified,
    authInitializing,
    authNoticeText,
    authErrorText,
    hasCompletedSubmission,
    startDisabled,
  } = props;

  return (
    <div className="mx-auto max-w-[860px] rounded-[30px] border border-sky-200/70 bg-white/92 p-6 shadow-[0_26px_58px_-34px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
      <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
        {text.introBadge}
      </span>
      <h1 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">{text.introTitle}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{text.introDesc1}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-base">{text.introDesc2}</p>

      <section className="mt-7 rounded-3xl border border-cyan-200/70 bg-[linear-gradient(140deg,rgba(236,253,255,0.95),rgba(239,246,255,0.92))] p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{text.preAuthTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{text.preAuthDesc}</p>
        {authInitializing ? (
          <div
            data-testid="survey-auth-loading"
            className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
              <p className="text-sm font-semibold text-slate-700">{text.authCheckingTitle}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{text.authCheckingDesc}</p>
            <div className="mt-3 space-y-2">
              <div className="h-[10px] w-[42%] animate-pulse rounded-full bg-slate-200/85" />
              <div className="h-[10px] w-[58%] animate-pulse rounded-full bg-slate-200/75" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="h-[44px] animate-pulse rounded-xl bg-slate-200/80" />
              <div className="h-[44px] animate-pulse rounded-xl bg-slate-200/80" />
              <div className="h-[44px] animate-pulse rounded-xl bg-slate-200/80" />
            </div>
            <div className="mt-3 h-[40px] w-[170px] animate-pulse rounded-full bg-slate-200/80" />
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                autoComplete="name"
                value={identity.name}
                disabled={!identityEditable || authBusy !== "idle"}
                onChange={(event) => props.onNameChange(event.target.value)}
                placeholder={text.namePlaceholder}
                className="rounded-2xl border border-slate-300/85 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
              <input
                type="text"
                autoComplete="bday"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={identity.birthDate}
                disabled={!identityEditable || authBusy !== "idle"}
                onChange={(event) => props.onBirthDateChange(event.target.value)}
                placeholder={text.birthPlaceholder}
                className="rounded-2xl border border-slate-300/85 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
              <input
                type="text"
                autoComplete="tel"
                inputMode="tel"
                pattern="[0-9]*"
                maxLength={11}
                value={identity.phone}
                disabled={!identityEditable || authBusy !== "idle"}
                onChange={(event) => props.onPhoneChange(event.target.value)}
                placeholder={text.phonePlaceholder}
                className="rounded-2xl border border-slate-300/85 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            {identityLocked ? (
              <p className="mt-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
                {text.authLockedHint}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {identityLocked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {text.authDone}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={authBusy !== "idle" || !identityEditable || authVerified}
                  onClick={props.onStartKakaoAuth}
                  className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authBusy === "init" || authBusy === "sync"
                    ? text.busyRequest
                    : authPendingSign
                      ? text.resendAuth
                      : text.sendAuth}
                </button>
              )}
              {authPendingSign && !authVerified ? (
                <button
                  type="button"
                  disabled={authBusy !== "idle" || !identityEditable}
                  onClick={props.onConfirmKakaoAuth}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authBusy === "sign" ? text.busyChecking : text.checkAuth}
                </button>
              ) : null}
              {identityLocked ? (
                <button
                  type="button"
                  disabled={authBusy !== "idle"}
                  onClick={props.onSwitchIdentity}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {text.switchIdentity}
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>

      {authNoticeText && !identityLocked ? (
        <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-700">
          {authNoticeText}
        </p>
      ) : null}
      {authErrorText ? (
        <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {authErrorText}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={props.onStartSurvey}
          disabled={startDisabled}
          data-testid="survey-start-button"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {text.startSurvey}
        </button>
        {authInitializing || !authVerified ? (
          <span
            className={`text-sm font-medium ${
              authInitializing ? "text-cyan-700" : "text-slate-500"
            }`}
          >
            {authInitializing ? text.authCheckingTitle : text.needAuthNotice}
          </span>
        ) : null}
      </div>

      {hasCompletedSubmission ? (
        <p className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-700 sm:text-sm">
          {text.completedRestartHint}
        </p>
      ) : null}
    </div>
  );
}
