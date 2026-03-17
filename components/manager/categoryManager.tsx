"use client";

import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
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
  CategoryBasicsSection,
  CategoryCardImage,
  CategoryImageSection,
} from "./categoryManager.sections";
import {
  CATEGORY_SORT_OPTIONS,
  type CategorySortValue,
} from "./categoryManager.types";
import { useCategoryManager } from "./useCategoryManager";

export default function CategoryManager() {
  const {
    categories,
    draft,
    isModalOpen,
    isLoading,
    isSubmitting,
    isUploadingImage,
    searchValue,
    sortValue,
    formError,
    visibleCategories,
    previewUrl,
    imageReadyCount,
    linkedProductsCount,
    setSearchValue,
    setSortValue,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleDraftNameChange,
    setSelectedFile,
    clearImage,
  } = useCategoryManager();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <ManagerWorkspaceShell
        eyebrow="Category System"
        title="카테고리 체계 관리"
        description="카테고리 이름과 대표 이미지를 포함한 분류 체계를 빠르게 정리하고, 연결된 상품 수까지 함께 보면서 운영 우선순위를 조정합니다."
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
          description="대표 이미지 유무와 연결 상태를 바로 확인하고, 이름 수정과 삭제까지 빠르게 처리할 수 있도록 구성했습니다."
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
                    <ManagerBadge tone="accent">
                      연결 상품 {category._count?.products || 0}
                    </ManagerBadge>
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
                    <ManagerMetaRow
                      label="상태"
                      value={category.image ? "대표 이미지 연결" : "텍스트만 등록"}
                    />
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
        description="이름과 대표 이미지를 함께 정리해서 상품 탐색 경험을 더 쉽게 맞춥니다."
        onClose={closeModal}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)]">
          <CategoryBasicsSection
            draft={draft}
            linkedProductsCount={linkedProductsCount}
            imageStatus={previewUrl || draft.image ? "준비됨" : "없음"}
            onNameChange={handleDraftNameChange}
          />

          <CategoryImageSection
            previewUrl={previewUrl}
            currentImage={draft.image}
            onOpenFilePicker={() =>
              document.getElementById("category-image-upload-input")?.click()
            }
            onFileSelected={setSelectedFile}
            onClearImage={clearImage}
          />
        </div>

        {formError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {formError}
          </div>
        ) : null}

        <ManagerActionRow>
          {draft.id ? (
            <ManagerDangerButton onClick={() => void handleDelete()}>
              삭제
            </ManagerDangerButton>
          ) : null}
          <ManagerSecondaryButton onClick={closeModal} disabled={isSubmitting}>
            취소
          </ManagerSecondaryButton>
          <ManagerPrimaryButton
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isUploadingImage}
          >
            {isSubmitting
              ? <InlineSpinnerLabel label="저장 중" />
              : draft.id
                ? "수정 저장"
                : "카테고리 등록"}
          </ManagerPrimaryButton>
        </ManagerActionRow>
      </ManagerModal>
    </>
  );
}
