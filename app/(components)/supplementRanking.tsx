"use client";

import { useEffect, useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { getProductsByUpdatedAt } from "@/lib/product/product";
import StarRating from "@/components/common/starRating";
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

export default function SupplementRanking() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="w-full max-w-[640px] mx-auto mt-8 bg-gray-50 px-10 py-6 sm:shadow-md sm:rounded-lg">
      <div
        onClick={() => setIsExpanded((p) => !p)}
        className="flex justify-between items-center cursor-pointer"
      >
        <span className="text-xl font-bold text-gray-800">인기 영양제 랭킹</span>
        <span className="w-6 h-6">
          {isExpanded ? (
            <ChevronUpIcon className="text-gray-600" />
          ) : (
            <ChevronDownIcon className="text-gray-600" />
          )}
        </span>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out border-gray-200 ${
          isExpanded ? "h-auto opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-4 border-t pt-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {products.map((product, index) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="w-6 text-right font-bold text-gray-700">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">
                    {product.name}
                  </span>
                  <StarRating rating={product.rating} size={18} />
                  <span className="text-xs text-gray-500 mt-1">({product.reviewCount})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
