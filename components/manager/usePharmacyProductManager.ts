"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
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
  createEmptyDraft,
  getSelectableProducts,
  getVisiblePharmacyProducts,
  type PharmacyProductDraft,
  type PharmacyProductRecord,
  type PharmacyProductSortValue,
  type PharmacySummary,
  type ProductSummary,
} from "./pharmacyProductManager.types";

export function usePharmacyProductManager(pharmacyId?: number) {
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

  const refreshData = useCallback(async () => {
    const [fetchedPharmacyProducts, fetchedPharmacies, fetchedProducts] = await Promise.all([
      pharmacyId ? getPharmacyProductsByPharmacy(pharmacyId) : getPharmacyProducts(),
      getPharmaciesIdName(),
      getProductsIdName(),
    ]);

    setPharmacyProducts(fetchedPharmacyProducts as PharmacyProductRecord[]);
    setPharmacies(fetchedPharmacies as PharmacySummary[]);
    setProducts(fetchedProducts as ProductSummary[]);
  }, [pharmacyId]);

  useEffect(() => {
    void (async () => {
      await refreshData();
      setIsLoading(false);
    })();
  }, [refreshData]);

  const visibleProducts = useMemo(
    () =>
      getVisiblePharmacyProducts({
        pharmacyProducts,
        keyword: deferredSearch,
        sortValue,
        pharmacyFilter,
      }),
    [deferredSearch, pharmacyFilter, pharmacyProducts, sortValue]
  );

  const selectableProducts = useMemo(
    () =>
      getSelectableProducts({
        products,
        keyword: deferredProductSearch,
      }),
    [deferredProductSearch, products]
  );

  const lowStockCount = useMemo(
    () =>
      pharmacyProducts.filter((item) => (item.stock || 0) > 0 && (item.stock || 0) <= 5).length,
    [pharmacyProducts]
  );

  const soldOutCount = useMemo(
    () => pharmacyProducts.filter((item) => (item.stock || 0) <= 0).length,
    [pharmacyProducts]
  );

  const resetModalState = useCallback(() => {
    setDraft(createEmptyDraft(pharmacyId));
    setProductSearchValue("");
    setFormError("");
  }, [pharmacyId]);

  const openCreateModal = useCallback(() => {
    resetModalState();
    setIsModalOpen(true);
  }, [resetModalState]);

  const openEditModal = useCallback((item: PharmacyProductRecord) => {
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
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  }, [isSubmitting]);

  const handleSubmit = useCallback(async () => {
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
      resetModalState();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "약국 상품 저장에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, refreshData, resetModalState]);

  const handleDelete = useCallback(async () => {
    if (!draft.id) return;
    if (!window.confirm("정말로 이 약국 상품을 삭제할까요?")) return;

    await deletePharmacyProduct(draft.id);
    await refreshData();
    setIsModalOpen(false);
    resetModalState();
  }, [draft.id, refreshData, resetModalState]);

  const handleRefreshProducts = useCallback(async () => {
    setIsRefreshingProducts(true);
    try {
      setProducts((await getProductsIdName()) as ProductSummary[]);
    } finally {
      setIsRefreshingProducts(false);
    }
  }, []);

  const selectedProduct = products.find((product) => product.id === draft.productId) || null;
  const selectedPharmacy = pharmacies.find((pharmacy) => pharmacy.id === draft.pharmacyId) || null;

  const handlePharmacyChange = useCallback((value: string) => {
    setDraft((prev) => ({
      ...prev,
      pharmacyId: Number.parseInt(value, 10) || null,
    }));
  }, []);

  const handleOptionTypeChange = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, optionType: value }));
  }, []);

  const handleCapacityChange = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, capacity: value }));
  }, []);

  const handlePriceChange = useCallback((value: string) => {
    setDraft((prev) => ({
      ...prev,
      price: value === "" ? "" : Number.parseInt(value, 10),
    }));
  }, []);

  const handleStockChange = useCallback((value: string) => {
    setDraft((prev) => ({
      ...prev,
      stock: value === "" ? "" : Number.parseInt(value, 10),
    }));
  }, []);

  const handleProductChange = useCallback((value: string) => {
    setDraft((prev) => ({
      ...prev,
      productId: Number.parseInt(value, 10) || null,
    }));
  }, []);

  return {
    pharmacyProducts,
    pharmacies,
    products,
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
  };
}
