"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createPharmacyProduct,
  deletePharmacyProduct,
  getPharmacyProducts,
  getPharmacyProductsByPharmacy,
  getProductsIdName,
  updatePharmacyProduct,
} from "@/lib/product";
import { getPharmaciesIdName } from "@/lib/pharmacy";
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
  getSelectableProducts,
  getVisiblePharmacyProducts,
  PHARMACY_PRODUCT_SORT_OPTIONS,
  type PharmacyProductDraft,
  type PharmacyProductRecord,
  type PharmacyProductSortValue,
  type PharmacySummary,
  type ProductSummary,
} from "./pharmacyProductManager.types";
import {
  PharmacyProductCardImage,
  PharmacyProductInventorySection,
  PharmacyProductSelectionSection,
} from "./pharmacyProductManager.sections";

export default function PharmacyProductManager({ pharmacyId }: { pharmacyId?: number }) {
  const [pharmacyProducts, setPharmacyProducts] = useState<PharmacyProductRecord[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacySummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [draft, setDraft] = useState<PharmacyProductDraft>(createEmptyDraft(pharmacyId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState<PharmacyProductSortValue>("recent");
  const [pharmacyFilter, setPharmacyFilter] = useState<number | "all">(pharmacyId ?? "all");
  const [productSearchValue, setProductSearchValue] = useState("");
  const [formError, setFormError] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
  const deferredProductSearch = useDeferredValue(productSearchValue);

  async function refreshData() {
    const [fetchedPharmacyProducts, fetchedPharmacies, fetchedProducts] = await Promise.all([
      pharmacyId ? getPharmacyProductsByPharmacy(pharmacyId) : getPharmacyProducts(),
      getPharmaciesIdName(),
      getProductsIdName(),
    ]);

    setPharmacyProducts(fetchedPharmacyProducts as PharmacyProductRecord[]);
    setPharmacies(fetchedPharmacies as PharmacySummary[]);
    setProducts(fetchedProducts as ProductSummary[]);
  }

  useEffect(() => {
    void (async () => {
      await refreshData();
      setIsLoading(false);
    })();
  }, [pharmacyId]);

  const visibleProducts = useMemo(() => {
    return getVisiblePharmacyProducts({
      pharmacyProducts,
      keyword: deferredSearch,
      sortValue,
      pharmacyFilter,
    });
  }, [deferredSearch, pharmacyFilter, pharmacyProducts, sortValue]);

  const selectableProducts = useMemo(() => {
    return getSelectableProducts({
      products,
      keyword: deferredProductSearch,
    });
  }, [deferredProductSearch, products]);

  const lowStockCount = useMemo(
    () => pharmacyProducts.filter((item) => (item.stock || 0) > 0 && (item.stock || 0) <= 5).length,
    [pharmacyProducts]
  );
  const soldOutCount = useMemo(
    () => pharmacyProducts.filter((item) => (item.stock || 0) <= 0).length,
    [pharmacyProducts]
  );

  function openCreateModal() {
    setDraft(createEmptyDraft(pharmacyId));
    setProductSearchValue("");
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(item: PharmacyProductRecord) {
    setDraft({
      id: item.id,
      pharmacyId: item.pharmacy?.id || null,
      productId: item.product?.id || null,
      optionType: item.optionType || "일반 상품",
      capacity: item.capacity || "",
      price: item.price ?? "",
      stock: item.stock ?? "",
    });
    setProductSearchValue(item.product?.name || "");
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit() {
    if (!draft.pharmacyId) {
      setFormError("약국을 선택해 주세요.");
      return;
    }
    if (!draft.productId) {
      setFormError("상품을 선택해 주세요.");
      return;
    }
    if (draft.price === "" || Number(draft.price) < 0) {
      setFormError("가격을 확인해 주세요.");
      return;
    }
    if (draft.stock === "" || Number(draft.stock) < 0) {
      setFormError("재고를 확인해 주세요.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const payload = {
        pharmacyId: draft.pharmacyId,
        productId: draft.productId,
        optionType: draft.optionType.trim() || "일반 상품",
        capacity: draft.capacity.trim(),
        price: Number(draft.price),
        stock: Number(draft.stock),
      };

      if (draft.id) {
        await updatePharmacyProduct(draft.id, payload);
      } else {
        await createPharmacyProduct(payload);
      }

      await refreshData();
      setIsModalOpen(false);
      setDraft(createEmptyDraft(pharmacyId));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "약국 상품 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!draft.id) return;
    if (!window.confirm("정말로 이 약국 상품을 삭제할까요?")) return;

    await deletePharmacyProduct(draft.id);
    await refreshData();
    setIsModalOpen(false);
    setDraft(createEmptyDraft(pharmacyId));
  }

  async function handleRefreshProducts() {
    setIsRefreshingProducts(true);
    try {
      setProducts((await getProductsIdName()) as ProductSummary[]);
    } finally {
      setIsRefreshingProducts(false);
    }
  }

  const selectedProduct = products.find((product) => product.id === draft.productId) || null;
  const selectedPharmacy = pharmacies.find((pharmacy) => pharmacy.id === draft.pharmacyId) || null;

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
        eyebrow="Pharmacy Inventory"
        title={pharmacyId ? "약국 전용 상품 운영" : "약국 상품 운영"}
        description={
          pharmacyId
            ? "선택한 약국의 판매 옵션, 가격, 재고를 빠르게 정리합니다. 품절과 저재고 상태를 바로 확인하고 수정할 수 있습니다."
            : "모든 약국의 상품 운영 상태를 통합 관리합니다. 검색과 정렬, 약국 필터로 필요한 항목만 빠르게 추려낼 수 있습니다."
        }
        stats={[
          { label: "전체 운영 상품", value: `${pharmacyProducts.length}개`, tone: "accent" },
          { label: "품절", value: `${soldOutCount}개`, tone: "warn" },
          { label: "저재고", value: `${lowStockCount}개` },
        ]}
        toolbar={
          <ManagerToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="상품명, 카테고리, 약국명, 옵션으로 검색"
            sortValue={sortValue}
            onSortChange={(value) => setSortValue(value as PharmacyProductSortValue)}
            sortOptions={[...PHARMACY_PRODUCT_SORT_OPTIONS]}
            actionLabel="운영 상품 추가"
            onAction={openCreateModal}
            auxiliaryAction={
              pharmacyId ? null : (
                <select
                  value={pharmacyFilter}
                  onChange={(event) =>
                    setPharmacyFilter(
                      event.target.value === "all" ? "all" : Number.parseInt(event.target.value, 10)
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none"
                >
                  <option value="all">전체 약국</option>
                  {pharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </option>
                  ))}
                </select>
              )
            }
          />
        }
      >
        <ManagerResultsHeader
          title="운영 상품 보드"
          description="카드에서 바로 가격, 옵션, 재고 상태를 파악하고 편집 모달로 이어집니다."
          count={visibleProducts.length}
        />

        {visibleProducts.length > 0 ? (
          <ManagerCardGrid>
            {visibleProducts.map((item) => (
              <ManagerCard
                key={item.id}
                image={
                  <PharmacyProductCardImage
                    image={item.product?.images?.[0]}
                    alt={item.product?.name || "약국 상품"}
                  />
                }
                title={item.product?.name || "상품 미지정"}
                description={`${item.optionType || "옵션 없음"}${item.capacity ? ` · ${item.capacity}` : ""}`}
                badges={
                  <>
                    <ManagerBadge tone="accent">{item.pharmacy?.name || "약국 미지정"}</ManagerBadge>
                    <ManagerBadge tone={(item.stock || 0) <= 0 ? "warn" : "default"}>
                      재고 {item.stock || 0}
                    </ManagerBadge>
                  </>
                }
                meta={
                  <>
                    <ManagerMetaRow label="판매가" value={`${(item.price || 0).toLocaleString()}원`} />
                    <ManagerMetaRow
                      label="카테고리"
                      value={
                        item.product?.categories?.length
                          ? item.product.categories.slice(0, 2).map((category) => category.name).join(", ")
                          : "미지정"
                      }
                    />
                    <ManagerMetaRow
                      label="최근 수정"
                      value={new Date(item.updatedAt || Date.now()).toLocaleDateString("ko-KR")}
                    />
                  </>
                }
                footer={<div className="text-sm font-bold text-sky-700">재고 · 가격 편집</div>}
                onClick={() => openEditModal(item)}
              />
            ))}
          </ManagerCardGrid>
        ) : (
          <ManagerEmptyState
            title="조건에 맞는 운영 상품이 없습니다"
            description="검색 조건을 조정하거나 새 운영 상품을 추가해 보세요."
            actionLabel="운영 상품 추가"
            onAction={openCreateModal}
          />
        )}
      </ManagerWorkspaceShell>

      <ManagerModal
        open={isModalOpen}
        title={draft.id ? "약국 상품 편집" : "약국 상품 추가"}
        description="약국, 상품, 옵션, 가격, 재고를 한 화면에서 수정해 운영 밀도를 높입니다."
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
            <PharmacyProductInventorySection
              pharmacyId={pharmacyId}
              pharmacies={pharmacies}
              draft={draft}
              selectedPharmacyName={selectedPharmacy?.name || "미선택"}
              selectedProductName={selectedProduct?.name || "미선택"}
              onPharmacyChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  pharmacyId: Number.parseInt(value, 10) || null,
                }))
              }
              onOptionTypeChange={(value) => setDraft((prev) => ({ ...prev, optionType: value }))}
              onCapacityChange={(value) => setDraft((prev) => ({ ...prev, capacity: value }))}
              onPriceChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  price: value === "" ? "" : Number.parseInt(value, 10),
                }))
              }
              onStockChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  stock: value === "" ? "" : Number.parseInt(value, 10),
                }))
              }
            />

            <PharmacyProductSelectionSection
              productSearchValue={productSearchValue}
              isRefreshingProducts={isRefreshingProducts}
              selectableProducts={selectableProducts}
              selectedProductName={selectedProduct?.name || "아직 선택하지 않음"}
              selectedPharmacyName={selectedPharmacy?.name || "아직 선택하지 않음"}
              selectedProductId={draft.productId}
              onProductSearchChange={setProductSearchValue}
              onRefreshProducts={() => void handleRefreshProducts()}
              onProductChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  productId: Number.parseInt(value, 10) || null,
                }))
              }
            />
          </div>

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
            <ManagerPrimaryButton onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : draft.id ? "수정 저장" : "운영 상품 등록"}
            </ManagerPrimaryButton>
          </ManagerActionRow>
        </div>
      </ManagerModal>
    </>
  );
}
