"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";
import { formatPhoneDisplay } from "@/lib/client/phone-format";
import LogoutButton from "./logoutButton";
import OrdersSection from "./ordersSection";
import PhoneVerifyModal from "./phoneVerifyModal";
import { ProfileImageEditor } from "./profileImageEditor";
import EmailChangeModal from "./emailChangeModal";
import NicknameChangeModal from "./nicknameChangeModal";
import { useMeProfileMutations } from "./useMeProfileMutations";
import { MeProfileSection } from "./meProfileSection";

type MeClientProps = {
  nickname: string;
  profileImageUrl: string;
  email: string;
  kakaoEmail: string;
  initialPhone?: string;
  initialLinkedAt?: string;
};

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

  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [phone, setPhone] = useState(initialPhone ?? "");
  const [linkedAt, setLinkedAt] = useState<string | undefined>(initialLinkedAt);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);

  const hasPhone = useMemo(() => Boolean(phone), [phone]);
  const isLinked = useMemo(() => Boolean(phone && linkedAt), [phone, linkedAt]);
  const phoneDisplay = useMemo(() => formatPhoneDisplay(phone), [phone]);

  const handleProfilePatched = useCallback(
    (next: {
      nickname: string;
      email: string;
      profileImage: string;
      kakaoAccountEmail: string;
    }) => {
      setProfileNickname(next.nickname);
      setProfileEmail(next.email);
      setProfileImage(next.profileImage);
      setKakaoAccountEmail(next.kakaoAccountEmail);
    },
    []
  );

  const handleUnlinked = useCallback(() => {
    setPhone("");
    setLinkedAt(undefined);
    setIsVerifyOpen(false);
  }, []);

  const {
    saveError,
    setSaveError,
    savingField,
    savingMessage,
    saveProfile,
    unlinkLoading,
    unlinkError,
    setUnlinkError,
    unlinkPhone,
  } = useMeProfileMutations({
    profileNickname,
    profileEmail,
    profileImage,
    kakaoAccountEmail,
    isLinked,
    onProfilePatched: handleProfilePatched,
    onUnlinked: handleUnlinked,
    onRefresh: () => router.refresh(),
  });

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
    setUnlinkError(null);
  }, [
    initialPhone,
    initialLinkedAt,
    nickname,
    email,
    profileImageUrl,
    kakaoEmail,
    setSaveError,
    setUnlinkError,
  ]);

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
    <div className="mt-4 mb-12 flex w-full justify-center px-4 sm:mt-8">
      <div className="w-full bg-white px-5 py-7 sm:w-[640px] sm:rounded-2xl sm:border sm:border-gray-200 sm:px-8 sm:py-8 sm:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
            <p className="mt-2 text-sm text-gray-600">
              카카오 로그인으로 연결된 정보를 확인하고 수정할 수 있어요.
            </p>
          </div>
        </div>

        <MeProfileSection
          imagePreviewUrl={imagePreviewUrl}
          profileImage={profileImage}
          profileNickname={profileNickname}
          profileEmail={profileEmail}
          kakaoAccountEmail={kakaoAccountEmail}
          hasPhone={hasPhone}
          phoneDisplay={phoneDisplay}
          saveError={saveError}
          savingMessage={savingMessage}
          savingField={savingField}
          onEditNickname={() => {
            setSaveError(null);
            setIsNicknameModalOpen(true);
          }}
          onEditEmail={() => {
            setSaveError(null);
            setIsEmailModalOpen(true);
          }}
          onEditPhone={() => {
            setUnlinkError(null);
            setIsVerifyOpen(true);
          }}
          onSelectImageFile={(file) => {
            setImageEditorFile(file);
            setImageEditorOpen(true);
          }}
        />

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
          onUnlink={unlinkPhone}
          onLinked={(nextPhone, nextLinkedAt) => {
            setPhone(nextPhone);
            setLinkedAt(nextLinkedAt);
            setIsVerifyOpen(false);
            router.refresh();
          }}
        />

        {imageEditorOpen && imageEditorFile ? (
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
        ) : null}
      </div>
    </div>
  );
}
