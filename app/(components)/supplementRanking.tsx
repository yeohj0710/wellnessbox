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
    <section className="w-full max-w-[640px] mx-auto mt-8 bg-gray-50">
      <h1 className="text-xl font-bold px-4 mt-4">인기 영양제</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => <Skeleton key={i} />)
          : products.map((product, index) => (
              <div
                key={product.id}
                className="relative px-[0.5px] sm:px-1 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
                onClick={() => onProductClick(product.id)}
              >
                {product.images[0] ? (
                  <div className="relative h-32 w-full bg-white">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
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
                <span className="absolute top-1 left-1 bg-sky-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
                <div className="p-2 flex flex-col gap-1 flex-grow">
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {product.categories.map((c) => c.name).join(', ') || ''}
                  </p>
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-auto">
                    <StarRating rating={product.rating} size={16} />
                    <span className="text-xs text-gray-500 mt-1">({product.reviewCount})</span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
