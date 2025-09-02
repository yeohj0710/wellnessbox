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
    <div className="mx-auto max-w-3xl mb-8" hidden={!show}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 shadow-sm">
        <div className="px-1 flex-1 leading-tight">
          {profile ? (
            <span>
              프로필 설정됨 · 나이 {profile.age ?? "?"}, 성별 {profile.sex ?? "?"}
              {profile.goals?.length ? ` · 목표 ${profile.goals.join(", ")}` : ""}
            </span>
          ) : (
            <span>
              프로필을 설정하면 나에게 좀 더 개인맞춤화된 상담이 쉬워져요.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900 hover:bg-amber-100 whitespace-nowrap transition"
            onClick={onEdit}
          >
            프로필 설정
          </button>
          <button
            aria-label="Close profile banner"
            className="h-6 w-6 p-0 text-amber-700 hover:text-amber-900 hover:opacity-80 transition"
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
