"use client";

import { useCallback, useState } from "react";
import { getUploadUrl } from "@/lib/upload";
import { saveMeProfileRequest } from "@/lib/client/me-account-api";
import { unlinkMyPhoneRequest } from "@/lib/client/phone-api";

type SavingField = "nickname" | "email" | "image" | null;

type ProfilePatch = {
  nickname: string;
  email: string;
  profileImage: string;
  kakaoAccountEmail: string;
};

type UseMeProfileMutationsInput = {
  profileNickname: string;
  profileEmail: string;
  profileImage: string;
  kakaoAccountEmail: string;
  isLinked: boolean;
  onProfilePatched: (next: ProfilePatch) => void;
  onUnlinked: () => void;
  onRefresh: () => void;
};

type SaveProfileUpdates =
  | { nickname: string; email?: string; profileImageUrl?: string }
  | { email: string; nickname?: string; profileImageUrl?: string }
  | { profileImageBlob: Blob; nickname?: string; email?: string };

export function useMeProfileMutations({
  profileNickname,
  profileEmail,
  profileImage,
  kakaoAccountEmail,
  isLinked,
  onProfilePatched,
  onUnlinked,
  onRefresh,
}: UseMeProfileMutationsInput) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

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
      throw new Error("업로드한 이미지 URL을 찾지 못했어요.");
    }

    return fileUrl as string;
  }, []);

  const saveProfile = useCallback(
    async (updates: SaveProfileUpdates, field: NonNullable<SavingField>) => {
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
          nextProfileImageUrl = await uploadProfileImage(updates.profileImageBlob);
        } else if (typeof updates.profileImageUrl === "string") {
          nextProfileImageUrl = updates.profileImageUrl;
        }

        const body = {
          nickname:
            ("nickname" in updates ? updates.nickname : profileNickname) ?? "",
          email: ("email" in updates ? updates.email : profileEmail) ?? "",
          profileImageUrl: nextProfileImageUrl ?? "",
        };

        const result = await saveMeProfileRequest(body);

        if (!result.ok) {
          throw new Error(result.data.error || "변경 사항을 저장하지 못했어요.");
        }

        onProfilePatched({
          nickname: result.data.nickname ?? profileNickname,
          email: result.data.email ?? profileEmail,
          profileImage: result.data.profileImageUrl ?? nextProfileImageUrl ?? "",
          kakaoAccountEmail: result.data.kakaoEmail ?? kakaoAccountEmail,
        });

        onRefresh();
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
      onProfilePatched,
      onRefresh,
      profileEmail,
      profileImage,
      profileNickname,
      savingField,
      uploadProfileImage,
    ]
  );

  const unlinkPhone = useCallback(async () => {
    if (!isLinked || unlinkLoading) return;

    setUnlinkLoading(true);
    setUnlinkError(null);

    try {
      const result = await unlinkMyPhoneRequest();

      if (!result.ok) {
        setUnlinkError(result.data.error || "전화번호 연결 해제에 실패했어요.");
        return;
      }

      onUnlinked();
      onRefresh();
    } catch (error) {
      setUnlinkError(error instanceof Error ? error.message : String(error));
    } finally {
      setUnlinkLoading(false);
    }
  }, [isLinked, onRefresh, onUnlinked, unlinkLoading]);

  return {
    saveError,
    setSaveError,
    savingField,
    savingMessage,
    saveProfile,
    unlinkLoading,
    unlinkError,
    setUnlinkError,
    unlinkPhone,
  };
}

