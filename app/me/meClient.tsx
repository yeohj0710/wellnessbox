"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUploadUrl } from "@/lib/upload";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";
import LogoutButton from "./logoutButton";
import OrdersSection from "./ordersSection";
import PhoneVerifyModal from "./phoneVerifyModal";
import { ProfileImageEditor } from "./profileImageEditor";
import EmailChangeModal from "./emailChangeModal";
import NicknameChangeModal from "./nicknameChangeModal";

type MeClientProps = {
  nickname: string;
  profileImageUrl: string;
  email: string;
  kakaoEmail: string;
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
  kakaoEmail,
  initialPhone,
  initialLinkedAt,
}: MeClientProps) {
  const router = useRouter();

  const [profileNickname, setProfileNickname] = useState(nickname);
  const [profileEmail, setProfileEmail] = useState(email);
  const [profileImage, setProfileImage] = useState(profileImageUrl);
  const [kakaoAccountEmail, setKakaoAccountEmail] = useState(kakaoEmail);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<
    "nickname" | "email" | "image" | null
  >(null);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);

  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [phone, setPhone] = useState(initialPhone ?? "");
  const [linkedAt, setLinkedAt] = useState<string | undefined>(initialLinkedAt);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);

  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  useEffect(() => {
    setProfileNickname(nickname);
    setProfileEmail(email);
    setProfileImage(profileImageUrl);
    setKakaoAccountEmail(kakaoEmail);
    setPhone(initialPhone ?? "");
    setLinkedAt(initialLinkedAt);
    setImageEditorFile(null);
    setImageEditorOpen(false);
    setImagePreviewUrl(null);
    setSaveError(null);
  }, [
    initialPhone,
    initialLinkedAt,
    nickname,
    email,
    profileImageUrl,
    kakaoEmail,
  ]);

  const hasPhone = useMemo(() => Boolean(phone), [phone]);
  const isLinked = useMemo(() => Boolean(phone && linkedAt), [phone, linkedAt]);
  const phoneDisplay = useMemo(() => formatPhoneDisplay(phone), [phone]);

  const uploadProfileImage = useCallback(async (file: Blob) => {
    const { success, result } = await getUploadUrl();
    if (!success) {
      throw new Error("이미지 업로드 URL을 불러오지 못했어요.");
    }

    const formData = new FormData();
    formData.append("file", file, "profile-image.jpg");

    const uploadResponse = await fetch(result.uploadURL, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("이미지 업로드에 실패했어요.");
    }

    const responseData = await uploadResponse.json();
    const fileUrl = responseData.result.variants.find((url: string) =>
      url.endsWith("/public")
    );

    if (!fileUrl) {
      throw new Error("업로드된 이미지 URL을 찾지 못했어요.");
    }

    return fileUrl as string;
  }, []);

  const saveProfile = useCallback(
    async (
      updates:
        | { nickname: string; email?: string; profileImageUrl?: string }
        | { email: string; nickname?: string; profileImageUrl?: string }
        | { profileImageBlob: Blob; nickname?: string; email?: string },
      field: "nickname" | "email" | "image"
    ) => {
      if (savingField) return;

      setSavingField(field);
      setSaveError(null);
      setSavingMessage(
        field === "image"
          ? "프로필 이미지를 저장하는 중이에요..."
          : "변경 내용을 저장하는 중이에요..."
      );

      try {
        let nextProfileImageUrl = profileImage;
        if ("profileImageBlob" in updates) {
          nextProfileImageUrl = await uploadProfileImage(
            updates.profileImageBlob
          );
        } else if (typeof updates.profileImageUrl === "string") {
          nextProfileImageUrl = updates.profileImageUrl;
        }

        const body = {
          nickname: "nickname" in updates ? updates.nickname : profileNickname,
          email: "email" in updates ? updates.email : profileEmail,
          profileImageUrl: nextProfileImageUrl ?? "",
        };

        const res = await fetch("/api/me/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const raw = await res.text();
        let data: {
          ok?: boolean;
          error?: string;
          nickname?: string;
          email?: string;
          profileImageUrl?: string;
          kakaoEmail?: string;
        } = {};

        try {
          data = raw ? (JSON.parse(raw) as typeof data) : {};
        } catch {
          data = { ok: false, error: raw || `HTTP ${res.status}` };
        }

        if (!res.ok || data.ok === false) {
          throw new Error(data.error || "변경 사항을 저장하지 못했어요.");
        }

        setProfileNickname(data.nickname ?? profileNickname);
        setProfileEmail(data.email ?? profileEmail);
        setProfileImage(data.profileImageUrl ?? nextProfileImageUrl ?? "");
        setKakaoAccountEmail(data.kakaoEmail ?? kakaoAccountEmail);
        router.refresh();
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setSavingField(null);
        setSavingMessage(null);
      }
    },
    [
      kakaoAccountEmail,
      profileEmail,
      profileImage,
      profileNickname,
      router,
      savingField,
      uploadProfileImage,
    ]
  );

  const doUnlink = useCallback(async () => {
    if (!isLinked || unlinkLoading) return;

    setUnlinkLoading(true);
    setUnlinkError(null);

    try {
      const res = await fetch("/api/me/unlink-phone", {
        method: "POST",
        headers: { "Cache-Control": "no-store" },
      });
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

      router.refresh();
    } catch (error) {
      setUnlinkError(error instanceof Error ? error.message : String(error));
    } finally {
      setUnlinkLoading(false);
    }
  }, [isLinked, unlinkLoading, router]);

  useChatPageActionListener((detail) => {
    if (detail.action === "focus_me_profile") {
      document
        .getElementById("me-profile-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (detail.action === "focus_me_orders") {
      document
        .getElementById("me-orders-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  return (
    <div className="w-full mt-4 sm:mt-8 mb-12 flex justify-center px-4">
      <div className="w-full sm:w-[640px] bg-white sm:border sm:border-gray-200 sm:rounded-2xl sm:shadow-lg px-5 sm:px-8 py-7 sm:py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
            <p className="mt-2 text-sm text-gray-600">
              카카오 로그인으로 연결된 정보를 확인하고 수정할 수 있어요.
            </p>
          </div>
        </div>

        <section
          id="me-profile-section"
          className="mt-7 rounded-2xl bg-gray-50 p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:gap-8 sm:flex-row sm:items-center">
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() =>
                  document.getElementById("profile-image-input")?.click()
                }
                className="group relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full ring-2 ring-sky-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                {imagePreviewUrl || profileImage ? (
                  <NextImage
                    src={imagePreviewUrl || profileImage}
                    alt="프로필 이미지"
                    fill
                    sizes="96px"
                    unoptimized
                    className="object-cover transition duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white text-xs text-gray-400">
                    이미지 없음
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="text-xs font-semibold text-white">
                    이미지 변경
                  </span>
                </div>
              </button>
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageEditorFile(file);
                  setImageEditorOpen(true);
                }}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="grid grid-cols-[60px_1fr_auto] items-center gap-2 sm:grid-cols-[60px_1fr_auto] sm:gap-3">
                <div className="text-sm font-semibold text-gray-900">닉네임</div>
                <div className="min-w-0 break-words text-sm text-gray-800">
                  {profileNickname || "닉네임 없음"}
                </div>
                <div className="flex items-center justify-end self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveError(null);
                      setIsNicknameModalOpen(true);
                    }}
                    disabled={savingField === "nickname"}
                    className="inline-flex h-6 min-w-[64px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
                  >
                    변경
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[60px_1fr_auto] items-center gap-2 sm:grid-cols-[60px_1fr_auto] sm:gap-3">
                <div className="text-sm font-semibold text-gray-900">이메일</div>
                <div className="min-w-0 break-words text-sm text-gray-800">
                  {profileEmail || kakaoAccountEmail || "example@email.com"}
                </div>
                <div className="flex items-center justify-end self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveError(null);
                      setIsEmailModalOpen(true);
                    }}
                    className="inline-flex h-6 min-w-[64px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
                  >
                    변경
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[60px_1fr_auto] items-center gap-2 sm:grid-cols-[60px_1fr_auto] sm:gap-3">
                <div className="text-sm font-semibold text-gray-900">
                  전화번호
                </div>
                <div className="min-w-0 break-words text-sm text-gray-800">
                  {hasPhone ? phoneDisplay : "없음"}
                </div>
                <div className="flex items-center justify-end self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUnlinkError(null);
                      setIsVerifyOpen(true);
                    }}
                    className="inline-flex h-6 min-w-[64px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
                  >
                    {hasPhone ? "변경" : "추가"}
                  </button>
                </div>
              </div>

              {saveError && !savingField && (
                <p className="text-sm font-medium text-rose-600">{saveError}</p>
              )}
              {savingMessage && (
                <p className="text-sm text-sky-700">{savingMessage}</p>
              )}
            </div>
          </div>
        </section>

        <OrdersSection
          phone={phone}
          linkedAt={linkedAt}
          onOpenVerify={() => {
            setUnlinkError(null);
            setIsVerifyOpen(true);
          }}
        />

        <div className="mt-10 flex justify-end">
          <LogoutButton />
        </div>

        <EmailChangeModal
          open={isEmailModalOpen}
          onClose={() => {
            if (savingField) return;
            setIsEmailModalOpen(false);
          }}
          initialEmail={profileEmail}
          onChanged={(nextEmail) => {
            setProfileEmail(nextEmail);
            setIsEmailModalOpen(false);
            router.refresh();
          }}
        />

        <NicknameChangeModal
          open={isNicknameModalOpen}
          onClose={() => {
            if (savingField === "nickname") return;
            setIsNicknameModalOpen(false);
          }}
          initialNickname={profileNickname}
          onChanged={(nextNickname) => {
            setProfileNickname(nextNickname);
            setIsNicknameModalOpen(false);
            router.refresh();
          }}
          onSaveNickname={async (nextNickname) => {
            if (nextNickname === profileNickname) return;
            const previous = profileNickname;
            setProfileNickname(nextNickname);
            try {
              await saveProfile({ nickname: nextNickname }, "nickname");
            } catch (error) {
              setProfileNickname(previous);
              throw error;
            }
          }}
        />

        <PhoneVerifyModal
          open={isVerifyOpen}
          onClose={() => {
            if (unlinkLoading) return;
            setIsVerifyOpen(false);
          }}
          initialPhone={phone}
          initialLinkedAt={linkedAt}
          allowUnlink={isLinked}
          unlinkLoading={unlinkLoading}
          unlinkError={unlinkError}
          onUnlink={doUnlink}
          onLinked={(nextPhone, nextLinkedAt) => {
            setPhone(nextPhone);
            setLinkedAt(nextLinkedAt);
            setIsVerifyOpen(false);
            router.refresh();
          }}
        />

        {imageEditorOpen && imageEditorFile && (
          <ProfileImageEditor
            file={imageEditorFile}
            onCancel={() => {
              setImageEditorOpen(false);
              setImageEditorFile(null);
            }}
            onApply={async (blob, previewUrl) => {
              const previous = profileImage;
              setImagePreviewUrl(previewUrl);
              setProfileImage(previewUrl);
              setImageEditorOpen(false);
              try {
                await saveProfile({ profileImageBlob: blob }, "image");
                setImagePreviewUrl(null);
              } catch {
                setProfileImage(previous);
                setImagePreviewUrl(null);
              } finally {
                setImageEditorFile(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
