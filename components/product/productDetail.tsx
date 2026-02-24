"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { formatPriceRange } from "@/lib/utils";
import FirstModal from "@/components/product/FirstModal";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { shouldBypassNextImageOptimizer } from "@/lib/shared/image";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import {
  getCapacityByOptionType,
  getRelevantPharmacyProducts,
  readCartSnapshotSafe,
  sortOptionTypes,
} from "./productDetail.helpers";
import { useProductDetailDismissGuards } from "./useProductDetailDismissGuards";

export default function ProductDetail({
  product,
  optionType,
  onClose,
  onAddToCart,
  pharmacy,
  onAddressSaved,
}: any) {
  const [quantity, setQuantity] = useState(1);
  const [isFirstModalOpen, setIsFirstModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<any>(optionType);
  const selectedImageRef = useRef<string | null>(null);
  const firstModalRef = useRef(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const imagePreviewDrag = useDraggableModal(Boolean(selectedImage), {
    resetOnOpen: true,
  });

  useProductDetailDismissGuards({
    onClose,
    imageCount: product.images?.length || 1,
    selectedImageRef,
    setSelectedImage,
    firstModalRef,
    setIsFirstModalOpen,
    setCurrentIdx,
  });

  useEffect(() => {
    selectedImageRef.current = selectedImage;
  }, [selectedImage]);

  useEffect(() => {
    firstModalRef.current = isFirstModalOpen;
  }, [isFirstModalOpen]);

  useEffect(() => {
    if (product.pharmacyProducts.length > 0 && !selectedOption) {
      setSelectedOption(product.pharmacyProducts[0].optionType);
    }
  }, [product.pharmacyProducts, selectedOption]);

  const relevantPharmacyProducts = useMemo(
    () => getRelevantPharmacyProducts(product.pharmacyProducts, pharmacy),
    [pharmacy, product.pharmacyProducts]
  );

  const sortedOptionTypes = useMemo(() => {
    const uniqueOptionTypes = Array.from(
      new Set(
        relevantPharmacyProducts
          .map((item) => item.optionType)
          .filter((optionType): optionType is string => !!optionType)
      )
    );
    return sortOptionTypes(uniqueOptionTypes);
  }, [relevantPharmacyProducts]);

  const getCapacityOf = (optionType: string) =>
    getCapacityByOptionType(relevantPharmacyProducts, optionType);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleOptionChange = (option: string) => {
    setSelectedOption(option);
    setQuantity(1);
  };

  const images = product.images || [];

  return (
    <div className="z-20 fixed inset-0 bg-white flex justify-center items-center">
      <div
        className="overflow-y-auto max-h-screen fixed inset-x-0 bg-white w-full max-w-[640px] mx-auto"
        style={{
          top: "calc(env(safe-area-inset-top) + 4.25rem)",
          maxHeight: "calc(100dvh - env(safe-area-inset-top) - 4.25rem)",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="relative">
          {images.length > 0 ? (
            <div className="relative w-full h-72 sm:h-80 overflow-hidden">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {images.map((src: string, i: number) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    i === currentIdx
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${product.name} 이미지 ${i + 1}`}
                    fill
                    sizes="1024px"
                    unoptimized={shouldBypassNextImageOptimizer(src)}
                    className="object-contain bg-white"
                    onLoad={() =>
                      i === 0 && setIsImageLoading(false)
                    }
                  />
                </div>
              ))}

              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-white/90 shadow ring-1 ring-gray-200 hover:bg-gray-100 cursor-pointer"
                onClick={() => setCurrentIdx((v) => Math.max(0, v - 1))}
                disabled={currentIdx === 0}
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-white/90 shadow ring-1 ring-gray-200 hover:bg-gray-100 cursor-pointer"
                onClick={() =>
                  setCurrentIdx((v) => Math.min(images.length - 1, v + 1))
                }
                disabled={currentIdx === images.length - 1}
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-700" />
              </button>

              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                {images.map((_: string, i: number) => (
                  <span
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === currentIdx ? "w-5 bg-sky-500" : "w-2.5 bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-60 bg-gray-200 flex items-center justify-center text-gray-500">
              이미지 없음
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 grid place-items-center h-10 w-10 rounded-full bg-white/95 hover:bg-gray-100 shadow ring-1 ring-gray-200"
          >
            <XMarkIcon className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="p-5 pb-36">
          <h1 className="text-[18px] sm:text-xl font-bold leading-snug">
            {product.name}
          </h1>

          <div className="mt-4">
            <div className="text-gray-600 text-sm font-medium mb-2">
              옵션 선택
            </div>
            <div className="flex flex-wrap gap-2">
              {sortedOptionTypes.map((ot) => {
                const cap = getCapacityOf(ot);
                const isActive = selectedOption === ot;
                return (
                  <button
                    key={ot}
                    onClick={() => handleOptionChange(ot)}
                    className={`px-3 py-1.5 rounded-full text-sm ring-1 transition ${
                      isActive
                        ? "bg-sky-50 ring-sky-400 text-sky-700"
                        : "bg-white ring-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {ot}
                    {cap ? ` · ${cap}` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-2xl font-extrabold bg-gradient-to-r from-[#3B82F6] to-[#6C4DFF] bg-clip-text text-transparent">
              {formatPriceRange({
                product,
                quantity: 1,
                optionType: selectedOption || undefined,
                pharmacy,
              })}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="grid place-items-center h-9 w-9 rounded-full bg-gray-100 ring-1 ring-gray-200 hover:bg-gray-200"
              >
                <MinusIcon className="w-4 h-4 text-gray-700" />
              </button>
              <span className="min-w-[2ch] text-xl font-bold text-gray-900 text-center">
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="grid place-items-center h-9 w-9 rounded-full bg-gray-100 ring-1 ring-gray-200 hover:bg-gray-200"
              >
                <PlusIcon className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <span className="block text-xs text-gray-500">
              주소 입력 후 약국이 선택되면 정확한 상품 가격을 알려드려요.
            </span>
            <span className="block text-xs text-gray-500">
              상품 주문 후 배송 완료까지 최대 4-5 영업일이 소요돼요.
            </span>
          </div>

          <div className="px-5 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
            <span>
              {formatPriceRange({
                product,
                quantity,
                optionType: selectedOption || undefined,
                pharmacy,
              })}
            </span>
            <button
              onClick={async () => {
                if (!selectedOption) return;

                const snapshot = readCartSnapshotSafe();
                if (
                  snapshot.length === 0 &&
                  !localStorage.getItem("roadAddress")
                ) {
                  setIsFirstModalOpen(true);
                  return;
                }

                const cartItem = {
                  productId: product.id,
                  productName: product.name,
                  optionType: selectedOption,
                  quantity,
                };

                onAddToCart(cartItem);
                onClose();
              }}
              className="bg-white text-sky-400 px-10 py-2 rounded-full shadow-md hover:bg-sky-100 transition"
            >
              담기
            </button>
          </div>

          {selectedImage && (
            <div
              className="px-2 sm:px-0 fixed inset-0 flex items-center justify-center bg-black/70 z-50"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="relative w-full h-full max-w-[640px]"
                ref={imagePreviewDrag.panelRef}
                style={imagePreviewDrag.panelStyle}
              >
                <div
                  onPointerDown={imagePreviewDrag.handleDragPointerDown}
                  className={`absolute left-0 right-12 top-0 z-20 h-12 touch-none ${
                    imagePreviewDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  aria-hidden
                />
                <button
                  className="absolute top-3 right-3 grid place-items-center h-9 w-9 rounded-full bg-white shadow"
                  onClick={() => setSelectedImage(null)}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-700" />
                </button>
                <div className="absolute inset-0">
                  <Image
                    src={selectedImage}
                    alt="리뷰 확대 이미지"
                    fill
                    sizes="1024px"
                    unoptimized={shouldBypassNextImageOptimizer(selectedImage)}
                    className="rounded-lg object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {isFirstModalOpen && (
            <FirstModal
              product={product}
              selectedOption={selectedOption}
              quantity={quantity}
              onAddToCart={onAddToCart}
              onClose={() => setIsFirstModalOpen(false)}
              onProductDetailClose={onClose}
              onAddressSaved={onAddressSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
}
