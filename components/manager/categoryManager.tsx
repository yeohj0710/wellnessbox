"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { createCategory, deleteCategory, getCategories, updateCategory } from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import {
  ManagerActionRow,
  ManagerBadge,
  ManagerCard,
  ManagerCardGrid,
  ManagerDangerButton,
  ManagerEmptyState,
  ManagerField,
  ManagerInput,
  ManagerMetaRow,
  ManagerModal,
  ManagerPrimaryButton,
  ManagerResultsHeader,
  ManagerSecondaryButton,
  ManagerSection,
  ManagerToolbar,
  ManagerWorkspaceShell,
} from "./managerWorkspace";

type CategoryRecord = {
  id: number;
  name: string;
  image?: string | null;
  updatedAt?: string | Date;
  _count?: {
    products?: number;
  };
};

type CategoryDraft = {
  id?: number;
  name: string;
  image?: string | null;
};

const CATEGORY_SORT_OPTIONS = [
  { label: "최신 수정순", value: "recent" },
  { label: "이름순", value: "name" },
  { label: "상품 연결 많은 순", value: "linked-count" },
  { label: "이미지 보유 우선", value: "image-first" },
] as const;

function toDateValue(value: string | Date | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyDraft(): CategoryDraft {
  return {
    name: "",
    image: null,
  };
}

function CategoryCardImage(props: { image?: string | null; alt: string }) {
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

export default function CategoryManager() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [draft, setDraft] = useState<CategoryDraft>(createEmptyDraft());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState<(typeof CATEGORY_SORT_OPTIONS)[number]["value"]>("recent");
  const [formError, setFormError] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  async function refreshCategories() {
    setCategories((await getCategories()) as CategoryRecord[]);
  }

  useEffect(() => {
    void (async () => {
      await refreshCategories();
      setIsLoading(false);
    })();
  }, []);

  const visibleCategories = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const filtered = categories.filter((category) =>
      !keyword ? true : category.name.toLowerCase().includes(keyword)
    );

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortValue === "name") {
        return left.name.localeCompare(right.name, "ko");
      }
      if (sortValue === "linked-count") {
        return (right._count?.products || 0) - (left._count?.products || 0);
      }
      if (sortValue === "image-first") {
        return Number(Boolean(right.image)) - Number(Boolean(left.image));
      }
      return toDateValue(right.updatedAt) - toDateValue(left.updatedAt);
    });
    return sorted;
  }, [categories, deferredSearch, sortValue]);

  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function openCreateModal() {
    setDraft(createEmptyDraft());
    setSelectedFile(null);
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(category: CategoryRecord) {
    setDraft({
      id: category.id,
      name: category.name,
      image: category.image || null,
    });
    setSelectedFile(null);
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleFileUpload() {
    if (!selectedFile) return null;

    setIsUploadingImage(true);
    try {
      const { success, result } = await getUploadUrl();
      if (!success) throw new Error("이미지 업로드 URL을 가져오지 못했습니다.");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadResponse = await fetch(result.uploadURL, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("이미지 업로드에 실패했습니다.");
      }

      const responseData = await uploadResponse.json();
      const fileUrl = responseData.result.variants.find((url: string) => url.endsWith("/public"));
      if (!fileUrl) {
        throw new Error("업로드 이미지 URL을 찾지 못했습니다.");
      }
      return fileUrl;
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSubmit() {
    const normalizedName = draft.name.trim();
    if (!normalizedName) {
      setFormError("카테고리 이름은 비워둘 수 없습니다.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const uploadedImage = await handleFileUpload();
      const payload = {
        name: normalizedName,
        image: uploadedImage || draft.image || undefined,
      };

      if (draft.id) {
        await updateCategory(draft.id, payload);
      } else {
        await createCategory(payload);
      }

      await refreshCategories();
      setIsModalOpen(false);
      setDraft(createEmptyDraft());
      setSelectedFile(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "카테고리 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!draft.id) return;
    if (!window.confirm("정말로 이 카테고리를 삭제할까요?")) return;

    const result = await deleteCategory(draft.id);
    if (!result) {
      setFormError("상품이 연결된 카테고리는 먼저 상품에서 제거해야 삭제할 수 있습니다.");
      return;
    }

    await refreshCategories();
    setIsModalOpen(false);
    setDraft(createEmptyDraft());
    setSelectedFile(null);
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  const imageReadyCount = categories.filter((category) => Boolean(category.image)).length;

  return (
    <>
      <ManagerWorkspaceShell
        eyebrow="Category System"
        title="카테고리 체계 관리"
        description="카테고리 대표 이미지를 포함한 분류 체계를 빠르게 정리하고, 연결 상품 수까지 함께 보면서 운영 우선순위를 조정합니다."
        stats={[
          { label: "전체 카테고리", value: `${categories.length}개`, tone: "accent" },
          { label: "이미지 보유", value: `${imageReadyCount}개` },
          { label: "검색 결과", value: `${visibleCategories.length}개`, tone: "warn" },
        ]}
        toolbar={
          <ManagerToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="카테고리 이름으로 검색"
            sortValue={sortValue}
            onSortChange={(value) => setSortValue(value as (typeof CATEGORY_SORT_OPTIONS)[number]["value"])}
            sortOptions={[...CATEGORY_SORT_OPTIONS]}
            actionLabel="새 카테고리 등록"
            onAction={openCreateModal}
          />
        }
      >
        <ManagerResultsHeader
          title="카테고리 보드"
          description="대표 이미지를 유지한 채 이름 수정, 신규 등록, 삭제를 더 빠르게 처리할 수 있도록 재구성했습니다."
          count={visibleCategories.length}
        />

        {visibleCategories.length > 0 ? (
          <ManagerCardGrid>
            {visibleCategories.map((category) => (
              <ManagerCard
                key={category.id}
                image={<CategoryCardImage image={category.image} alt={category.name} />}
                title={category.name}
                description={
                  category.image
                    ? "대표 이미지가 준비된 상태입니다."
                    : "대표 이미지가 없습니다. 클릭해서 시각 자산을 추가할 수 있습니다."
                }
                badges={
                  <>
                    <ManagerBadge tone="accent">연결 상품 {category._count?.products || 0}</ManagerBadge>
                    <ManagerBadge tone={category.image ? "default" : "warn"}>
                      {category.image ? "이미지 준비됨" : "이미지 필요"}
                    </ManagerBadge>
                  </>
                }
                meta={
                  <>
                    <ManagerMetaRow
                      label="최근 수정"
                      value={new Date(category.updatedAt || Date.now()).toLocaleDateString("ko-KR")}
                    />
                    <ManagerMetaRow label="상태" value={category.image ? "대표 이미지 연결" : "텍스트만 등록"} />
                  </>
                }
                footer={<div className="text-sm font-bold text-sky-700">편집 열기</div>}
                onClick={() => openEditModal(category)}
              />
            ))}
          </ManagerCardGrid>
        ) : (
          <ManagerEmptyState
            title="검색 결과가 없습니다"
            description="카테고리 이름을 다시 검색하거나 새 카테고리를 추가해보세요."
            actionLabel="새 카테고리 등록"
            onAction={openCreateModal}
          />
        )}
      </ManagerWorkspaceShell>

      <ManagerModal
        open={isModalOpen}
        title={draft.id ? "카테고리 편집" : "새 카테고리 등록"}
        description="이름과 대표 이미지를 함께 정리해 상품 선택 UX를 더 안정적으로 유지합니다."
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
        }}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)]">
          <ManagerSection title="기본 정보" description="카테고리 이름은 검색과 연결 UI에서 그대로 노출됩니다.">
            <div className="space-y-4">
              <ManagerField label="카테고리 이름">
                <ManagerInput
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="예: 밀크씨슬"
                />
              </ManagerField>

              <div className="grid gap-3 sm:grid-cols-2">
                <ManagerMetaRow label="연결 상품" value={`${categories.find((item) => item.id === draft.id)?._count?.products || 0}개`} />
                <ManagerMetaRow label="대표 이미지" value={selectedFile || draft.image ? "준비됨" : "없음"} />
              </div>
            </div>
          </ManagerSection>

          <ManagerSection title="대표 이미지" description="카테고리 카드와 선택 목록에서 사용할 대표 이미지를 관리합니다.">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <ManagerSecondaryButton
                  onClick={() => document.getElementById("category-image-upload-input")?.click()}
                >
                  이미지 추가
                </ManagerSecondaryButton>
                <input
                  id="category-image-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                {(selectedFile || draft.image) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setDraft((prev) => ({ ...prev, image: null }));
                    }}
                    className="text-sm font-semibold text-rose-500"
                  >
                    이미지 제거
                  </button>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <div className="relative h-72 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
                  {selectedFile || draft.image ? (
                    <Image
                      src={previewUrl || draft.image || ""}
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
        </div>

        {formError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {formError}
          </div>
        ) : null}

        <ManagerActionRow>
          {draft.id ? <ManagerDangerButton onClick={() => void handleDelete()}>삭제</ManagerDangerButton> : null}
          <ManagerSecondaryButton onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
            취소
          </ManagerSecondaryButton>
          <ManagerPrimaryButton
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isUploadingImage}
          >
            {isSubmitting ? "저장 중..." : draft.id ? "수정 저장" : "카테고리 등록"}
          </ManagerPrimaryButton>
        </ManagerActionRow>
      </ManagerModal>
    </>
  );
}
