"use client";

import StarRating from "@/components/common/starRating";
import { formatPriceRange, getLowestAverageOptionType } from "@/lib/utils";
import Skeleton from "./skeleton";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  images: string[];
  categories: { name: string }[];
  pharmacyProducts: any[];
  rating: number;
  reviewCount: number;
}

interface ProductGridProps {
  isLoading: boolean;
  products: Product[];
  selectedPackage: string;
  selectedPharmacy: any;
  setSelectedProduct: (product: Product | null) => void;
}

export default function ProductGrid({
  isLoading,
  products,
  selectedPackage,
  selectedPharmacy,
  setSelectedProduct,
}: ProductGridProps) {
  const showSkeleton = isLoading && products.length === 0;

  return (
    <section className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
      {showSkeleton
        ? Array(12)
            .fill(0)
            .map((_, index) => <Skeleton key={index} />)
        : products.map((product, index) => {
            const optionType =
              selectedPackage === "전체"
                ? getLowestAverageOptionType({
                    product,
                    pharmacy: selectedPharmacy,
                  })
                : selectedPackage;
            const capacity = product.pharmacyProducts.find(
              (p: any) => p.optionType === optionType
            )?.capacity;

            return (
              <button
                key={`${product.id}-${index}`}
                type="button"
                onClick={() => setSelectedProduct(product)}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-[0_6px_20px_rgba(67,103,230,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(67,103,230,0.18)] focus:outline-none focus:ring-2 focus:ring-[#6C4DFF]/50"
              >
                {product.images?.[0] ? (
                  <div className="relative w-full aspect-[4/3] bg-gray-50">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="512px"
                      priority={index === 0}
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    이미지 없음
                  </div>
                )}

                <div className="px-3 py-2 flex flex-1 flex-col">
                  <span className="text-[12px] sm:text-[13px] text-gray-600 leading-5 line-clamp-1 text-center">
                    {product.categories.map((c) => c.name).join(", ")}
                  </span>

                  <span className="mt-0.5 text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.4rem] text-center">
                    {product.name}
                  </span>

                  <div className="mt-1 flex justify-center items-center gap-2 text-center">
                    {capacity ? (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[12px] text-gray-700">
                        {capacity}
                      </span>
                    ) : null}
                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                    <span className="text-[12px] sm:text-[13px] text-sky-700">
                      {optionType} 기준
                    </span>
                  </div>

                  <div className="mt-1 text-center">
                    <span className="text-lg font-extrabold bg-gradient-to-r from-[#3B82F6] to-[#6C4DFF] bg-clip-text text-transparent">
                      {formatPriceRange({
                        product,
                        optionType,
                        pharmacy: selectedPharmacy,
                      })}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-center items-center gap-1">
                    <StarRating rating={product.rating} size={18} />
                    <span className="text-[12px] text-gray-500 mt-0.5">
                      ({product.reviewCount})
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
    </section>
  );
}
