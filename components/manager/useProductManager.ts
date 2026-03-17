"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProductsForAdmin,
  updateProduct,
} from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import {
  createEmptyDraft,
  getVisibleCategories,
  getVisibleProducts,
  type CategoryOption,
  type ProductDraft,
  type ProductRecord,
  type ProductSortValue,
} from "./productManager.types";

async function uploadProductImages(selectedFiles: File[]) {
  const uploadedUrls: string[] = [];

  for (const file of selectedFiles) {
    const { success, result } = await getUploadUrl();
    if (!success) {
      throw new Error("이미지 업로드 URL을 준비하지 못했습니다.");
    }

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
    const fileUrl = responseData.result.variants.find((url: string) =>
      url.endsWith("/public")
    );
    if (!fileUrl) {
      throw new Error("업로드한 이미지 URL을 확인하지 못했습니다.");
    }

    uploadedUrls.push(fileUrl);
  }

  return uploadedUrls;
}

export function useProductManager() {
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

  const refreshData = useCallback(async () => {
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      getProductsForAdmin(),
      getCategories(),
    ]);
    setProducts(fetchedProducts as ProductRecord[]);
    setCategories(fetchedCategories as CategoryOption[]);
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshData();
      setIsLoading(false);
    })();
  }, [refreshData]);

  const visibleProducts = useMemo(
    () =>
      getVisibleProducts({
        products,
        keyword: deferredSearch,
        sortValue,
      }),
    [deferredSearch, products, sortValue]
  );

  const visibleCategories = useMemo(
    () =>
      getVisibleCategories({
        categories,
        keyword: deferredCategorySearch,
      }),
    [categories, deferredCategorySearch]
  );

  const totalLinkedCount = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + (product._count?.pharmacyProducts || 0),
        0
      ),
    [products]
  );

  const previewImages = useMemo(
    () =>
      selectedFiles.map((file) => ({
        key: `${file.name}-${file.size}`,
        url: URL.createObjectURL(file),
      })),
    [selectedFiles]
  );

  useEffect(() => {
    return () => {
      previewImages.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewImages]);

  const resetModalState = useCallback(() => {
    setDraft(createEmptyDraft());
    setSelectedFiles([]);
    setCategorySearchValue("");
    setFormError("");
  }, []);

  const openCreateModal = useCallback(() => {
    resetModalState();
    setIsModalOpen(true);
  }, [resetModalState]);

  const openEditModal = useCallback((product: ProductRecord) => {
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
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  }, [isSubmitting]);

  const handleSubmit = useCallback(async () => {
    const normalizedName = draft.name.trim();
    if (!normalizedName) {
      setFormError("상품명은 비워둘 수 없습니다.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      setIsUploadingImage(true);
      const uploadedImages =
        selectedFiles.length > 0 ? await uploadProductImages(selectedFiles) : [];
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
      resetModalState();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "상품 저장에 실패했습니다."
      );
    } finally {
      setIsUploadingImage(false);
      setIsSubmitting(false);
    }
  }, [draft, refreshData, resetModalState, selectedFiles]);

  const handleDelete = useCallback(async () => {
    if (!draft.id) return;
    if (!window.confirm("정말로 이 상품을 삭제할까요?")) return;

    const result = await deleteProduct(draft.id);
    if (!result) {
      setFormError(
        "연결된 상품이 있어 먼저 약국 상품에서 정리해야 삭제할 수 있습니다."
      );
      return;
    }

    await refreshData();
    setIsModalOpen(false);
    resetModalState();
  }, [draft.id, refreshData, resetModalState]);

  const handleRefreshCategories = useCallback(async () => {
    setIsRefreshingCategories(true);
    try {
      setCategories((await getCategories()) as CategoryOption[]);
    } finally {
      setIsRefreshingCategories(false);
    }
  }, []);

  const toggleCategory = useCallback((category: CategoryOption) => {
    setDraft((prev) => {
      const exists = prev.categories.some((item) => item.id === category.id);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((item) => item.id !== category.id)
          : [...prev.categories, category],
      };
    });
  }, []);

  const removeSavedImage = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  }, []);

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  }, []);

  const handleDraftNameChange = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, name: value }));
  }, []);

  const handleDraftDescriptionChange = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, description: value }));
  }, []);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(files || [])]);
  }, []);

  return {
    products,
    draft,
    selectedFiles,
    isModalOpen,
    isLoading,
    isSubmitting,
    isUploadingImage,
    isRefreshingCategories,
    searchValue,
    sortValue,
    categorySearchValue,
    formError,
    visibleProducts,
    visibleCategories,
    totalLinkedCount,
    previewImages,
    setSearchValue,
    setSortValue,
    setCategorySearchValue,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleRefreshCategories,
    toggleCategory,
    removeSavedImage,
    removeSelectedFile,
    handleDraftNameChange,
    handleDraftDescriptionChange,
    handleFilesSelected,
    refreshData,
  };
}
