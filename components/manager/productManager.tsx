"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowPathIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { createProduct, deleteProduct, getCategories, getProductsForAdmin, updateProduct } from "@/lib/product";
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
  ManagerTextarea,
  ManagerToolbar,
  ManagerWorkspaceShell,
} from "./managerWorkspace";

type CategoryOption = {
  id: number;
  name: string;
  image?: string | null;
  updatedAt?: string | Date;
  _count?: {
    products?: number;
  };
};

type ProductRecord = {
  id: number;
  name: string | null;
  description?: string | null;
  images: string[];
  updatedAt?: string | Date;
  categories: CategoryOption[];
  _count?: {
    pharmacyProducts?: number;
  };
};

type ProductDraft = {
  id?: number;
  name: string;
  description: string;
  images: string[];
  categories: CategoryOption[];
};

const PRODUCT_SORT_OPTIONS = [
  { label: "최신 수정순", value: "recent" },
  { label: "이름순", value: "name" },
  { label: "카테고리 많은 순", value: "category-count" },
  { label: "약국 연결 많은 순", value: "linked-count" },
] as const;

function toDateValue(value: string | Date | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyDraft(): ProductDraft {
  return {
    name: "",
    description: "",
    images: [],
    categories: [],
  };
}

function ProductCardImage(props: { image?: string | null; alt: string }) {
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
  const [sortValue, setSortValue] = useState<(typeof PRODUCT_SORT_OPTIONS)[number]["value"]>("recent");
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
    const keyword = deferredSearch.trim().toLowerCase();
    const filtered = products.filter((product) => {
      if (!keyword) return true;
      const haystack = [
        product.name || "",
        product.description || "",
        product.categories.map((category) => category.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortValue === "name") {
        return (left.name || "").localeCompare(right.name || "", "ko");
      }
      if (sortValue === "category-count") {
        return right.categories.length - left.categories.length;
      }
      if (sortValue === "linked-count") {
        return (right._count?.pharmacyProducts || 0) - (left._count?.pharmacyProducts || 0);
      }
      return toDateValue(right.updatedAt) - toDateValue(left.updatedAt);
    });
    return sorted;
  }, [deferredSearch, products, sortValue]);

  const visibleCategories = useMemo(() => {
    const keyword = deferredCategorySearch.trim().toLowerCase();
    const filtered = categories.filter((category) =>
      !keyword ? true : category.name.toLowerCase().includes(keyword)
    );
    return filtered.sort((left, right) => left.name.localeCompare(right.name, "ko"));
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
            onSortChange={(value) => setSortValue(value as (typeof PRODUCT_SORT_OPTIONS)[number]["value"])}
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
            <ManagerSection
              title="기본 정보"
              description="검색성과 품질에 직접 영향을 주는 상품 기본 정보를 정리합니다."
            >
              <div className="space-y-4">
                <ManagerField label="상품명">
                  <ManagerInput
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="예: 나우푸드 밀크씨슬"
                  />
                </ManagerField>

                <ManagerField label="상품 설명" hint="간단한 설명이라도 적어두면 검색과 운영 판단이 쉬워집니다.">
                  <ManagerTextarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="대표 효능, 용량 특징, 운영 메모 등을 적어주세요."
                  />
                </ManagerField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ManagerMetaRow label="선택 카테고리" value={`${draft.categories.length}개`} />
                  <ManagerMetaRow label="저장된 이미지" value={`${draft.images.length + selectedFiles.length}장`} />
                </div>
              </div>
            </ManagerSection>

            <ManagerSection
              title="카테고리 연결"
              description="오른쪽에서 검색 후 체크하면 즉시 현재 상품에 연결됩니다."
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ManagerInput
                    value={categorySearchValue}
                    onChange={(event) => setCategorySearchValue(event.target.value)}
                    placeholder="카테고리 검색"
                  />
                  <button
                    type="button"
                    onClick={handleRefreshCategories}
                    className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    aria-label="카테고리 새로고침"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isRefreshingCategories ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {draft.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {draft.categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category)}
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
                  {visibleCategories.map((category) => {
                    const checked = draft.categories.some((item) => item.id === category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category)}
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
                          <p className="text-xs text-slate-500">
                            연결 상품 {category._count?.products || 0}개
                          </p>
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
          </div>

          <ManagerSection
            title="이미지 자산"
            description="기존 이미지를 유지하거나 새 파일을 추가해 대표 썸네일 구성을 빠르게 정리할 수 있습니다."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <ManagerSecondaryButton
                  onClick={() => document.getElementById("product-image-upload-input")?.click()}
                >
                  이미지 추가
                </ManagerSecondaryButton>
                <input
                  id="product-image-upload-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) =>
                    setSelectedFiles((prev) => [...prev, ...Array.from(event.target.files || [])])
                  }
                />
                <p className="text-sm text-slate-500">여러 장을 한 번에 추가할 수 있습니다.</p>
              </div>

              {draft.images.length === 0 && selectedFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  등록된 이미지가 없습니다.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {draft.images.map((image, index) => (
                    <div key={`saved-${image}-${index}`} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                      <div className="relative h-36 bg-slate-50">
                        <Image src={image} alt={`상품 이미지 ${index + 1}`} fill sizes="240px" className="object-contain p-3" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold text-slate-500">저장됨</span>
                        <button
                          type="button"
                          onClick={() => removeSavedImage(index)}
                          className="text-xs font-bold text-rose-500"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}

                  {previewImages.map((preview, index) => (
                    <div key={preview.key} className="overflow-hidden rounded-[24px] border border-sky-200 bg-sky-50/60">
                      <div className="relative h-36">
                        <Image src={preview.url} alt={`새 이미지 ${index + 1}`} fill sizes="240px" className="object-contain p-3" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold text-sky-700">업로드 예정</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
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
