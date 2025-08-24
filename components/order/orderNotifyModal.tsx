"use client";

import { useEffect } from "react";

interface OrderNotifyModalProps {
  onAllow: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function OrderNotifyModal({
  onAllow,
  onClose,
  loading = false,
}: OrderNotifyModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-3 transition-all duration-200 ease-out max-h-[85vh] overflow-y-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-[1.25px] rounded-2xl bg-[conic-gradient(at_50%_50%,#6C4DFF_0deg,#3B5BFF_140deg,#56CCF2_260deg,#6C4DFF_360deg)] shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
          <div className="relative rounded-2xl bg-white">
            <button
              onClick={onClose}
              aria-label="닫기"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition"
            >
              ✕
            </button>
            <div className="px-4 pt-8 pb-5 sm:px-6 sm:pt-9 sm:pb-6">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#4568F5] to-[#6C4DFF] text-white text-lg shadow-[0_6px_16px_rgba(67,103,230,0.28)]">
                🔔
              </div>
              <h2 className="text-center text-lg sm:text-xl font-extrabold text-[#0F1222]">
                배송 알림과 약사님 메시지 알림을 받으시겠어요?
              </h2>
              <p className="mt-3 text-center text-sm leading-5 text-gray-600">
                알림을 허용하면 배송 진행 상황과 약사님에게 메시지가 왔을 때
                알려드려요. 브라우저에서 알림을 거부했다면 설정에서 다시 허용할
                수 있어요.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className={`h-10 rounded-full text-sm font-medium transition ${
                    loading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-[0.99]"
                  }`}
                >
                  나중에
                </button>
                <button
                  onClick={onAllow}
                  disabled={loading}
                  className={`h-10 rounded-full text-sm font-medium text-white transition ${
                    loading
                      ? "bg-gradient-to-r from-[#9BB0FF] to-[#A491FF] cursor-wait"
                      : "bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_8px_22px_rgba(67,103,230,0.30)] hover:from-[#5A78FF] hover:to-[#7A5BFF] active:scale-[0.99]"
                  }`}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                      처리중
                    </span>
                  ) : (
                    "허용"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10 blur-2xl opacity-40 bg-[radial-gradient(22rem_12rem_at_50%_-20%,rgba(108,77,255,0.22),transparent)]"
        />
      </div>
    </div>
  );
}
