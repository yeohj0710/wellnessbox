"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowPathIcon, PhotoIcon } from "@heroicons/react/24/outline";
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
  ManagerField,
  ManagerInput,
  ManagerMetaRow,
  ManagerModal,
  ManagerPrimaryButton,
  ManagerResultsHeader,
  ManagerSecondaryButton,
  ManagerSection,
  ManagerSelect,
  ManagerToolbar,
  ManagerWorkspaceShell,
} from "./managerWorkspace";

type PharmacySummary = {
  id: number;
  name: string;
};

type ProductSummary = {
  id: number;
  name: string;
};

type PharmacyProductRecord = {
  id: number;
  optionType: string | null;
  capacity: string | null;
  price: number | null;
  stock: number | null;
  updatedAt?: string | Date;
  pharmacy: PharmacySummary | null;
  product: {
    id: number;
    name: string;
    images: string[];
    categories: Array<{ name: string }>;
  } | null;
};

type PharmacyProductDraft = {
  id?: number;
  pharmacyId: number | null;
  productId: number | null;
  optionType: string;
  capacity: string;
  price: number | "";
  stock: number | "";
};

const PHARMACY_PRODUCT_SORT_OPTIONS = [
  { label: "최신 수정순", value: "recent" },
  { label: "상품명순", value: "name" },
  { label: "가격 높은 순", value: "price-high" },
  { label: "재고 낮은 순", value: "stock-low" },
  { label: "약국명순", value: "pharmacy" },
] as const;

function toDateValue(value: string | Date | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyDraft(pharmacyId?: number | null): PharmacyProductDraft {
  return {
    pharmacyId: pharmacyId ?? null,
    productId: null,
    optionType: "일반 상품",
    capacity: "",
    price: "",
    stock: "",
  };
}

function PharmacyProductCardImage(props: { image?: string | null; alt: string }) {
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
  const [sortValue, setSortValue] = useState<(typeof PHARMACY_PRODUCT_SORT_OPTIONS)[number]["value"]>("recent");
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
    const keyword = deferredSearch.trim().toLowerCase();
    const filtered = pharmacyProducts.filter((item) => {
      if (pharmacyFilter !== "all" && item.pharmacy?.id !== pharmacyFilter) {
        return false;
      }
      if (!keyword) return true;

      const haystack = [
        item.product?.name || "",
        item.pharmacy?.name || "",
        item.optionType || "",
        item.capacity || "",
        item.product?.categories.map((category) => category.name).join(" ") || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortValue === "name") {
        return (left.product?.name || "").localeCompare(right.product?.name || "", "ko");
      }
      if (sortValue === "price-high") {
        return (right.price || 0) - (left.price || 0);
      }
      if (sortValue === "stock-low") {
        return (left.stock ?? Number.MAX_SAFE_INTEGER) - (right.stock ?? Number.MAX_SAFE_INTEGER);
      }
      if (sortValue === "pharmacy") {
        return (left.pharmacy?.name || "").localeCompare(right.pharmacy?.name || "", "ko");
      }
      return toDateValue(right.updatedAt) - toDateValue(left.updatedAt);
    });
    return sorted;
  }, [deferredSearch, pharmacyFilter, pharmacyProducts, sortValue]);

  const selectableProducts = useMemo(() => {
    const keyword = deferredProductSearch.trim().toLowerCase();
    const filtered = products.filter((product) =>
      !keyword ? true : product.name.toLowerCase().includes(keyword)
    );
    return filtered.sort((left, right) => left.name.localeCompare(right.name, "ko"));
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
      setFormError("약국을 선택해주세요.");
      return;
    }
    if (!draft.productId) {
      setFormError("상품을 선택해주세요.");
      return;
    }
    if (draft.price === "" || Number(draft.price) < 0) {
      setFormError("가격을 확인해주세요.");
      return;
    }
    if (draft.stock === "" || Number(draft.stock) < 0) {
      setFormError("재고를 확인해주세요.");
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
            ? "선택된 약국의 판매 옵션, 가격, 재고를 빠르게 정리합니다. 품절과 저재고 상태를 바로 확인하고 수정할 수 있습니다."
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
            onSortChange={(value) =>
              setSortValue(value as (typeof PHARMACY_PRODUCT_SORT_OPTIONS)[number]["value"])
            }
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
          description="카드에서 바로 가격, 옵션, 재고 상태를 파악하고 편집 패널로 이어집니다."
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
            description="검색 조건을 조정하거나 새 운영 상품을 추가해보세요."
            actionLabel="운영 상품 추가"
            onAction={openCreateModal}
          />
        )}
      </ManagerWorkspaceShell>

      <ManagerModal
        open={isModalOpen}
        title={draft.id ? "약국 상품 편집" : "약국 상품 추가"}
        description="약국, 상품, 옵션, 가격, 재고를 한 패널에서 수정해 운영 속도를 높였습니다."
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
            <ManagerSection title="운영 설정" description="판매 옵션과 재고·가격 정보를 직접 관리합니다.">
              <div className="space-y-4">
                {!pharmacyId ? (
                  <ManagerField label="약국 선택">
                    <ManagerSelect
                      value={draft.pharmacyId || ""}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          pharmacyId: Number.parseInt(event.target.value, 10) || null,
                        }))
                      }
                    >
                      <option value="">약국을 선택하세요</option>
                      {pharmacies.map((pharmacy) => (
                        <option key={pharmacy.id} value={pharmacy.id}>
                          {pharmacy.name}
                        </option>
                      ))}
                    </ManagerSelect>
                  </ManagerField>
                ) : null}

                <ManagerField label="옵션 타입">
                  <ManagerSelect
                    value={draft.optionType}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, optionType: event.target.value }))
                    }
                  >
                    <option value="7일 패키지">7일 패키지</option>
                    <option value="30일 패키지">30일 패키지</option>
                    <option value="일반 상품">일반 상품</option>
                  </ManagerSelect>
                </ManagerField>

                <ManagerField label="용량 / 구성">
                  <ManagerInput
                    value={draft.capacity}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, capacity: event.target.value }))
                    }
                    placeholder="예: 30정, 2g x 14포"
                  />
                </ManagerField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ManagerField label="판매가">
                    <ManagerInput
                      type="number"
                      inputMode="numeric"
                      value={draft.price}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          price: event.target.value === "" ? "" : Number.parseInt(event.target.value, 10),
                        }))
                      }
                      placeholder="가격"
                    />
                  </ManagerField>
                  <ManagerField label="재고">
                    <ManagerInput
                      type="number"
                      inputMode="numeric"
                      value={draft.stock}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          stock: event.target.value === "" ? "" : Number.parseInt(event.target.value, 10),
                        }))
                      }
                      placeholder="재고"
                    />
                  </ManagerField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ManagerMetaRow label="선택 약국" value={selectedPharmacy?.name || "미선택"} />
                  <ManagerMetaRow label="선택 상품" value={selectedProduct?.name || "미선택"} />
                </div>
              </div>
            </ManagerSection>

            <ManagerSection title="상품 선택" description="상단 검색으로 후보를 빠르게 좁힌 뒤 드롭다운에서 바로 선택합니다.">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ManagerInput
                    value={productSearchValue}
                    onChange={(event) => setProductSearchValue(event.target.value)}
                    placeholder="상품명 검색"
                  />
                  <button
                    type="button"
                    onClick={handleRefreshProducts}
                    className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    aria-label="상품 목록 새로고침"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isRefreshingProducts ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <ManagerSelect
                  value={draft.productId || ""}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      productId: Number.parseInt(event.target.value, 10) || null,
                    }))
                  }
                >
                  <option value="">상품을 선택하세요</option>
                  {selectableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </ManagerSelect>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-bold text-slate-900">선택 상태 요약</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ManagerMetaRow label="상품" value={selectedProduct?.name || "아직 선택되지 않음"} />
                    <ManagerMetaRow label="약국" value={selectedPharmacy?.name || "아직 선택되지 않음"} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    상품 검색창은 드롭다운 위에 고정되어 있어, 긴 상품 목록에서도 원하는 항목을 훨씬 빠르게 찾을 수 있습니다.
                  </p>
                </div>
              </div>
            </ManagerSection>
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
