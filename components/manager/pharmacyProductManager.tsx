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
import { usePharmacyProductManager } from "./usePharmacyProductManager";
import {
  PHARMACY_PRODUCT_SORT_OPTIONS,
  type PharmacyProductSortValue,
} from "./pharmacyProductManager.types";
import {
  PharmacyProductCardImage,
  PharmacyProductInventorySection,
  PharmacyProductSelectionSection,
} from "./pharmacyProductManager.sections";

export default function PharmacyProductManager({
  pharmacyId,
}: {
  pharmacyId?: number;
}) {
  const {
    pharmacyProducts,
    pharmacies,
    draft,
    isModalOpen,
    isLoading,
    isSubmitting,
    isRefreshingProducts,
    searchValue,
    sortValue,
    pharmacyFilter,
    productSearchValue,
    formError,
    visibleProducts,
    selectableProducts,
    lowStockCount,
    soldOutCount,
    selectedProduct,
    selectedPharmacy,
    setSearchValue,
    setSortValue,
    setPharmacyFilter,
    setProductSearchValue,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleRefreshProducts,
    handlePharmacyChange,
    handleOptionTypeChange,
    handleCapacityChange,
    handlePriceChange,
    handleStockChange,
    handleProductChange,
  } = usePharmacyProductManager(pharmacyId);

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
            ? "선택한 약국의 판매 옵션, 가격, 재고를 빠르게 정리합니다. 품절과 저재고 상태도 한 화면에서 바로 확인하고 수정할 수 있습니다."
            : "모든 약국의 운영 상품 상태를 한 번에 관리합니다. 검색, 정렬, 약국 필터로 필요한 항목만 빠르게 추려볼 수 있습니다."
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
                      event.target.value === "all"
                        ? "all"
                        : Number.parseInt(event.target.value, 10)
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
                description={`${item.optionType || "옵션 없음"}${
                  item.capacity ? ` · ${item.capacity}` : ""
                }`}
                badges={
                  <>
                    <ManagerBadge tone="accent">
                      {item.pharmacy?.name || "약국 미지정"}
                    </ManagerBadge>
                    <ManagerBadge tone={(item.stock || 0) <= 0 ? "warn" : "default"}>
                      재고 {item.stock || 0}
                    </ManagerBadge>
                  </>
                }
                meta={
                  <>
                    <ManagerMetaRow
                      label="판매가"
                      value={`${(item.price || 0).toLocaleString()}원`}
                    />
                    <ManagerMetaRow
                      label="카테고리"
                      value={
                        item.product?.categories?.length
                          ? item.product.categories
                              .slice(0, 2)
                              .map((category) => category.name)
                              .join(", ")
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
        description="약국, 상품, 옵션, 가격, 재고를 한 화면에서 수정해 운영 정보를 맞춥니다."
        onClose={closeModal}
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
            <PharmacyProductInventorySection
              pharmacyId={pharmacyId}
              pharmacies={pharmacies}
              draft={draft}
              selectedPharmacyName={selectedPharmacy?.name || "미선택"}
              selectedProductName={selectedProduct?.name || "미선택"}
              onPharmacyChange={handlePharmacyChange}
              onOptionTypeChange={handleOptionTypeChange}
              onCapacityChange={handleCapacityChange}
              onPriceChange={handlePriceChange}
              onStockChange={handleStockChange}
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
              onProductChange={handleProductChange}
            />
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
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
            <ManagerPrimaryButton onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting
                ? <InlineSpinnerLabel label="저장 중" />
                : draft.id
                  ? "수정 저장"
                  : "운영 상품 등록"}
            </ManagerPrimaryButton>
          </ManagerActionRow>
        </div>
      </ManagerModal>
    </>
  );
}
