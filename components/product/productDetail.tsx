"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import FirstModal from "@/components/product/FirstModal";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import { shouldBypassNextImageOptimizer } from "@/lib/shared/image";
import { formatPriceRange } from "@/lib/utils";
import { getCuratedProductDetailFacts } from "@/lib/product/product-detail-facts-catalog";
import {
  normalizeProductDetailFacts,
  type ProductDetailFactRow,
} from "@/lib/product/product-detail-facts";
import {
  getCapacityByOptionType,
  getRelevantPharmacyProducts,
  readCartSnapshotSafe,
  sortOptionTypes,
} from "./productDetail.helpers";
import { useProductDetailDismissGuards } from "./useProductDetailDismissGuards";

type ProductDetailProps = {
  product: {
    id: number;
    name?: string | null;
    images?: string[];
    detailFacts?: unknown;
    pharmacyProducts?: Array<{
      optionType?: string | null;
      capacity?: string | null;
      price?: number | null;
      stock?: number | null;
      pharmacy?: { id?: number } | null;
    }>;
  };
  optionType?: string | null;
  onClose: () => void;
  onAddToCart: (cartItem: {
    productId: number;
    productName: string;
    optionType: string;
    quantity: number;
  }) => void;
  pharmacy?: { id?: number } | null;
  onAddressSaved?: (address: string) => void;
};

const HIGHLIGHT_LABEL_PRIORITY = ["유형", "형태", "일반 상품 기준", "표기 성분"] as const;

function FactRow({ label, value }: ProductDetailFactRow) {
  return (
    <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="text-[12px] font-semibold tracking-[0.04em] text-slate-500">
        {label}
      </div>
      <div className="text-[14px] leading-6 text-slate-900">{value}</div>
    </div>
  );
}

export default function ProductDetail({
  product,
  optionType,
  onClose,
  onAddToCart,
  pharmacy,
  onAddressSaved,
}: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [isFirstModalOpen, setIsFirstModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(
    optionType ?? null
  );
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const selectedImageRef = useRef<string | null>(null);
  const firstModalRef = useRef(false);
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
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

  useEffect(() => {
    const pharmacyProducts = product.pharmacyProducts || [];
    if (pharmacyProducts.length > 0 && !selectedOption) {
      setSelectedOption(pharmacyProducts[0].optionType || null);
    }
  }, [product.pharmacyProducts, selectedOption]);

  const relevantPharmacyProducts = useMemo(
    () => getRelevantPharmacyProducts(product.pharmacyProducts || [], pharmacy),
    [pharmacy, product.pharmacyProducts]
  );

  const sortedOptionTypes = useMemo(() => {
    const uniqueOptionTypes = Array.from(
      new Set(
        relevantPharmacyProducts
          .map((item) => item.optionType)
          .filter((value): value is string => Boolean(value))
      )
    );
    return sortOptionTypes(uniqueOptionTypes);
  }, [relevantPharmacyProducts]);

  const optionRows = useMemo(
    () =>
      sortedOptionTypes.map((option) => {
        const capacity = getCapacityByOptionType(relevantPharmacyProducts, option);
        return {
          label: option,
          value: capacity ? `${capacity}` : "용량 표기 없음",
        };
      }),
    [relevantPharmacyProducts, sortedOptionTypes]
  );

  const selectedOptionCapacity = useMemo(() => {
    if (!selectedOption) return null;
    return getCapacityByOptionType(relevantPharmacyProducts, selectedOption) || null;
  }, [relevantPharmacyProducts, selectedOption]);

  const resolvedDetailFacts = useMemo(() => {
    return (
      normalizeProductDetailFacts(product.detailFacts) ||
      getCuratedProductDetailFacts(product) ||
      null
    );
  }, [product]);

  const summarizedHighlights = useMemo(() => {
    const highlights = resolvedDetailFacts?.highlights || [];

    return HIGHLIGHT_LABEL_PRIORITY.map((label) =>
      highlights.find((item) => item.label === label)
    )
      .filter((item): item is ProductDetailFactRow => item != null)
      .slice(0, 3);
  }, [resolvedDetailFacts?.highlights]);

  const images = product.images || [];

  const detailGroups = useMemo(() => {
    const groups = resolvedDetailFacts?.groups ? [...resolvedDetailFacts.groups] : [];

    if (selectedOption || optionRows.length > 0) {
      groups.unshift({
        title: "판매 정보",
        rows: [
          ...(selectedOption
            ? [
                {
                  label: "선택 옵션",
                  value: selectedOptionCapacity
                    ? `${selectedOption} · ${selectedOptionCapacity}`
                    : selectedOption,
                },
              ]
            : []),
          ...(optionRows.length > 0
            ? [
                {
                  label: "판매 옵션",
                  value: optionRows
                    .map((row) => `${row.label} (${row.value})`)
                    .join(" / "),
                },
              ]
            : []),
        ],
      });
    }

    return groups.filter((group) => group.rows.length > 0);
  }, [optionRows, resolvedDetailFacts?.groups, selectedOption, selectedOptionCapacity]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleOptionChange = (option: string) => {
    setSelectedOption(option);
    setQuantity(1);
  };

  const currentPrice = formatPriceRange({
    product,
    quantity: 1,
    optionType: selectedOption || undefined,
    pharmacy,
  });

  const totalPrice = formatPriceRange({
    product,
    quantity,
    optionType: selectedOption || undefined,
    pharmacy,
  });

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-20 bg-white/98 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-[720px] flex-col overflow-hidden bg-white sm:border-x sm:border-slate-200 sm:shadow-[0_28px_80px_-48px_rgba(15,23,42,0.4)]">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/92 px-5 py-3 backdrop-blur-sm sm:px-6">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-sky-600">
              상품 상세
            </div>
            <div className="truncate text-[15px] font-semibold text-slate-900">
              {product.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <XMarkIcon className="h-5 w-5 text-slate-700" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative">
            {images.length > 0 ? (
              <div className="relative h-[18rem] w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 sm:h-[24rem]">
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
                  </div>
                )}

                {images.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(src)}
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      index === currentIdx ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                    aria-label={`${product.name || "상품"} 이미지 ${index + 1} 보기`}
                  >
                    <Image
                      src={src}
                      alt={`${product.name || "상품"} 이미지 ${index + 1}`}
                      fill
                      sizes="1024px"
                      unoptimized={shouldBypassNextImageOptimizer(src)}
                      className="object-contain"
                      onLoad={() => {
                        if (index === currentIdx) setIsImageLoading(false);
                      }}
                    />
                  </button>
                ))}

                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        setIsImageLoading(true);
                        setCurrentIdx((value) => Math.max(0, value - 1));
                      }}
                      disabled={currentIdx === 0}
                    >
                      <ChevronLeftIcon className="h-5 w-5 text-slate-700" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        setIsImageLoading(true);
                        setCurrentIdx((value) => Math.min(images.length - 1, value + 1));
                      }}
                      disabled={currentIdx === images.length - 1}
                    >
                      <ChevronRightIcon className="h-5 w-5 text-slate-700" />
                    </button>

                    <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setIsImageLoading(true);
                            setCurrentIdx(index);
                          }}
                          className={`h-1.5 rounded-full transition-all ${
                            index === currentIdx ? "w-6 bg-sky-500" : "w-2.5 bg-slate-300"
                          }`}
                          aria-label={`이미지 ${index + 1} 보기`}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center bg-slate-100 text-slate-500">
                이미지 없음
              </div>
            )}
          </div>

          <div className="px-5 pb-10 pt-6 sm:px-6">
            <div className="flex flex-col gap-5">
              <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.4)]">
                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <h1 className="text-[24px] font-bold leading-tight text-slate-950 sm:text-[30px]">
                      {product.name}
                    </h1>
                    <p className="text-[13px] leading-6 text-slate-500">
                      옵션, 표기 성분, 복용 기준만 빠르게 확인할 수 있게 정리했어요.
                    </p>
                  </div>

                  {summarizedHighlights.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {summarizedHighlights.map((item) => (
                        <div
                          key={`${item.label}-${item.value}`}
                          className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3"
                        >
                          <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                            {item.label}
                          </div>
                          <div className="mt-1 text-[14px] font-semibold leading-5 text-slate-900">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-slate-500">
                          옵션 선택
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sortedOptionTypes.map((option) => {
                            const capacity = getCapacityByOptionType(
                              relevantPharmacyProducts,
                              option
                            );
                            const isActive = selectedOption === option;

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleOptionChange(option)}
                                className={`rounded-full px-3.5 py-2 text-[13px] font-medium ring-1 transition ${
                                  isActive
                                    ? "bg-sky-50 text-sky-700 ring-sky-400"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {option}
                                {capacity ? ` · ${capacity}` : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="text-[12px] font-semibold tracking-[0.08em] text-slate-500">
                            가격
                          </div>
                          <p className="mt-1 bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-[30px] font-extrabold text-transparent">
                            {currentPrice}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 sm:justify-start">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(-1)}
                            className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-slate-200 transition hover:bg-slate-100"
                          >
                            <MinusIcon className="h-4 w-4 text-slate-700" />
                          </button>
                          <span className="min-w-[2ch] text-center text-[20px] font-bold text-slate-950">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(1)}
                            className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-slate-200 transition hover:bg-slate-100"
                          >
                            <PlusIcon className="h-4 w-4 text-slate-700" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="space-y-4">
                {detailGroups.map((group) => (
                  <section
                    key={group.title}
                    className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.4)]"
                  >
                    <h2 className="text-[16px] font-semibold text-slate-950">
                      {group.title}
                    </h2>
                    <div className="mt-4">
                      {group.rows.map((row) => (
                        <FactRow
                          key={`${group.title}-${row.label}-${row.value}`}
                          label={row.label}
                          value={row.value}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                <section className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="space-y-1 text-[13px] leading-6 text-slate-600">
                    <p>주소 입력 후 가까운 약국이 선택되면 정확한 상품 가격을 안내해드려요.</p>
                    <p>상품 주문 후 배송 완료까지 최대 4~5 영업일이 소요돼요.</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white/96 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-sm sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[12px] font-semibold tracking-[0.08em] text-slate-500">
                총 결제 예상 금액
              </div>
              <div className="mt-1 text-[26px] font-extrabold text-sky-600">
                {totalPrice}
              </div>
            </div>
            <button
              type="button"
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

                onAddToCart({
                  productId: product.id,
                  productName: product.name || "",
                  optionType: selectedOption,
                  quantity,
                });
                onClose();
              }}
              className="w-full rounded-full bg-sky-500 px-8 py-3 text-[16px] font-semibold text-white shadow-sm transition hover:bg-sky-600 sm:w-auto"
            >
              담기
            </button>
          </div>
        </div>

        {selectedImage ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 sm:px-0"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative h-full w-full max-w-[720px]"
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
                type="button"
                className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white shadow"
                onClick={() => setSelectedImage(null)}
              >
                <XMarkIcon className="h-5 w-5 text-slate-700" />
              </button>
              <div className="absolute inset-0">
                <Image
                  src={selectedImage}
                  alt={`${product.name || "상품"} 확대 이미지`}
                  fill
                  sizes="1024px"
                  unoptimized={shouldBypassNextImageOptimizer(selectedImage)}
                  className="rounded-lg object-contain"
                />
              </div>
            </div>
          </div>
        ) : null}

        {isFirstModalOpen ? (
          <FirstModal
            product={product}
            selectedOption={selectedOption}
            quantity={quantity}
            onAddToCart={onAddToCart}
            onClose={() => setIsFirstModalOpen(false)}
            onProductDetailClose={onClose}
            onAddressSaved={onAddressSaved}
          />
        ) : null}
      </div>
    </div>
  );
}
