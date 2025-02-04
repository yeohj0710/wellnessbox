import React, { useState, useEffect } from "react";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsForAdmin,
} from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import { getCategories } from "@/lib/category";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function ProductManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRefreshingCategories, setIsRefreshingCategories] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      const fetchedProducts = await getProductsForAdmin();
      const fetchedCategories = await getCategories();
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
      setIsLoading(false);
    };
    fetchData();
  }, []);
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProductModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);
  const handleImageUpload = async () => {
    if (selectedFiles.length === 0) return [];
    const uploadedUrls: string[] = [];
    setIsUploadingImage(true);
    for (const file of selectedFiles) {
      const { success, result } = await getUploadUrl();
      if (success) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(result.uploadURL, {
          method: "POST",
          body: formData,
        });
        const responseData = await response.json();
        const fileUrl = responseData.result.variants.find((url: string) =>
          url.endsWith("/public")
        );
        uploadedUrls.push(fileUrl);
      }
    }
    setIsUploadingImage(false);
    return uploadedUrls;
  };
  const handleRefreshCategories = async () => {
    setIsRefreshingCategories(true);
    const refreshedCategories = await getCategories();
    setCategories(refreshedCategories);
    setIsRefreshingCategories(false);
  };
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const imageUrls = [
      ...(selectedProduct?.images || []),
      ...(await handleImageUpload()),
    ];
    if (selectedProduct?.id) {
      await updateProduct(selectedProduct.id, {
        ...selectedProduct,
        images: imageUrls,
      });
    } else {
      await createProduct({
        ...selectedProduct,
        images: imageUrls,
      });
    }
    setProducts(await getProductsForAdmin());
    setSelectedProduct(null);
    setSelectedFiles([]);
    setIsProductModalOpen(false);
    setIsSubmitting(false);
  };
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className="">
      <div className="flex justify-end items-center">
        <button
          className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
          onClick={() => {
            setSelectedProduct({
              name: "",
              description: "",
              price: 0,
              images: [],
              categories: [],
            });
            setIsProductModalOpen(true);
          }}
        >
          새 상품 등록
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {products.map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            className="px-[0.5px] sm:px-1 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
            onClick={() => {
              setSelectedFiles([]);
              setSelectedProduct(product);
              setIsProductModalOpen(true);
            }}
          >
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name || "Product"}
                className="h-32 w-full object-contain bg-white"
              />
            ) : (
              <div className="h-28 bg-gray-200 flex items-center justify-center text-gray-500">
                이미지 없음
              </div>
            )}
            <div className="p-2 flex flex-col gap-1 flex-grow">
              <p className="text-xs text-gray-500 line-clamp-1">
                {product.categories
                  .map((category: any) => category.name)
                  .join(", ") || ""}
              </p>
              <h3 className="text-sm font-bold text-gray-800 line-clamp-2">
                {product.name || ""}
              </h3>
            </div>
          </div>
        ))}
      </div>
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setIsProductModalOpen(false)}
        >
          <div
            className="relative bg-white p-6 rounded shadow-md w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-6">
              {selectedProduct?.id ? "상품 수정" : "새 상품 등록"}
            </h3>
            <button
              className="absolute top-2 right-4 text-gray-600 hover:text-gray-900 text-2xl"
              onClick={() => setIsProductModalOpen(false)}
            >
              ×
            </button>
            <h3 className="font-bold text-gray-700 my-2">상품명</h3>
            <input
              type="text"
              placeholder="상품명"
              value={selectedProduct?.name || ""}
              onChange={(e) =>
                setSelectedProduct({ ...selectedProduct, name: e.target.value })
              }
              className="border w-full p-2 mb-2"
            />
            <h3 className="font-bold text-gray-700 my-2">상품 설명</h3>
            <textarea
              placeholder="상품 설명"
              value={selectedProduct?.description || ""}
              onChange={(e) =>
                setSelectedProduct({
                  ...selectedProduct,
                  description: e.target.value,
                })
              }
              className="border w-full p-2 mb-1"
            />
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-700 my-2">카테고리 선택</h3>
              <button
                onClick={handleRefreshCategories}
                className="text-sm flex items-center gap-1 text-sky-400 hover:underline"
              >
                새로고침
                <ArrowPathIcon
                  className={`w-5 h-5 ${
                    isRefreshingCategories ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedProduct?.categories?.some(
                      (c: any) => c.id === category.id
                    )}
                    onChange={(e) => {
                      const updatedCategories = e.target.checked
                        ? [...(selectedProduct.categories || []), category]
                        : selectedProduct.categories.filter(
                            (c: any) => c.id !== category.id
                          );
                      setSelectedProduct({
                        ...selectedProduct,
                        categories: updatedCategories,
                      });
                    }}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
            <div className="mb-4 mt-4">
              <h3 className="font-bold text-gray-700 my-2">상품 이미지</h3>
              <div className="flex items-center mt-1">
                <button
                  onClick={() =>
                    document.getElementById("productImageUpload")?.click()
                  }
                  className="text-sm px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
                >
                  이미지 추가하기
                </button>
                <input
                  type="file"
                  id="productImageUpload"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setSelectedFiles((prev) => [
                      ...prev,
                      ...Array.from(e.target.files || []),
                    ])
                  }
                  className="hidden"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedProduct?.images?.map(
                  (image: string, index: number) => (
                    <div key={`saved-${index}`} className="relative">
                      <img
                        src={image}
                        alt={`이미지 ${index + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <button
                        className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full p-1"
                        onClick={() => {
                          const updatedImages = selectedProduct.images.filter(
                            (_: string, i: number) => i !== index
                          );
                          setSelectedProduct({
                            ...selectedProduct,
                            images: updatedImages,
                          });
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
                {selectedFiles.map((file, index) => (
                  <div key={`new-${index}`} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`새 이미지 ${index + 1}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <button
                      className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full p-1"
                      onClick={() => {
                        setSelectedFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {selectedProduct?.id && (
                <button
                  className="px-3 py-1 bg-rose-400 text-white rounded hover:bg-rose-500"
                  onClick={async () => {
                    if (!confirm("정말로 삭제할까요?")) return;
                    const result = await deleteProduct(selectedProduct.id);
                    if (!result) {
                      alert(
                        "해당 상품에 포함된 약국 상품을 먼저 삭제해야 합니다."
                      );
                      return;
                    }
                    setProducts(await getProductsForAdmin());
                    setIsProductModalOpen(false);
                  }}
                >
                  삭제
                </button>
              )}
              <button
                className={`w-14 h-8 bg-sky-400 hover:bg-sky-500 text-white rounded flex items-center justify-center ${
                  isUploadingImage || isSubmitting
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={handleSubmit}
                disabled={isUploadingImage || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : selectedProduct?.id ? (
                  "수정"
                ) : (
                  "등록"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
