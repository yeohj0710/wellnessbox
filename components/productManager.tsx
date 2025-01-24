import React, { useState, useEffect } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import { getCategories } from "@/lib/category";

export default function ProductManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      const products = await getProducts();
      const categories = await getCategories();
      setProducts(products);
      setCategories(categories);
      setIsLoading(false);
    };
    fetchData();
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
  const handleSubmit = async () => {
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
    setProducts(await getProducts());
    setSelectedProduct(null);
    setSelectedFiles([]);
    setIsProductModalOpen(false);
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
            <button
              className="absolute top-2 right-4 text-gray-600 hover:text-gray-900 text-2xl"
              onClick={() => setIsProductModalOpen(false)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4">
              {selectedProduct?.id ? "상품 수정" : "새 상품 등록"}
            </h3>
            <input
              type="text"
              placeholder="상품명"
              value={selectedProduct?.name || ""}
              onChange={(e) =>
                setSelectedProduct({ ...selectedProduct, name: e.target.value })
              }
              className="border w-full p-2 mb-4"
            />
            <textarea
              placeholder="상품 설명"
              value={selectedProduct?.description || ""}
              onChange={(e) =>
                setSelectedProduct({
                  ...selectedProduct,
                  description: e.target.value,
                })
              }
              className="border w-full p-2 mb-4"
            />
            <div className="mb-4">
              <h3 className="font-bold text-gray-700 my-2">카테고리 선택</h3>
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
            </div>
            <div className="mb-4">
              <h3 className="font-bold text-gray-700 my-2">이미지 업로드</h3>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setSelectedFiles(Array.from(e.target.files || []))
                }
                className="border w-full p-2"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedProduct?.images?.map(
                  (image: string, index: number) => (
                    <div key={index} className="relative">
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
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {selectedProduct?.id && (
                <button
                  className="px-3 py-1 bg-rose-400 text-white rounded hover:bg-rose-500"
                  onClick={async () => {
                    if (!confirm("정말로 삭제하시겠습니까?")) return;
                    const result = await deleteProduct(selectedProduct.id);
                    if (!result) {
                      alert(
                        "해당 상품에 포함된 약국 상품을 먼저 삭제해야 합니다."
                      );
                      return;
                    }
                    setProducts(await getProducts());
                    setIsProductModalOpen(false);
                  }}
                >
                  삭제
                </button>
              )}
              <button
                className={`px-3 py-1 bg-teal-400 text-white rounded ${
                  isUploadingImage ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={handleSubmit}
                disabled={isUploadingImage}
              >
                {selectedProduct?.id ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
