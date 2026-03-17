"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import {
  createEmptyDraft,
  getVisibleCategories,
  type CategoryDraft,
  type CategoryRecord,
  type CategorySortValue,
} from "./categoryManager.types";

export function useCategoryManager() {
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

  const refreshCategories = useCallback(async () => {
    setCategories((await getCategories()) as CategoryRecord[]);
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshCategories();
      setIsLoading(false);
    })();
  }, [refreshCategories]);

  const visibleCategories = useMemo(
    () =>
      getVisibleCategories({
        categories,
        keyword: deferredSearch,
        sortValue,
      }),
    [categories, deferredSearch, sortValue]
  );

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetModalState = useCallback(() => {
    setDraft(createEmptyDraft());
    setSelectedFile(null);
    setFormError("");
  }, []);

  const openCreateModal = useCallback(() => {
    resetModalState();
    setIsModalOpen(true);
  }, [resetModalState]);

  const openEditModal = useCallback((category: CategoryRecord) => {
    setDraft({
      id: category.id,
      name: category.name,
      image: category.image || null,
    });
    setSelectedFile(null);
    setFormError("");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  }, [isSubmitting]);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) return null;

    setIsUploadingImage(true);
    try {
      const { success, result } = await getUploadUrl();
      if (!success) {
        throw new Error("이미지 업로드 URL을 가져오지 못했습니다.");
      }

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
      const fileUrl = responseData.result.variants.find((url: string) =>
        url.endsWith("/public")
      );

      if (!fileUrl) {
        throw new Error("업로드한 이미지 URL을 찾지 못했습니다.");
      }

      return fileUrl;
    } finally {
      setIsUploadingImage(false);
    }
  }, [selectedFile]);

  const handleSubmit = useCallback(async () => {
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
      resetModalState();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "카테고리 저장에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, handleFileUpload, refreshCategories, resetModalState]);

  const handleDelete = useCallback(async () => {
    if (!draft.id) return;
    if (!window.confirm("정말로 이 카테고리를 삭제할까요?")) return;

    const result = await deleteCategory(draft.id);
    if (!result) {
      setFormError(
        "상품과 연결된 카테고리는 먼저 상품 쪽에서 해제해야 삭제할 수 있습니다."
      );
      return;
    }

    await refreshCategories();
    setIsModalOpen(false);
    resetModalState();
  }, [draft.id, refreshCategories, resetModalState]);

  const imageReadyCount = useMemo(
    () => categories.filter((category) => Boolean(category.image)).length,
    [categories]
  );

  const linkedProductsCount = useMemo(
    () => categories.find((item) => item.id === draft.id)?._count?.products || 0,
    [categories, draft.id]
  );

  const handleDraftNameChange = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, name: value }));
  }, []);

  const clearImage = useCallback(() => {
    setSelectedFile(null);
    setDraft((prev) => ({ ...prev, image: null }));
  }, []);

  return {
    categories,
    draft,
    selectedFile,
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
  };
}
