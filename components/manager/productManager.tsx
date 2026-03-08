"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { createProduct, deleteProduct, getCategories, getProductsForAdmin, updateProduct } from "@/lib/product";
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
  createEmptyDraft,
  getVisibleCategories,
  getVisibleProducts,
  PRODUCT_SORT_OPTIONS,
  type CategoryOption,
  type ProductDraft,
  type ProductRecord,
  type ProductSortValue,
} from "./productManager.types";
import {
  ProductBasicsSection,
  ProductCardImage,
  ProductCategoriesSection,
  ProductImagesSection,
} from "./productManager.sections";

export default function ProductManager() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(createEmptyDraft());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRefreshingCategories, setIsRefreshingCategories] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState<ProductSortValue>("recent");
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [formError, setFormError] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
  const deferredCategorySearch = useDeferredValue(categorySearchValue);

  async function refreshData() {
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      getProductsForAdmin(),
      getCategories(),
    ]);
    setProducts(fetchedProducts as ProductRecord[]);
    setCategories(fetchedCategories as CategoryOption[]);
  }

  useEffect(() => {
    void (async () => {
      await refreshData();
      setIsLoading(false);
    })();
  }, []);

  const visibleProducts = useMemo(() => {
    return getVisibleProducts({
      products,
      keyword: deferredSearch,
      sortValue,
    });
  }, [deferredSearch, products, sortValue]);

  const visibleCategories = useMemo(() => {
    return getVisibleCategories({
      categories,
      keyword: deferredCategorySearch,
    });
  }, [categories, deferredCategorySearch]);

  const totalLinkedCount = useMemo(
    () => products.reduce((sum, product) => sum + (product._count?.pharmacyProducts || 0), 0),
    [products]
  );

  const previewImages = useMemo(
    () => selectedFiles.map((file) => ({ key: `${file.name}-${file.size}`, url: URL.createObjectURL(file) })),
    [selectedFiles]
  );

  useEffect(() => {
    return () => {
      previewImages.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewImages]);

  function openCreateModal() {
    setDraft(createEmptyDraft());
    setSelectedFiles([]);
    setCategorySearchValue("");
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(product: ProductRecord) {
    setDraft({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      images: product.images || [],
      categories: product.categories || [],
    });
    setSelectedFiles([]);
    setCategorySearchValue("");
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleImageUpload() {
    if (selectedFiles.length === 0) return [];
    setIsUploadingImage(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selectedFiles) {
        const { success, result } = await getUploadUrl();
        if (!success) throw new Error("이미지 업로드 URL을 준비하지 못했습니다.");

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(result.uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("이미지 업로드에 실패했습니다.");
        }

        const responseData = await response.json();
        const fileUrl = responseData.result.variants.find((url: string) => url.endsWith("/public"));
        if (!fileUrl) {
          throw new Error("업로드된 이미지 URL을 확인하지 못했습니다.");
        }
        uploadedUrls.push(fileUrl);
      }

      return uploadedUrls;
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSubmit() {
    const normalizedName = draft.name.trim();
    if (!normalizedName) {
      setFormError("상품명은 비워둘 수 없습니다.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const uploadedImages = await handleImageUpload();
      const payload = {
        ...draft,
        name: normalizedName,
        description: draft.description.trim(),
        images: [...draft.images, ...uploadedImages],
      };

      if (draft.id) {
        await updateProduct(draft.id, payload);
      } else {
        await createProduct(payload);
      }

      await refreshData();
      setIsModalOpen(false);
      setDraft(createEmptyDraft());
      setSelectedFiles([]);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "상품 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!draft.id) return;
    if (!window.confirm("정말로 이 상품을 삭제할까요?")) return;

    const result = await deleteProduct(draft.id);
    if (!result) {
      setFormError("약국 상품에 연결된 상품은 먼저 약국 상품을 정리해야 삭제할 수 있습니다.");
      return;
    }

    await refreshData();
    setIsModalOpen(false);
    setDraft(createEmptyDraft());
    setSelectedFiles([]);
  }

  async function handleRefreshCategories() {
    setIsRefreshingCategories(true);
    try {
      setCategories((await getCategories()) as CategoryOption[]);
    } finally {
      setIsRefreshingCategories(false);
    }
  }

  function toggleCategory(category: CategoryOption) {
    const exists = draft.categories.some((item) => item.id === category.id);
    setDraft((prev) => ({
      ...prev,
      categories: exists
        ? prev.categories.filter((item) => item.id !== category.id)
        : [...prev.categories, category],
    }));
  }

  function removeSavedImage(index: number) {
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  }

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
        eyebrow="Product Catalog"
        title="상품 마스터 관리"
        description="공통 상품과 카테고리 연결 구조를 한 화면에서 정리합니다. 검색과 정렬, 연결 현황 확인, 이미지 편집까지 한 흐름으로 처리할 수 있습니다."
        stats={[
          { label: "전체 상품", value: `${products.length}개`, tone: "accent" },
          { label: "현재 결과", value: `${visibleProducts.length}개` },
          { label: "약국 연결 수", value: `${totalLinkedCount}건`, tone: "warn" },
        ]}
        toolbar={
          <ManagerToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="상품명, 카테고리, 설명으로 검색"
            sortValue={sortValue}
            onSortChange={(value) => setSortValue(value as ProductSortValue)}
            sortOptions={[...PRODUCT_SORT_OPTIONS]}
            actionLabel="새 상품 등록"
            onAction={openCreateModal}
            auxiliaryAction={
              <button
                type="button"
                onClick={() => void refreshData()}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="새로고침"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            }
          />
        }
      >
        <ManagerResultsHeader
          title="상품 목록"
          description="카드를 누르면 큰 편집 패널이 열리고, 카테고리와 이미지 구성을 바로 수정할 수 있습니다."
          count={visibleProducts.length}
        />

        {visibleProducts.length > 0 ? (
          <ManagerCardGrid>
            {visibleProducts.map((product) => (
              <ManagerCard
                key={product.id}
                image={<ProductCardImage image={product.images?.[0]} alt={product.name || "상품"} />}
                title={product.name || "이름 없는 상품"}
                description={product.description || "설명이 아직 없습니다. 클릭해서 기본 정보를 보강할 수 있습니다."}
                badges={
                  <>
                    <ManagerBadge tone="accent">{product.categories.length}개 카테고리</ManagerBadge>
                    <ManagerBadge tone={product._count?.pharmacyProducts ? "warn" : "default"}>
                      약국 연결 {product._count?.pharmacyProducts || 0}
                    </ManagerBadge>
                  </>
                }
                meta={
                  <>
                    <ManagerMetaRow
                      label="카테고리"
                      value={
                        product.categories.length > 0
                          ? product.categories.slice(0, 2).map((category) => category.name).join(", ")
                          : "미지정"
                      }
                    />
                    <ManagerMetaRow
                      label="최근 수정"
                      value={new Date(product.updatedAt || Date.now()).toLocaleDateString("ko-KR")}
                    />
                  </>
                }
                footer={<div className="text-sm font-bold text-sky-700">편집 열기</div>}
                onClick={() => openEditModal(product)}
              />
            ))}
          </ManagerCardGrid>
        ) : (
          <ManagerEmptyState
            title="검색 조건에 맞는 상품이 없습니다"
            description="검색어를 바꾸거나 새 상품을 등록해서 카탈로그를 확장해보세요."
            actionLabel="새 상품 등록"
            onAction={openCreateModal}
          />
        )}
      </ManagerWorkspaceShell>

      <ManagerModal
        open={isModalOpen}
        title={draft.id ? "상품 편집" : "새 상품 등록"}
        description="기본 정보, 카테고리 연결, 이미지 자산을 한 번에 관리합니다."
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <ProductBasicsSection
              draft={draft}
              selectedFilesCount={selectedFiles.length}
              onNameChange={(value) => setDraft((prev) => ({ ...prev, name: value }))}
              onDescriptionChange={(value) => setDraft((prev) => ({ ...prev, description: value }))}
            />

            <ProductCategoriesSection
              categories={visibleCategories}
              draftCategories={draft.categories}
              categorySearchValue={categorySearchValue}
              isRefreshingCategories={isRefreshingCategories}
              onCategorySearchChange={setCategorySearchValue}
              onRefreshCategories={() => void handleRefreshCategories()}
              onToggleCategory={toggleCategory}
            />
          </div>

          <ProductImagesSection
            savedImages={draft.images}
            previewImages={previewImages}
            onOpenFilePicker={() => document.getElementById("product-image-upload-input")?.click()}
            onFilesSelected={(files) =>
              setSelectedFiles((prev) => [...prev, ...Array.from(files || [])])
            }
            onRemoveSavedImage={removeSavedImage}
            onRemoveSelectedFile={removeSelectedFile}
          />

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
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
              {isSubmitting ? "저장 중..." : draft.id ? "수정 저장" : "상품 등록"}
            </ManagerPrimaryButton>
          </ManagerActionRow>
        </div>
      </ManagerModal>
    </>
  );
}
