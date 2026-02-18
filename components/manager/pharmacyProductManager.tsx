"use client";

import React, { useState, useEffect } from "react";
import { getProductsIdName } from "@/lib/product";
import {
  getPharmacyProducts,
  createPharmacyProduct,
  updatePharmacyProduct,
  deletePharmacyProduct,
  getPharmacyProductsByPharmacy,
} from "@/lib/product";
import { getUploadUrl } from "@/lib/upload";
import { getPharmaciesIdName } from "@/lib/pharmacy";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useDraggableModal } from "@/components/common/useDraggableModal";

export default function PharmacyProductManager({ pharmacyId }: any) {
  const [pharmacyProducts, setPharmacyProducts] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedPharmacyProduct, setSelectedPharmacyProduct] =
    useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(isModalOpen, { resetOnOpen: true });
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      let pharmacyProducts;
      if (pharmacyId) {
        pharmacyProducts = await getPharmacyProductsByPharmacy(pharmacyId);
      } else {
        pharmacyProducts = await getPharmacyProducts();
      }
      const pharmacies = await getPharmaciesIdName();
      const products = await getProductsIdName();
      setPharmacyProducts(pharmacyProducts);
      setPharmacies(pharmacies);
      setProducts(products);
      setIsLoading(false);
    };
    fetchData();
  }, [pharmacyId]);
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
    setIsSubmitting(true);
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
    setPharmacyProducts(
      pharmacyId
        ? await getPharmacyProductsByPharmacy(pharmacyId)
        : await getPharmacyProducts()
    );
    setSelectedPharmacyProduct(null);
    setSelectedFiles([]);
    setIsSubmitting(false);
    setIsModalOpen(false);
  };
  const handleRefreshProducts = async () => {
    setIsRefreshingProducts(true);
    const refreshedProducts = await getProductsIdName();
    setProducts(refreshedProducts);
    setIsRefreshingProducts(false);
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
              optionType: "일반 상품",
              price: 0,
              stock: 0,
              pharmacyId: pharmacyId || null,
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
              setSelectedPharmacyProduct({
                ...pharmacyProduct,
                pharmacyId: pharmacyProduct.pharmacy?.id || null,
                productId: pharmacyProduct.product?.id || null,
                capacity: pharmacyProduct.capacity || "",
              });
              setIsModalOpen(true);
            }}
          >
            {pharmacyProduct.product?.images?.[0] ? (
              <div className="relative h-32 w-full bg-white">
                <Image
                  src={pharmacyProduct.product.images[0]}
                  alt={pharmacyProduct.product.name || "Pharmacy Product"}
                  fill
                  sizes="512px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-28 bg-gray-200 flex items-center justify-center text-gray-500">
                이미지 없음
              </div>
            )}
            <div className="p-2 flex flex-col gap-1 flex-grow">
              <span className="text-xs text-gray-500">
                {pharmacyProduct.pharmacy?.name}
              </span>
              <span className="text-sm font-bold text-gray-800">
                {pharmacyProduct.product?.name} ({pharmacyProduct.optionType})
              </span>
              <span className="text-xs text-gray-500">
                {pharmacyProduct.capacity}
              </span>
              <span className="text-sm font-bold text-sky-500">
                {pharmacyProduct.price.toLocaleString() || 0}원
              </span>
              <span className="text-xs text-gray-500">
                재고 {pharmacyProduct.stock || 0}개 남음
              </span>
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
            ref={panelRef}
            style={panelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerDown={handleDragPointerDown}
              className={`absolute left-0 right-12 top-0 h-10 touch-none ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              aria-hidden
            />
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
            {!pharmacyId && (
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
            )}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-700">상품 선택</h3>
              <button
                onClick={handleRefreshProducts}
                className="text-sm flex items-center gap-1 text-sky-400 hover:underline"
              >
                새로고침
                <ArrowPathIcon
                  className={`w-5 h-5 ${
                    isRefreshingProducts ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
            <select
              className="border w-full p-2 mb-2"
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
            <h3 className="font-bold text-gray-700 my-2">소분 분량 선택</h3>
            <select
              className="border w-full p-2 mb-2"
              value={selectedPharmacyProduct?.optionType ?? "일반 상품"}
              onChange={(e) =>
                setSelectedPharmacyProduct({
                  ...selectedPharmacyProduct,
                  optionType: e.target.value,
                })
              }
            >
              <option value="7일 패키지">7일 패키지</option>
              <option value="30일 패키지">30일 패키지</option>
              <option value="일반 상품">일반 상품</option>
            </select>
            <h3 className="font-bold text-gray-700 my-2">용량 및 수량</h3>
            <input
              type="text"
              placeholder="예: 2g, 80포"
              value={selectedPharmacyProduct?.capacity || ""}
              onChange={(e) =>
                setSelectedPharmacyProduct({
                  ...selectedPharmacyProduct,
                  capacity: e.target.value,
                })
              }
              className="border w-full p-2 mb-2"
            />
            <h3 className="font-bold text-gray-700 my-2">가격 (원)</h3>
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
              className="border w-full p-2 mb-2"
            />
            <h3 className="font-bold text-gray-700 my-2">재고 수량 (개)</h3>
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
                    if (confirm("정말로 삭제할까요?")) {
                      await deletePharmacyProduct(selectedPharmacyProduct.id);
                      setPharmacyProducts(
                        pharmacyId
                          ? await getPharmacyProductsByPharmacy(pharmacyId)
                          : await getPharmacyProducts()
                      );
                      setIsModalOpen(false);
                    }
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
                ) : selectedPharmacyProduct?.id ? (
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
