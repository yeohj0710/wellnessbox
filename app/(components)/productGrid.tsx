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
  return (
    <section className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
      {isLoading
        ? Array(12)
            .fill(0)
            .map((_, index) => <Skeleton key={index} />)
        : products.map((product, index) => (
            <div
              key={`${product.id}-${index}`}
              className="px-0 sm:px-0 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
              onClick={() => setSelectedProduct(product)}
            >
              {product.images[0] ? (
                <div className="relative h-36 w-full bg-gray-100">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="512px"
                    priority={index === 0}
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="h-36 bg-gray-200 flex items-center justify-center text-gray-500">
                  이미지 없음
                </div>
              )}
              <div className="mt-1 px-2 sm:px-2.5 py-2 flex flex-col gap-3 flex-grow">
                <div className="flex flex-col gap-1 flex-grow">
                  <span className="text-xs text-gray-500">
                    {product.categories
                      .map((category) => category.name)
                      .join(", ")}
                  </span>
                  <span className="text-sm font-bold text-gray-800 line-clamp-2">
                    {product.name}
                  </span>
                  {(() => {
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
                    return capacity ? (
                      <span className="text-xs text-gray-500">{capacity}</span>
                    ) : null;
                  })()}
                </div>
                <div className="flex flex-col gap-0.5 mt-auto">
                  {(() => {
                    const optionType =
                      selectedPackage === "전체"
                        ? getLowestAverageOptionType({
                            product,
                            pharmacy: selectedPharmacy,
                          })
                        : selectedPackage;
                    return (
                      <span className="text-xs text-sky-500">
                        {optionType} 기준
                      </span>
                    );
                  })()}
                  <span className="backdrop:file:text-sm font-bold text-sky-500">
                    {formatPriceRange({
                      product,
                      optionType: selectedPackage,
                      pharmacy: selectedPharmacy,
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <StarRating rating={product.rating} size={18} />
                    <span className="text-xs text-gray-500 mt-1">
                      ({product.reviewCount})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
    </section>
  );
}
