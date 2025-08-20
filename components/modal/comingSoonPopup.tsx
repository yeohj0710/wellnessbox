"use client";

import { useEffect, useState } from "react";

interface ComingSoonPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function ComingSoonPopup({
  open,
  onClose,
}: ComingSoonPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVisible(true);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKeyDown);
      setVisible(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md px-6 transition-all duration-200 ease-out ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-[1.5px] rounded-2xl bg-[conic-gradient(at_50%_50%,#6C4DFF_0deg,#3B5BFF_120deg,#56CCF2_240deg,#6C4DFF_360deg)] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="relative rounded-2xl bg-white dark:bg-neutral-950">
            <button
              aria-label="닫기"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition"
            >
              ✕
            </button>
            <div className="p-6 pt-12">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#5A78FF] to-[#7A5BFF] text-white text-2xl shadow-[0_10px_30px_rgba(90,120,255,0.35)]">
                ✨
              </div>
              <h2 className="text-center text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F1222]">
                리뉴얼 준비 중입니다
              </h2>
              <p className="mt-3 text-center text-sm leading-6 text-gray-600">
                임시 판매(베타테스트) 기간이 종료되었습니다.
                <br />
                보내주신 성원에 진심으로 감사드립니다.
                <br />
                8월 중 재판매가 시작됩니다.
              </p>
              <div className="mt-6 flex items-center justify-center">
                <button
                  onClick={onClose}
                  autoFocus
                  className="inline-flex h-11 items-center justify-center rounded-full px-6 text-white text-sm font-medium bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)] hover:from-[#5A78FF] hover:to-[#7A5BFF] active:scale-[0.99] transition"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 blur-2xl opacity-40 bg-[radial-gradient(20rem_12rem_at_50%_-20%,rgba(108,77,255,0.25),transparent)]"
        />
      </div>
    </div>
  );
}
