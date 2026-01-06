"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getProductsByUpdatedAt } from "@/lib/product/product";
import StarRating from "@/components/common/starRating";
import Skeleton from "./skeleton";
import { sortByImportanceDesc } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  images: string[];
  categories: { name: string }[];
  pharmacyProducts: any[];
  rating: number;
  reviewCount: number;
  importance?: number | null;
}

interface SupplementRankingProps {
  onProductClick: (id: number) => void;
}

export default function SupplementRanking({
  onProductClick,
}: SupplementRankingProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const fetched: any = await getProductsByUpdatedAt();
      setProducts(sortByImportanceDesc(fetched));
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <section className="w-full max-w-[640px] mx-auto mt-8">
      <div className="px-4">
        <h1 className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-[#3B82F6] to-[#6C4DFF] bg-clip-text text-transparent">
            인기 영양제
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => <Skeleton key={i} />)
          : products.map((product, index) => (
              <button
                key={product.id}
                onClick={() => onProductClick(product.id)}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-[0_6px_20px_rgba(67,103,230,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(67,103,230,0.18)] focus:outline-none focus:ring-2 focus:ring-[#6C4DFF]/50"
              >
                <div className="relative w-full aspect-[4/3]">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="512px"
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      이미지 없음
                    </div>
                  )}
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-[#3B82F6] to-[#6C4DFF] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    #{index + 1}
                  </span>
                </div>

                <div className="px-3 pb-3 flex flex-1 flex-col">
                  <p className="text-[11px] text-gray-500 line-clamp-1">
                    {product.categories.map((c) => c.name).join(", ") || ""}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.6rem]">
                    {product.name}
                  </h3>
                  <div className="mt-auto flex items-center gap-1">
                    {/* <StarRating rating={product.rating} size={16} />
                    <span className="text-[11px] text-gray-500">
                      ({product.reviewCount})
                    </span> */}
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-12 bg-gradient-to-t from-[#6C4DFF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
      </div>
    </section>
  );
}
