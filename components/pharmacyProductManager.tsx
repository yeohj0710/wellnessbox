"use client";

import React, { useState, useEffect } from "react";
import { getPharmacies, getProducts } from "@/lib/product";
import {
  getPharmacyProducts,
  createPharmacyProduct,
  updatePharmacyProduct,
  deletePharmacyProduct,
} from "@/lib/pharmacyProduct";
import { getUploadUrl } from "@/lib/upload";
import FullPageLoader from "./fullPageLoader";

export default function PharmacyProductManager() {
  const [pharmacyProducts, setPharmacyProducts] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedPharmacyProduct, setSelectedPharmacyProduct] =
    useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      const pharmacyProducts = await getPharmacyProducts();
      const pharmacies = await getPharmacies();
      const products = await getProducts();
      setPharmacyProducts(pharmacyProducts);
      setPharmacies(pharmacies);
      setProducts(products);
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
      ...(selectedPharmacyProduct?.images || []),
      ...(await handleImageUpload()),
    ];
    const data = {
      ...selectedPharmacyProduct,
      images: imageUrls,
    };
    if (selectedPharmacyProduct?.id) {
      await updatePharmacyProduct(selectedPharmacyProduct.id, data);
    } else {
      await createPharmacyProduct(data);
    }
    setPharmacyProducts(await getPharmacyProducts());
    setSelectedPharmacyProduct(null);
    setSelectedFiles([]);
    setIsModalOpen(false);
  };
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-end items-center">
        <button
          className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
          onClick={() => {
            setSelectedPharmacyProduct({
              optionType: "",
              price: 0,
              stock: 0,
              pharmacyId: null,
              productId: null,
              images: [],
            });
            setIsModalOpen(true);
          }}
        >
          새 약국 상품 등록
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {pharmacyProducts.map((pharmacyProduct, index) => (
          <div
            key={`${pharmacyProduct.id}-${index}`}
            className="px-[0.5px] sm:px-1 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
            onClick={() => {
              setSelectedPharmacyProduct(pharmacyProduct);
              setIsModalOpen(true);
            }}
          >
            {pharmacyProduct.product?.images?.[0] ? (
              <img
                src={pharmacyProduct.product.images[0]}
                alt={pharmacyProduct.product.name || "Pharmacy Product"}
                className="h-32 w-full object-contain bg-white"
              />
            ) : (
              <div className="h-28 bg-gray-200 flex items-center justify-center text-gray-500">
                이미지 없음
              </div>
            )}
            <div className="p-2 flex flex-col gap-1 flex-grow">
              <p className="text-xs text-gray-500">
                {pharmacyProduct.pharmacy?.name || "약국 없음"}
              </p>
              <p className="text-sm font-bold text-gray-800">
                {pharmacyProduct.product?.name || "상품 없음"}
              </p>
              <p className="text-sm font-bold text-sky-500">
                ₩{pharmacyProduct.price.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500">
                {pharmacyProduct.optionType || "옵션 없음"}
              </p>

              <p className="text-xs text-gray-500">
                재고 {pharmacyProduct.stock || 0}개 남음
              </p>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-white p-6 rounded shadow-md w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-4 text-gray-600 hover:text-gray-900 text-2xl"
              onClick={() => setIsModalOpen(false)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4">
              {selectedPharmacyProduct?.id
                ? "약국 상품 수정"
                : "새 약국 상품 등록"}
            </h3>
            <div className="mb-4">
              <h3 className="font-bold text-gray-700 my-2">약국 선택</h3>
              <select
                className="border w-full p-2"
                value={selectedPharmacyProduct?.pharmacyId || ""}
                onChange={(e: any) =>
                  setSelectedPharmacyProduct({
                    ...selectedPharmacyProduct,
                    pharmacyId: parseInt(e.target.value, 10) || null,
                  })
                }
              >
                <option value="">선택하세요</option>
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-gray-700 my-2">상품 선택</h3>
              <select
                className="border w-full p-2"
                value={selectedPharmacyProduct?.productId || ""}
                onChange={(e) =>
                  setSelectedPharmacyProduct({
                    ...selectedPharmacyProduct,
                    productId: parseInt(e.target.value, 10) || null,
                  })
                }
              >
                <option value="">선택하세요</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="옵션 종류"
              value={selectedPharmacyProduct?.optionType || ""}
              onChange={(e) =>
                setSelectedPharmacyProduct({
                  ...selectedPharmacyProduct,
                  optionType: e.target.value,
                })
              }
              className="border w-full p-2 mb-4"
            />

            <input
              type="number"
              placeholder="가격"
              value={selectedPharmacyProduct?.price || ""}
              onChange={(e) =>
                setSelectedPharmacyProduct({
                  ...selectedPharmacyProduct,
                  price: parseInt(e.target.value, 10),
                })
              }
              className="border w-full p-2 mb-4"
            />

            <input
              type="number"
              placeholder="재고"
              value={selectedPharmacyProduct?.stock || ""}
              onChange={(e) =>
                setSelectedPharmacyProduct({
                  ...selectedPharmacyProduct,
                  stock: parseInt(e.target.value, 10),
                })
              }
              className="border w-full p-2 mb-4"
            />

            <div className="flex justify-end gap-2">
              {selectedPharmacyProduct?.id && (
                <button
                  className="px-3 py-1 bg-rose-400 text-white rounded hover:bg-rose-500"
                  onClick={async () => {
                    if (confirm("정말로 삭제하시겠습니까?")) {
                      await deletePharmacyProduct(selectedPharmacyProduct.id);
                      setPharmacyProducts(await getPharmacyProducts());
                      setIsModalOpen(false);
                    }
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
                {selectedPharmacyProduct?.id ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
