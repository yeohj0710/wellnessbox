"use client";

import Image from "next/image";
import { ArrowPathIcon, PhotoIcon } from "@heroicons/react/24/outline";
import {
  ManagerField,
  ManagerInput,
  ManagerMetaRow,
  ManagerSecondaryButton,
  ManagerSection,
  ManagerTextarea,
} from "./managerWorkspace";
import type { CategoryOption, ProductDraft } from "./productManager.types";

export function ProductCardImage(props: { image?: string | null; alt: string }) {
  if (!props.image) {
    return (
      <div className="flex h-44 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.85),rgba(248,250,252,0.95))] text-slate-400">
        <PhotoIcon className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="relative h-44 overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <Image src={props.image} alt={props.alt} fill sizes="420px" className="object-contain p-5" />
    </div>
  );
}

export function ProductBasicsSection({
  draft,
  selectedFilesCount,
  onNameChange,
  onDescriptionChange,
}: {
  draft: ProductDraft;
  selectedFilesCount: number;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <ManagerSection
      title="기본 정보"
      description="검색성과 품질에 직접 영향을 주는 상품 기본 정보를 정리합니다."
    >
      <div className="space-y-4">
        <ManagerField label="상품명">
          <ManagerInput
            value={draft.name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="예: 나우푸드 밀크씨슬"
          />
        </ManagerField>

        <ManagerField
          label="상품 설명"
          hint="간단한 설명이라도 적어두면 검색과 운영 판단이 쉬워집니다."
        >
          <ManagerTextarea
            value={draft.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="대표 효능, 용량 특징, 운영 메모 등을 적어주세요."
          />
        </ManagerField>

        <div className="grid gap-3 sm:grid-cols-2">
          <ManagerMetaRow label="선택 카테고리" value={`${draft.categories.length}개`} />
          <ManagerMetaRow label="저장된 이미지" value={`${draft.images.length + selectedFilesCount}장`} />
        </div>
      </div>
    </ManagerSection>
  );
}

export function ProductCategoriesSection({
  categories,
  draftCategories,
  categorySearchValue,
  isRefreshingCategories,
  onCategorySearchChange,
  onRefreshCategories,
  onToggleCategory,
}: {
  categories: CategoryOption[];
  draftCategories: CategoryOption[];
  categorySearchValue: string;
  isRefreshingCategories: boolean;
  onCategorySearchChange: (value: string) => void;
  onRefreshCategories: () => void;
  onToggleCategory: (category: CategoryOption) => void;
}) {
  return (
    <ManagerSection
      title="카테고리 연결"
      description="오른쪽에서 검색 후 체크하면 즉시 현재 상품에 연결됩니다."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ManagerInput
            value={categorySearchValue}
            onChange={(event) => onCategorySearchChange(event.target.value)}
            placeholder="카테고리 검색"
          />
          <button
            type="button"
            onClick={onRefreshCategories}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label="카테고리 새로고침"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshingCategories ? "animate-spin" : ""}`} />
          </button>
        </div>

        {draftCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {draftCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onToggleCategory(category)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
              >
                {category.name}
                <span className="text-white/70">삭제</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">아직 연결된 카테고리가 없습니다.</p>
        )}

        <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
          {categories.map((category) => {
            const checked = draftCategories.some((item) => item.id === category.id);

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onToggleCategory(category)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  checked
                    ? "border-sky-200 bg-sky-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="112px"
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <PhotoIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{category.name}</p>
                  <p className="text-xs text-slate-500">연결 상품 {category._count?.products || 0}개</p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border ${
                    checked ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </ManagerSection>
  );
}

export function ProductImagesSection({
  savedImages,
  previewImages,
  onOpenFilePicker,
  onFilesSelected,
  onRemoveSavedImage,
  onRemoveSelectedFile,
}: {
  savedImages: string[];
  previewImages: Array<{ key: string; url: string }>;
  onOpenFilePicker: () => void;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveSavedImage: (index: number) => void;
  onRemoveSelectedFile: (index: number) => void;
}) {
  return (
    <ManagerSection
      title="이미지 자산"
      description="기존 이미지를 유지하거나 새 파일을 추가해 대표 썸네일 구성을 빠르게 정리할 수 있습니다."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ManagerSecondaryButton onClick={onOpenFilePicker}>이미지 추가</ManagerSecondaryButton>
          <input
            id="product-image-upload-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => onFilesSelected(event.target.files)}
          />
          <p className="text-sm text-slate-500">여러 장을 한 번에 추가할 수 있습니다.</p>
        </div>

        {savedImages.length === 0 && previewImages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            등록된 이미지가 없습니다.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {savedImages.map((image, index) => (
              <div
                key={`saved-${image}-${index}`}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white"
              >
                <div className="relative h-36 bg-slate-50">
                  <Image
                    src={image}
                    alt={`상품 이미지 ${index + 1}`}
                    fill
                    sizes="240px"
                    className="object-contain p-3"
                  />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold text-slate-500">저장됨</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSavedImage(index)}
                    className="text-xs font-bold text-rose-500"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}

            {previewImages.map((preview, index) => (
              <div
                key={preview.key}
                className="overflow-hidden rounded-[24px] border border-sky-200 bg-sky-50/60"
              >
                <div className="relative h-36">
                  <Image
                    src={preview.url}
                    alt={`새 이미지 ${index + 1}`}
                    fill
                    sizes="240px"
                    className="object-contain p-3"
                  />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold text-sky-700">업로드 예정</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSelectedFile(index)}
                    className="text-xs font-bold text-rose-500"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ManagerSection>
  );
}
