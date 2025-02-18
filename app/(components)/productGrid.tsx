"use client";

import StarRating from "@/components/starRating";
import { formatPriceRange, getLowestAverageOptionType } from "@/lib/utils";
import Skeleton from "./skeleton";

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
              className="px-[0.5px] sm:px-1 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
              onClick={() => setSelectedProduct(product)}
            >
              {product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-32 w-full object-contain bg-white"
                />
              ) : (
                <div className="h-28 bg-gray-200 flex items-center justify-center text-gray-500">
                  이미지 없음
                </div>
              )}
              <div className="p-2 flex flex-col gap-1 flex-grow">
                <div className="flex flex-col gap-1 flex-grow">
                  <span className="text-xs text-gray-500">
                    {product.categories
                      .map((category) => category.name)
                      .join(", ")}
                  </span>
                  <span className="text-sm font-bold text-gray-800 line-clamp-2">
                    {product.name}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-auto">
                  <span className="">
                    <span className="text-xs text-sky-500">
                      {selectedPackage === "전체"
                        ? getLowestAverageOptionType({
                            product,
                            pharmacy: selectedPharmacy,
                          })
                        : selectedPackage}{" "}
                      기준
                    </span>{" "}
                    {selectedPackage && selectedPharmacy && (
                      <span className="text-xs text-gray-400">
                        {product.pharmacyProducts.find(
                          (pharmacyProduct: any) =>
                            pharmacyProduct.optionType === selectedPackage &&
                            pharmacyProduct.pharmacyId === selectedPharmacy.id
                        )?.capacity
                          ? `(${
                              product.pharmacyProducts.find(
                                (pharmacyProduct: any) =>
                                  pharmacyProduct.optionType ===
                                    selectedPackage &&
                                  pharmacyProduct.pharmacyId ===
                                    selectedPharmacy.id
                              )?.capacity
                            })`
                          : ""}
                      </span>
                    )}
                  </span>
                  <span className="-mt-1 backdrop:file:text-sm font-bold text-sky-500">
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
