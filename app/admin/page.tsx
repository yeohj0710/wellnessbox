"use client";

import {
  getCategories,
  getProducts,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getPharmacies,
} from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import { useEffect, useState } from "react";

export default function Admin() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      const categories: any[] = await getCategories();
      const products: any[] = await getProducts();
      const pharmacies: any[] = await getPharmacies();
      setCategories(categories);
      setProducts(products);
      setPharmacies(pharmacies);
    };
    fetchData();
  }, []);
  const Skeleton = () => (
    <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm cursor-pointer">
      <div className="h-32 bg-gray-300 animate-pulse"></div>
      <div className="p-2">
        <div className="w-2/3 h-4 bg-gray-300 rounded-md animate-pulse mb-2"></div>
        <div className="w-1/2 h-4 bg-gray-300 rounded-md animate-pulse"></div>
      </div>
    </div>
  );
  return (
    <>
      <div className="mt-8 w-full sm:w-[640px] xl:w-1/2 px-5 py-7 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
        <div className="flex flex-row gap-[2%] justify-between mb-5 sm:mb-6 items-center">
          <h1 className="text-2xl font-bold text-gray-800">카테고리 관리</h1>
          <button
            className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
            onClick={() => {
              setSelectedCategory(null);
              setIsCategoryModalOpen(true);
            }}
          >
            새 카테고리 등록
          </button>
        </div>
        <hr className="border-t border-gray-300 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.length === 0
            ? Array(12)
                .fill(0)
                .map((_, index) => <Skeleton key={index} />)
            : categories.map((category) => (
                <div
                  key={category.idx}
                  className="flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsCategoryModalOpen(true);
                  }}
                >
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name || "Category"}
                      className="h-32 w-full object-contain bg-white"
                    />
                  ) : (
                    <div className="h-28 bg-gray-200 flex items-center justify-center text-gray-500">
                      이미지 없음
                    </div>
                  )}
                  <div className="p-2 flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-gray-800 line-clamp-1">
                      {category.name || ""}
                    </h2>
                  </div>
                </div>
              ))}
        </div>
      </div>
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setIsCategoryModalOpen(false);
            setIsProductModalOpen(false);
          }}
        >
          <div
            className="relative bg-white p-6 rounded shadow-md w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-4 text-gray-600 hover:text-gray-900 text-2xl"
              onClick={() => {
                setIsCategoryModalOpen(false);
                setIsProductModalOpen(false);
              }}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">
              {selectedCategory ? "카테고리 수정" : "새 카테고리 등록"}
            </h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="카테고리 이름"
                value={selectedCategory?.name || ""}
                onChange={(e) => {
                  if (selectedCategory) {
                    setSelectedCategory({
                      ...selectedCategory,
                      name: e.target.value,
                    });
                  } else {
                    setSelectedCategory({ name: e.target.value });
                  }
                }}
                className="border w-full mb-2 p-2"
              />
              <div className="relative group">
                {isUploadingImage ? (
                  <div className="w-full h-40 bg-gray-300 flex items-center justify-center rounded-md">
                    <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin" />
                  </div>
                ) : selectedCategory?.image ? (
                  <img
                    src={selectedCategory.image}
                    alt="카테고리 이미지"
                    className="w-full h-40 object-contain bg-white rounded-md transition-transform duration-200 transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-300 rounded-md"></div>
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-opacity-50 bg-gray-500 rounded-md">
                    <div className="w-6 h-6 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingImage(true);
                    try {
                      const { success, result } = await getUploadUrl();
                      if (!success) {
                        alert("이미지 업로드 URL을 가져오는 데 실패했습니다.");
                        setIsUploadingImage(false);
                        return;
                      }
                      const formData = new FormData();
                      formData.append("file", file);
                      const uploadResponse = await fetch(result.uploadURL, {
                        method: "POST",
                        body: formData,
                      });
                      if (!uploadResponse.ok) {
                        alert("이미지 업로드에 실패했습니다.");
                        setIsUploadingImage(false);
                        return;
                      }
                      const responseData = await uploadResponse.json();
                      const fileUrl = responseData.result.variants.find(
                        (url: string) => url.endsWith("/public")
                      );
                      if (!fileUrl) {
                        alert("이미지 URL을 가져오는 데 실패했습니다.");
                        setIsUploadingImage(false);
                        return;
                      }
                      setSelectedCategory({
                        ...selectedCategory,
                        image: fileUrl,
                      });
                    } catch (error: any) {
                      alert(`이미지 업로드 중 에러가 발생했습니다: ${error}`);
                    } finally {
                      setIsUploadingImage(false);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              {selectedCategory && (
                <button
                  className="px-3 py-1 bg-rose-400 text-white rounded hover:bg-rose-500"
                  onClick={async () => {
                    if (!confirm("정말로 삭제하시겠습니까?")) return;
                    try {
                      await deleteCategory(selectedCategory.idx);
                      const updatedCategories = await getCategories();
                      setCategories(updatedCategories);
                      setIsCategoryModalOpen(false);
                    } catch (error: any) {
                      alert(
                        error.message || "카테고리 삭제 중 오류가 발생했습니다."
                      );
                    }
                  }}
                >
                  삭제
                </button>
              )}
              <button
                className={`px-3 py-1 bg-teal-400 text-white rounded ${
                  isUploadingImage
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-teal-500"
                }`}
                onClick={async () => {
                  if (isUploadingImage) return;
                  if (selectedCategory?.idx) {
                    await updateCategory(
                      selectedCategory.idx,
                      selectedCategory
                    );
                  } else {
                    await createCategory(selectedCategory);
                  }
                  const updatedCategories = await getCategories();
                  setCategories(updatedCategories);
                  setIsCategoryModalOpen(false);
                }}
                disabled={isUploadingImage}
              >
                {selectedCategory?.idx ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-12 w-full sm:w-[640px] xl:w-1/2 px-5 py-7 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
        <div className="flex flex-row gap-[2%] justify-between mb-5 sm:mb-6 items-center">
          <h1 className="text-2xl font-bold text-gray-800">상품 관리</h1>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsProductModalOpen(true);
            }}
            className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
          >
            새 상품 등록
          </button>
        </div>
        <hr className="border-t border-gray-300 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.length === 0
            ? Array(12)
                .fill(0)
                .map((_, index) => <Skeleton key={index} />)
            : products.map((product) => (
                <div
                  key={product.idx}
                  className="flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
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
                  <div className="p-2 flex flex-col gap-1">
                    <span className="text-xs text-gray-500">
                      {product.categories
                        .map((category: any) => category.name)
                        .join(", ")}
                    </span>
                    <h2 className="text-sm font-bold text-gray-800 line-clamp-2">
                      {product.name || ""}
                    </h2>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {product.description || ""}
                    </p>
                    <p className="mt-1 text-sm font-bold text-sky-500">
                      {product.price
                        ? `${product.price.toLocaleString()}원`
                        : "0원"}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </div>
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setIsCategoryModalOpen(false);
            setIsProductModalOpen(false);
          }}
        >
          <div
            className="relative bg-white p-6 rounded shadow-md w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-4 text-gray-600 hover:text-gray-900 text-2xl"
              onClick={() => {
                setIsCategoryModalOpen(false);
                setIsProductModalOpen(false);
              }}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">
              {selectedProduct ? "상품 수정" : "새 상품 등록"}
            </h2>
            <input
              type="text"
              placeholder="상품명"
              value={selectedProduct?.name || ""}
              onChange={(e) =>
                setSelectedProduct({ ...selectedProduct, name: e.target.value })
              }
              className="border w-full mb-2 p-2"
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
              className="border w-full mb-2 p-2"
            />
            <input
              type="number"
              placeholder="가격 (원)"
              value={selectedProduct?.price || ""}
              onChange={(e) =>
                setSelectedProduct({
                  ...selectedProduct,
                  price: parseInt(e.target.value, 10),
                })
              }
              className="border w-full mb-2 p-2"
            />
            <div className="mb-4">
              <h3 className="font-bold text-gray-700 my-2">카테고리 선택</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <label
                    key={category.idx}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedProduct?.categories?.some(
                          (selectedCategory: any) =>
                            selectedCategory.idx === category.idx
                        ) || false
                      }
                      onChange={(e) => {
                        const updatedCategories = e.target.checked
                          ? [
                              ...(selectedProduct?.categories || []),
                              { idx: category.idx, name: category.name },
                            ]
                          : selectedProduct.categories.filter(
                              (selectedCategory: any) =>
                                selectedCategory.idx !== category.idx
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
              <h3 className="font-bold text-gray-700 my-2">약국 선택</h3>
              <div className="flex flex-wrap gap-2">
                {pharmacies.map((pharmacy) => (
                  <label
                    key={pharmacy.idx}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedProduct?.pharmacies?.some(
                          (selectedPharmacy: any) =>
                            selectedPharmacy.idx === pharmacy.idx
                        ) || false
                      }
                      onChange={(e) => {
                        const updatedPharmacies = e.target.checked
                          ? [
                              ...(selectedProduct?.pharmacies || []),
                              { idx: pharmacy.idx, name: pharmacy.name },
                            ]
                          : selectedProduct.pharmacies.filter(
                              (selectedPharmacy: any) =>
                                selectedPharmacy.idx !== pharmacy.idx
                            );
                        setSelectedProduct({
                          ...selectedProduct,
                          pharmacies: updatedPharmacies,
                        });
                      }}
                    />
                    <span>{pharmacy.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
                className="border w-full p-2"
              />
              <button
                className="text-sm cursor-pointer w-20 h-8 px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
                onClick={async () => {
                  if (!selectedFile) return;
                  setIsUploadingImage(true);
                  const { success, result } = await getUploadUrl();
                  if (!success) {
                    alert("이미지 업로드 URL을 가져오는 데 실패했습니다.");
                    setIsUploadingImage(false);
                    return;
                  }
                  const formData = new FormData();
                  formData.append("file", selectedFile);
                  const uploadResponse = await fetch(result.uploadURL, {
                    method: "POST",
                    body: formData,
                  });
                  if (!uploadResponse.ok) {
                    alert("이미지 업로드에 실패했습니다.");
                    setIsUploadingImage(false);
                    return;
                  }
                  const responseData = await uploadResponse.json();
                  const fileUrl = responseData.result.variants.find(
                    (url: string) => url.endsWith("/public")
                  );
                  if (!fileUrl) {
                    alert("이미지 URL을 가져오는 데 실패했습니다.");
                    setIsUploadingImage(false);
                    return;
                  }
                  setSelectedProduct({
                    ...selectedProduct,
                    images: selectedProduct?.images
                      ? [...selectedProduct.images, fileUrl]
                      : [fileUrl],
                  });
                  setIsUploadingImage(false);
                  alert("이미지가 성공적으로 업로드되었습니다.");
                }}
                disabled={!selectedFile || isUploadingImage}
              >
                {isUploadingImage ? "업로드 중..." : "업로드"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProduct?.images?.map((image: any, index: any) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Product Image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <button
                    className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full p-1"
                    onClick={() => {
                      const updatedImages = selectedProduct.images.filter(
                        (_: any, i: any) => i !== index
                      );
                      setSelectedProduct({
                        ...selectedProduct,
                        images: updatedImages,
                      });
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              {selectedProduct && (
                <button
                  className="px-3 py-1 bg-rose-400 text-white rounded hover:bg-rose-500"
                  onClick={async () => {
                    if (!confirm("정말로 삭제하시겠습니까?")) return;
                    try {
                      await deleteProduct(selectedProduct.idx);
                      const updatedProducts = await getProducts();
                      setProducts(updatedProducts);
                      setIsProductModalOpen(false);
                    } catch (error: any) {
                      alert(
                        error.message || "상품 삭제 중 오류가 발생했습니다."
                      );
                    }
                  }}
                >
                  삭제
                </button>
              )}
              <button
                className="px-3 py-1 bg-teal-400 text-white rounded hover:bg-teal-500"
                onClick={async () => {
                  if (selectedProduct?.idx) {
                    await updateProduct(selectedProduct.idx, selectedProduct);
                  } else {
                    await createProduct(selectedProduct);
                  }
                  const updatedProducts = await getProducts();
                  setProducts(updatedProducts);
                  setIsProductModalOpen(false);
                }}
              >
                {selectedProduct?.idx ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
