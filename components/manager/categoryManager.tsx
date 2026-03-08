"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createCategory, deleteCategory, getCategories, updateCategory } from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import {
  ManagerActionRow,
  ManagerBadge,
  ManagerCard,
  ManagerCardGrid,
  ManagerDangerButton,
  ManagerEmptyState,
  ManagerMetaRow,
  ManagerModal,
  ManagerPrimaryButton,
  ManagerResultsHeader,
  ManagerSecondaryButton,
  ManagerToolbar,
  ManagerWorkspaceShell,
} from "./managerWorkspace";
import {
  CATEGORY_SORT_OPTIONS,
  createEmptyDraft,
  getVisibleCategories,
  type CategoryDraft,
  type CategoryRecord,
  type CategorySortValue,
} from "./categoryManager.types";
import {
  CategoryBasicsSection,
  CategoryCardImage,
  CategoryImageSection,
} from "./categoryManager.sections";

export default function CategoryManager() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [draft, setDraft] = useState<CategoryDraft>(createEmptyDraft());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState<CategorySortValue>("recent");
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
    return getVisibleCategories({
      categories,
      keyword: deferredSearch,
      sortValue,
    });
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
        throw new Error("업로드된 이미지 URL을 찾지 못했습니다.");
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
      setFormError("상품과 연결된 카테고리는 먼저 상품 쪽에서 해제해야 삭제할 수 있습니다.");
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
  const linkedProductsCount = categories.find((item) => item.id === draft.id)?._count?.products || 0;

  return (
    <>
      <ManagerWorkspaceShell
        eyebrow="Category System"
        title="카테고리 체계 관리"
        description="카테고리 이름과 대표 이미지를 포함한 분류 체계를 빠르게 정리하고, 연결 상품 수까지 함께 보면서 운영 우선순위를 조정합니다."
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
            onSortChange={(value) => setSortValue(value as CategorySortValue)}
            sortOptions={[...CATEGORY_SORT_OPTIONS]}
            actionLabel="새 카테고리 등록"
            onAction={openCreateModal}
          />
        }
      >
        <ManagerResultsHeader
          title="카테고리 보드"
          description="대표 이미지 유무를 바로 확인하고, 이름 수정과 신규 등록, 삭제를 빠르게 처리할 수 있도록 구성했습니다."
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
            description="카테고리 이름을 다시 검색하거나 새 카테고리를 추가해 보세요."
            actionLabel="새 카테고리 등록"
            onAction={openCreateModal}
          />
        )}
      </ManagerWorkspaceShell>

      <ManagerModal
        open={isModalOpen}
        title={draft.id ? "카테고리 편집" : "새 카테고리 등록"}
        description="이름과 대표 이미지를 함께 정리해 상품 선택 UX를 일관되게 유지합니다."
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
        }}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)]">
          <CategoryBasicsSection
            draft={draft}
            linkedProductsCount={linkedProductsCount}
            imageStatus={selectedFile || draft.image ? "준비됨" : "없음"}
            onNameChange={(value) => setDraft((prev) => ({ ...prev, name: value }))}
          />

          <CategoryImageSection
            previewUrl={previewUrl}
            currentImage={draft.image}
            onOpenFilePicker={() => document.getElementById("category-image-upload-input")?.click()}
            onFileSelected={setSelectedFile}
            onClearImage={() => {
              setSelectedFile(null);
              setDraft((prev) => ({ ...prev, image: null }));
            }}
          />
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
          <ManagerPrimaryButton onClick={() => void handleSubmit()} disabled={isSubmitting || isUploadingImage}>
            {isSubmitting ? "저장 중..." : draft.id ? "수정 저장" : "카테고리 등록"}
          </ManagerPrimaryButton>
        </ManagerActionRow>
      </ManagerModal>
    </>
  );
}
