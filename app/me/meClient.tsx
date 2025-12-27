"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import LogoutButton from "./logoutButton";
import OrdersSection from "./ordersSection";
import PhoneVerifyModal from "./phoneVerifyModal";

type MeClientProps = {
  nickname: string;
  profileImageUrl: string;
  email: string;
  initialPhone?: string;
  initialLinkedAt?: string;
};

function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export default function MeClient({
  nickname,
  profileImageUrl,
  email,
  initialPhone,
  initialLinkedAt,
}: MeClientProps) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [linkedAt, setLinkedAt] = useState<string | undefined>(initialLinkedAt);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const hasPhone = useMemo(() => Boolean(phone), [phone]);
  const isLinked = useMemo(() => Boolean(phone && linkedAt), [phone, linkedAt]);

  const phoneDisplay = useMemo(() => formatPhoneDisplay(phone), [phone]);

  const displayNickname = nickname || "닉네임 없음";
  const displayEmail = email || "이메일(세션에 미저장)";

  const onUnlink = useCallback(async () => {
    if (!isLinked || unlinkLoading) return;

    const ok = window.confirm("전화번호 연결을 해제할까요?");
    if (!ok) return;

    setUnlinkLoading(true);
    setUnlinkError(null);

    try {
      const res = await fetch("/api/me/unlink-phone", { method: "POST" });
      const raw = await res.text();

      let data: { ok?: boolean; error?: string };
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false) {
        setUnlinkError(data.error || "전화번호 연결 해제에 실패했어요.");
        return;
      }

      setPhone("");
      setLinkedAt(undefined);
      setIsVerifyOpen(false);
    } catch (error) {
      setUnlinkError(error instanceof Error ? error.message : String(error));
    } finally {
      setUnlinkLoading(false);
    }
  }, [isLinked, unlinkLoading]);

  return (
    <div className="w-full mt-4 sm:mt-8 mb-12 flex justify-center px-4">
      <div className="w-full sm:w-[640px] bg-white sm:border sm:border-gray-200 sm:rounded-2xl sm:shadow-lg px-5 sm:px-8 py-7 sm:py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
            <p className="mt-2 text-sm text-gray-600">
              카카오 로그인으로 연결된 정보를 확인할 수 있어요.
            </p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl bg-gray-50 p-5 sm:p-6">
          <div className="flex gap-4">
            {profileImageUrl ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-gray-200">
                <Image
                  src={profileImageUrl}
                  alt="프로필 이미지"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-white shadow-sm ring-1 ring-gray-200 flex items-center justify-center text-gray-400 text-sm">
                없음
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-[64px_1fr_auto] gap-x-3 gap-y-0.5 items-center">
                <div className="text-sm font-semibold text-gray-900">
                  닉네임
                </div>
                <div className="min-w-0 text-sm text-gray-700 break-words">
                  {displayNickname}
                </div>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="invisible pointer-events-none inline-flex h-7 min-w-[56px] items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold"
                >
                  변경
                </button>

                <div className="text-sm font-semibold text-gray-900">
                  이메일
                </div>
                <div className="min-w-0 text-sm text-gray-700 break-words">
                  {displayEmail}
                </div>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="invisible pointer-events-none inline-flex h-7 min-w-[56px] items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold"
                >
                  변경
                </button>

                <div className="text-sm font-semibold text-gray-900">
                  전화번호
                </div>
                <div className="min-w-0 text-sm text-gray-700 break-words">
                  {hasPhone ? phoneDisplay : "없음"}
                </div>

                <div className="flex items-center justify-end gap-2">
                  {isLinked ? (
                    <button
                      type="button"
                      onClick={onUnlink}
                      disabled={unlinkLoading}
                      aria-busy={unlinkLoading}
                      className="inline-flex h-7 min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-rose-50"
                    >
                      {unlinkLoading ? "처리중" : "해지"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setIsVerifyOpen(true)}
                    disabled={unlinkLoading}
                    className="inline-flex h-7 min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
                  >
                    {hasPhone ? "변경" : "추가"}
                  </button>
                </div>
              </div>

              {unlinkError ? (
                <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
                  {unlinkError}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <OrdersSection
          phone={phone}
          linkedAt={linkedAt}
          onOpenVerify={() => setIsVerifyOpen(true)}
        />

        <div className="mt-10 flex justify-end">
          <LogoutButton />
        </div>

        <PhoneVerifyModal
          open={isVerifyOpen}
          onClose={() => setIsVerifyOpen(false)}
          initialPhone={phone}
          initialLinkedAt={linkedAt}
          onLinked={(nextPhone, nextLinkedAt) => {
            setPhone(nextPhone);
            setLinkedAt(nextLinkedAt);
            setIsVerifyOpen(false);
          }}
        />
      </div>
    </div>
  );
}
