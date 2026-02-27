"use client";

import NextImage from "next/image";
import { useRef } from "react";

type SavingField = "nickname" | "email" | "image" | null;

type MeProfileSectionProps = {
  imagePreviewUrl: string | null;
  profileImage: string;
  profileNickname: string;
  profileEmail: string;
  kakaoAccountEmail: string;
  hasPhone: boolean;
  phoneDisplay: string;
  saveError: string | null;
  savingMessage: string | null;
  savingField: SavingField;
  onEditNickname: () => void;
  onEditEmail: () => void;
  onEditPhone: () => void;
  onSelectImageFile: (file: File) => void;
};

type ProfileInfoRowProps = {
  label: string;
  value: string;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
};

function ProfileInfoRow({
  label,
  value,
  buttonLabel,
  onClick,
  disabled = false,
}: ProfileInfoRowProps) {
  return (
    <div className="grid grid-cols-[60px_1fr_auto] items-center gap-2 sm:grid-cols-[60px_1fr_auto] sm:gap-3">
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      <div className="min-w-0 break-words text-sm text-gray-800">{value}</div>
      <div className="flex items-center justify-end self-center">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="inline-flex h-6 min-w-[64px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

export function MeProfileSection({
  imagePreviewUrl,
  profileImage,
  profileNickname,
  profileEmail,
  kakaoAccountEmail,
  hasPhone,
  phoneDisplay,
  saveError,
  savingMessage,
  savingField,
  onEditNickname,
  onEditEmail,
  onEditPhone,
  onSelectImageFile,
}: MeProfileSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedImage = imagePreviewUrl || profileImage;

  return (
    <section
      id="me-profile-section"
      className="mt-7 rounded-2xl bg-gray-50 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:gap-8 sm:flex-row sm:items-center">
        <div className="relative inline-flex items-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full ring-2 ring-sky-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-200"
            aria-label="프로필 이미지 변경"
          >
            {resolvedImage ? (
              <NextImage
                src={resolvedImage}
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
              <span className="text-xs font-semibold text-white">이미지 변경</span>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onSelectImageFile(file);
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <ProfileInfoRow
            label="닉네임"
            value={profileNickname || "닉네임 없음"}
            buttonLabel="변경"
            onClick={onEditNickname}
            disabled={savingField === "nickname"}
          />
          <ProfileInfoRow
            label="이메일"
            value={profileEmail || kakaoAccountEmail || "이메일 없음"}
            buttonLabel="변경"
            onClick={onEditEmail}
          />
          <ProfileInfoRow
            label="전화번호"
            value={hasPhone ? phoneDisplay : "없음"}
            buttonLabel={hasPhone ? "변경" : "추가"}
            onClick={onEditPhone}
          />

          {saveError && !savingField ? (
            <p className="text-sm font-medium text-rose-600">{saveError}</p>
          ) : null}
          {savingMessage ? (
            <p className="text-sm text-sky-700">{savingMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
