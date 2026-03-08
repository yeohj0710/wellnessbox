"use client";

import Image from "next/image";
import { PhotoIcon } from "@heroicons/react/24/outline";
import {
  ManagerField,
  ManagerInput,
  ManagerMetaRow,
  ManagerSecondaryButton,
  ManagerSection,
} from "./managerWorkspace";
import type { CategoryDraft } from "./categoryManager.types";

export function CategoryCardImage(props: { image?: string | null; alt: string }) {
  if (!props.image) {
    return (
      <div className="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.85),rgba(248,250,252,0.95))] text-slate-400">
        <PhotoIcon className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="relative h-40 overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <Image src={props.image} alt={props.alt} fill sizes="360px" className="object-contain p-5" />
    </div>
  );
}

export function CategoryBasicsSection({
  draft,
  linkedProductsCount,
  imageStatus,
  onNameChange,
}: {
  draft: CategoryDraft;
  linkedProductsCount: number;
  imageStatus: string;
  onNameChange: (value: string) => void;
}) {
  return (
    <ManagerSection
      title="기본 정보"
      description="카테고리 이름은 검색과 연결 UI에서 그대로 노출됩니다."
    >
      <div className="space-y-4">
        <ManagerField label="카테고리 이름">
          <ManagerInput
            value={draft.name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="예: 베이직"
          />
        </ManagerField>

        <div className="grid gap-3 sm:grid-cols-2">
          <ManagerMetaRow label="연결 상품" value={`${linkedProductsCount}개`} />
          <ManagerMetaRow label="대표 이미지" value={imageStatus} />
        </div>
      </div>
    </ManagerSection>
  );
}

export function CategoryImageSection({
  previewUrl,
  currentImage,
  onOpenFilePicker,
  onFileSelected,
  onClearImage,
}: {
  previewUrl: string | null;
  currentImage?: string | null;
  onOpenFilePicker: () => void;
  onFileSelected: (file: File | null) => void;
  onClearImage: () => void;
}) {
  const hasImage = Boolean(previewUrl || currentImage);

  return (
    <ManagerSection
      title="대표 이미지"
      description="카테고리 카드와 선택 목록에서 사용할 대표 이미지를 관리합니다."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ManagerSecondaryButton onClick={onOpenFilePicker}>이미지 추가</ManagerSecondaryButton>
          <input
            id="category-image-upload-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onFileSelected(event.target.files?.[0] || null)}
          />
          {hasImage ? (
            <button type="button" onClick={onClearImage} className="text-sm font-semibold text-rose-500">
              이미지 제거
            </button>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          <div className="relative h-72 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
            {hasImage ? (
              <Image
                src={previewUrl || currentImage || ""}
                alt="카테고리 미리보기"
                fill
                sizes="640px"
                className="object-contain p-6"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <PhotoIcon className="h-16 w-16" />
              </div>
            )}
          </div>
        </div>
      </div>
    </ManagerSection>
  );
}
