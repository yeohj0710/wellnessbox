"use client";

import { useEffect, useMemo, useState } from "react";

const IOS_KEY = "wb_ios_ext_consent_v1";
const SESSION_DECLINE_KEY = "wb_ios_ext_consent_dismissed";

function getOverrides() {
  if (typeof window === "undefined")
    return {
      kakao: false,
      ios: false,
      android: false,
      modal: false,
      guide: false,
    };
  const p = new URLSearchParams(window.location.search);
  return {
    kakao: p.get("forceKakao") === "1",
    ios: p.get("forceIOS") === "1",
    android: p.get("forceAndroid") === "1",
    modal: p.get("forceModal") === "1",
    guide: p.get("forceGuide") === "1",
  };
}

export default function KakaoExternalBridge() {
  const [showIosModal, setShowIosModal] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [closing, setClosing] = useState<"modal" | "guide" | null>(null);
  const overrides = useMemo(getOverrides, []);

  const env = useMemo(() => {
    if (typeof navigator === "undefined")
      return { isKakao: false, isAndroid: false, isIOS: false };
    const ua = navigator.userAgent.toLowerCase();
    const isKakao = overrides.kakao || ua.includes("kakaotalk");
    const isAndroid = overrides.android || ua.includes("android");
    const isIOS = overrides.ios || /iphone|ipad|ipod/.test(ua);
    return { isKakao, isAndroid, isIOS };
  }, [overrides]);

  useEffect(() => {
    if (!env.isKakao) return;
    if (overrides.modal) setShowIosModal(true);
    if (overrides.guide) setShowIosGuide(true);
    if (env.isAndroid) {
      const url = window.location.href;
      const scheme =
        "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
      window.location.href = scheme;
      return;
    }
    if (env.isIOS) {
      const saved =
        typeof window === "undefined" ? null : localStorage.getItem(IOS_KEY);
      const sessionDeclined =
        typeof window === "undefined"
          ? false
          : sessionStorage.getItem(SESSION_DECLINE_KEY) === "1";
      if (saved === "always") {
        tryOpenIOS();
      } else if (!overrides.guide && !sessionDeclined) {
        setShowIosModal(true);
      }
    }
  }, [env, overrides]);

  useEffect(() => {
    const anyOpen = showIosModal || showIosGuide;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (!anyOpen) return;
      if (e.key === "Escape") {
        if (showIosModal) handleCloseModal();
        if (showIosGuide) handleCloseGuide();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [showIosModal, showIosGuide]);

  const tryOpenIOS = () => {
    const url = window.location.href;
    const scheme =
      "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
    let opened = false;
    const t = setTimeout(() => {
      if (!opened) setShowIosGuide(true);
    }, 600);
    try {
      window.location.href = scheme;
      opened = true;
    } catch {
      setShowIosGuide(true);
    } finally {
      setTimeout(() => clearTimeout(t), 1200);
    }
  };

  const onIosAgreeAlways = () => {
    localStorage.setItem(IOS_KEY, "always");
    setShowIosModal(false);
    tryOpenIOS();
  };

  const onIosDecline = () => {
    try {
      sessionStorage.setItem(SESSION_DECLINE_KEY, "1");
    } catch {}
    handleCloseModal();
  };

  const openSafari = () => {
    const url = window.location.href;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = url;
  };

  const openChrome = () => {
    const url = window.location.href;
    const isLocal =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!(env.isIOS && env.isKakao) || isLocal) {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) window.location.href = url;
      return;
    }
    const raw = url.replace(/^https?:\/\//, "");
    const scheme =
      location.protocol === "https:" ? "googlechromes://" : "googlechrome://";
    try {
      window.location.href = scheme + raw;
    } catch {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) window.location.href = url;
    }
  };

  const handleCloseModal = () => {
    setClosing("modal");
    setTimeout(() => {
      setShowIosModal(false);
      setClosing(null);
    }, 160);
  };

  const handleCloseGuide = () => {
    setClosing("guide");
    setTimeout(() => {
      setShowIosGuide(false);
      setClosing(null);
    }, 160);
  };

  if (!env.isKakao && !overrides.kakao) return null;

  return (
    <>
      {showIosModal && (
        <div
          className={`fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 transition-opacity duration-150 ${
            closing === "modal" ? "opacity-0" : "opacity-100"
          }`}
          onMouseDown={handleCloseModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full sm:w-auto sm:max-w-[520px] mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden bg-white shadow-xl transition-all duration-150 ${
              closing === "modal"
                ? "translate-y-3 sm:-translate-y-1 sm:opacity-0"
                : "translate-y-0 sm:translate-y-0 sm:opacity-100"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-12 flex items-center">
                  <img
                    src="/logo.png"
                    alt="logo"
                    className="h-12 w-auto object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">
                    외부 브라우저에서 열기
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    더 안정적인 사용을 위해 Safari 또는 Chrome으로 이동해요.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  aria-label="닫기"
                  className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={onIosAgreeAlways}
                  className="h-10 rounded-xl bg-sky-400 text-white text-sm font-semibold hover:bg-sky-500 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                >
                  네
                </button>
                <button
                  onClick={onIosDecline}
                  className="h-10 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  아니요
                </button>
              </div>

              <p className="mt-4 px-1 text-xs leading-5 text-slate-600">
                카카오톡 내장 브라우저에서는 일부 기능이 제한될 수 있어요.
              </p>
            </div>
          </div>
        </div>
      )}

      {showIosGuide && (
        <div
          className={`fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/50 transition-opacity duration-150 ${
            closing === "guide" ? "opacity-0" : "opacity-100"
          }`}
          onMouseDown={handleCloseGuide}
          aria-live="polite"
        >
          <div
            className={`w-full sm:w-auto sm:max-w-[560px] mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden bg-white shadow-xl transition-all duration-150 ${
              closing === "guide"
                ? "translate-y-3 sm:-translate-y-1 sm:opacity-0"
                : "translate-y-0 sm:translate-y-0 sm:opacity-100"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-slate-900">
                  열리지 않나요?
                </div>
                <button
                  onClick={handleCloseGuide}
                  aria-label="닫기"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={openSafari}
                  className="w-full h-10 rounded-lg ring-1 ring-sky-300 bg-white text-sky-700 text-sm font-medium hover:bg-sky-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                >
                  Safari로 열기
                </button>
                <button
                  onClick={openChrome}
                  className="w-full h-10 rounded-lg ring-1 ring-sky-300 bg-white text-sky-700 text-sm font-medium hover:bg-sky-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                >
                  Chrome으로 열기
                </button>
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(window.location.href)
                    }
                    className="h-8 px-3 rounded-md ring-1 ring-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    링크 복사
                  </button>
                </div>
              </div>

              <ol className="space-y-0.5 text-[13px] leading-5 text-slate-500">
                <li>우측 상단 ••• 메뉴를 눌러요.</li>
                <li>“Safari로 열기” 또는 “외부 브라우저로 열기”를 선택해요.</li>
                <li>그래도 안 열리면 위 버튼으로 직접 열어보세요.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
