"use client";

import Image from "next/image";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUploadUrl } from "@/lib/upload";
import LogoutButton from "./logoutButton";
import OrdersSection from "./ordersSection";
import PhoneVerifyModal from "./phoneVerifyModal";

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
  const [savingField, setSavingField] = useState<"nickname" | "email" | "image" | null>(
    null
  );
  const [savingMessage, setSavingMessage] = useState<string | null>(null);

  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [phone, setPhone] = useState(initialPhone ?? "");
  const [linkedAt, setLinkedAt] = useState<string | undefined>(initialLinkedAt);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

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
  }, [initialPhone, initialLinkedAt, nickname, email, profileImageUrl, kakaoEmail]);

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
          nextProfileImageUrl = await uploadProfileImage(updates.profileImageBlob);
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

        <section className="mt-7 rounded-2xl bg-gray-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => document.getElementById("profile-image-input")?.click()}
                className="group relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full ring-2 ring-sky-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                {imagePreviewUrl || profileImage ? (
                  <Image
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
                  <span className="text-xs font-semibold text-white">이미지 변경</span>
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

            <div className="min-w-0 flex-1 space-y-4">
              <InlineEditableField
                label="닉네임"
                value={profileNickname}
                placeholder="닉네임 없음"
                saving={savingField === "nickname"}
                onSave={async (next) => {
                  if (next === profileNickname) return;
                  const previous = profileNickname;
                  setProfileNickname(next);
                  try {
                    await saveProfile({ nickname: next }, "nickname");
                  } catch {
                    setProfileNickname(previous);
                  }
                }}
                maxLength={60}
                error={savingField ? null : saveError}
              />

              <InlineEditableField
                label="이메일"
                value={profileEmail}
                placeholder={kakaoAccountEmail || "example@email.com"}
                saving={savingField === "email"}
                onSave={async (next) => {
                  if (next === profileEmail) return;
                  const previous = profileEmail;
                  setProfileEmail(next);
                  try {
                    await saveProfile({ email: next }, "email");
                  } catch {
                    setProfileEmail(previous);
                  }
                }}
                maxLength={120}
                type="email"
                error={savingField ? null : saveError}
              />

              <div className="grid grid-cols-[88px_1fr_auto] items-center gap-2 sm:grid-cols-[96px_1fr_auto] sm:gap-3">
                <div className="text-sm font-semibold text-gray-900">전화번호</div>
                <div className="min-w-0 break-words text-sm text-gray-800">
                  {hasPhone ? phoneDisplay : "없음"}
                </div>
                <div className="col-start-2 sm:col-start-auto flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setUnlinkError(null);
                      setIsVerifyOpen(true);
                    }}
                    className="inline-flex h-9 min-w-[64px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
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

type InlineEditableFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  saving?: boolean;
  onSave: (value: string) => Promise<void> | void;
  maxLength?: number;
  type?: "text" | "email";
  helper?: string;
  error?: string | null;
};

function InlineEditableField({
  label,
  value,
  placeholder,
  saving,
  onSave,
  maxLength,
  type = "text",
  helper,
  error,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setLocalError(null);
    if (draft.trim() === value.trim()) {
      setEditing(false);
      return;
    }

    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "변경을 저장하지 못했어요."
      );
    }
  }, [draft, onSave, saving, value]);

  return (
    <div className="grid grid-cols-[88px_1fr_auto] items-center gap-2 sm:grid-cols-[96px_1fr_auto] sm:gap-3">
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      <div className="min-w-0 text-sm text-gray-800 flex flex-col justify-center">
        {editing ? (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(value);
              }
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none"
            placeholder={placeholder}
          />
        ) : (
          <p className={value ? "text-gray-900" : "text-gray-500"}>
            {value || placeholder || "입력 없음"}
          </p>
        )}
        {helper && (
          <p className="mt-1 text-xs text-gray-500">{helper}</p>
        )}
        {(localError || error) && (
          <p className="mt-1 text-xs text-rose-600">{localError || error}</p>
        )}
      </div>
      <div className="flex items-center justify-end self-center">
        <button
          type="button"
          onClick={() => {
            if (editing) {
              handleSave();
            } else {
              setEditing(true);
            }
          }}
          disabled={!!saving}
          className="inline-flex h-9 min-w-[64px] items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
              저장 중
            </span>
          ) : editing ? (
            "적용"
          ) : (
            "변경"
          )}
        </button>
      </div>
    </div>
  );
}

type ProfileImageEditorProps = {
  file: File;
  onCancel: () => void;
  onApply: (blob: Blob, previewUrl: string) => void | Promise<void>;
};

function ProfileImageEditor({ file, onCancel, onApply }: ProfileImageEditorProps) {
  const [objectUrl, setObjectUrl] = useState<string>(() =>
    typeof window !== "undefined" ? URL.createObjectURL(file) : ""
  );
  const minZoom = 1;
  const maxZoom = 3.2;
  const [zoom, setZoom] = useState(1.1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });

  const previewSize = 320;

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const clampZoom = useCallback(
    (value: number) => Math.min(maxZoom, Math.max(minZoom, value)),
    [maxZoom, minZoom]
  );

  const baseScale = useMemo(() => {
    const { width, height } = naturalSize;
    return Math.max(previewSize / width, previewSize / height);
  }, [naturalSize]);

  useEffect(() => {
    const clamp = () => {
      const scaledWidth = naturalSize.width * baseScale * zoom;
      const scaledHeight = naturalSize.height * baseScale * zoom;
      const maxX = Math.max(0, (scaledWidth - previewSize) / 2);
      const maxY = Math.max(0, (scaledHeight - previewSize) / 2);
      setPosition((prev) => ({
        x: Math.min(Math.max(prev.x, -maxX), maxX),
        y: Math.min(Math.max(prev.y, -maxY), maxY),
      }));
    };
    clamp();
  }, [baseScale, previewSize, zoom, naturalSize.width, naturalSize.height]);

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    setDragging(true);
    setStartPoint({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const scaledWidth = naturalSize.width * baseScale * zoom;
    const scaledHeight = naturalSize.height * baseScale * zoom;
    const maxX = Math.max(0, (scaledWidth - previewSize) / 2);
    const maxY = Math.max(0, (scaledHeight - previewSize) / 2);
    const nextX = e.clientX - startPoint.x;
    const nextY = e.clientY - startPoint.y;
    setPosition({
      x: Math.min(Math.max(nextX, -maxX), maxX),
      y: Math.min(Math.max(nextY, -maxY), maxY),
    });
  };

  const handleDragEnd = () => setDragging(false);

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? -0.12 : 0.12;
      setZoom((prev) => clampZoom(prev - delta));
    },
    [clampZoom]
  );

  const handleApply = async () => {
    const img = new Image();
    img.src = objectUrl;
    await new Promise((resolve) => {
      if (img.complete) return resolve(null);
      img.onload = () => resolve(null);
    });

    const canvasSize = 640;
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = baseScale * zoom;
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const ratio = canvasSize / previewSize;
    const dx = (canvasSize - drawWidth) / 2 + position.x * ratio;
    const dy = (canvasSize - drawHeight) / 2 + position.y * ratio;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const preview = canvas.toDataURL("image/jpeg", 0.92);
      onApply(blob, preview);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">프로필 이미지 편집</h2>
            <p className="mt-1 text-xs text-gray-600">
              이미지 위를 드래그해 위치를 옮기고, 마우스 휠로 자연스럽게 확대/축소하세요.
              아래 슬라이더로도 미세 조정이 가능해요.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className="relative h-[320px] w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
            onWheel={handleWheel}
          >
            <Image
              src={objectUrl}
              alt="미리보기"
              fill
              sizes="320px"
              unoptimized
              className="select-none"
              draggable={false}
              onLoadingComplete={(img) =>
                setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
              }
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${baseScale * zoom})`,
                transformOrigin: "center",
              }}
            />
          </div>

          <div className="flex w-full items-center gap-3">
            <span className="text-xs text-gray-600">확대</span>
            <input
              type="range"
              min={1}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(clampZoom(parseFloat(e.target.value)))}
              className="flex-1 accent-sky-500"
            />
            <span className="text-xs text-gray-600">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
