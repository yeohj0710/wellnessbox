"use client";

import { useCallback, useEffect, useRef } from "react";
import type { UserProfile } from "@/types/chat";
import { XMarkIcon } from "@heroicons/react/24/outline";

const PROFILE_BANNER_AUTO_HIDE_MS = 6500;

interface ProfileBannerProps {
  profile?: UserProfile;
  show: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function ProfileBanner({
  profile,
  show,
  onClose,
  onEdit,
}: ProfileBannerProps) {
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (typeof window === "undefined") return;
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    if (typeof window === "undefined") return;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      onClose();
      hideTimerRef.current = null;
    }, PROFILE_BANNER_AUTO_HIDE_MS);
  }, [clearHideTimer, onClose]);

  useEffect(() => {
    if (!show) {
      clearHideTimer();
      return;
    }
    scheduleHide();
    return clearHideTimer;
  }, [clearHideTimer, scheduleHide, show]);

  if (!show) return null;
  return (
    <div className="mx-auto mb-4 max-w-3xl">
      <div
        className="flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur sm:gap-3 sm:text-sm"
        onMouseEnter={clearHideTimer}
        onMouseLeave={scheduleHide}
        onTouchStart={clearHideTimer}
        onTouchEnd={scheduleHide}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600" />
          <div className="min-w-0 px-1 leading-tight">
            <div className="font-semibold text-slate-900">
              맞춤 상담 준비하기
            </div>
            <div className="text-slate-600">
              프로필을 설정하면 더 정확한 추천을 받을 수 있어요.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-center text-xs font-semibold leading-tight text-white hover:opacity-90 active:opacity-95 sm:text-sm"
            onClick={onEdit}
          >
            프로필 설정
          </button>
          <button
            aria-label="닫기"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="닫기"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
