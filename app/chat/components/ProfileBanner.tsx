"use client";

import type { UserProfile } from "@/types/chat";

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
  if (!show) return null;
  return (
    <div className="mx-auto mb-4 max-w-3xl" hidden={!show}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-800 shadow-sm backdrop-blur sm:text-sm">
        <div className="flex-1 px-1 leading-tight">
          {profile ? (
            <span>
              프로필 설정됨 · 나이 {profile.age ?? "?"}, 성별{" "}
              {profile.sex ?? "?"}
              {profile.goals?.length
                ? ` · 목표 ${profile.goals.join(", ")}`
                : ""}
            </span>
          ) : (
            <span>
              프로필을 설정하면 나에게 좀 더 개인맞춤화된 상담이 쉬워져요.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900 transition hover:bg-amber-100 whitespace-nowrap"
            onClick={onEdit}
          >
            프로필 설정
          </button>
          <button
            aria-label="Close profile banner"
            className="h-6 w-6 p-0 text-amber-700 transition hover:text-amber-900 hover:opacity-80"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
