"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Skeleton from "./skeleton";
import { getCategoriesByUpdatedAt } from "@/lib/product";

export default function PopularIngredients() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const fetched = await getCategoriesByUpdatedAt();
      setCategories(fetched);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <section className="w-full max-w-[640px] mx-auto mt-8 bg-white">
      <h1 className="text-xl font-bold px-4 mt-4">인기 성분</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => <Skeleton key={i} />)
          : categories.map((category) => (
              <div
                key={category.id}
                className="px-[0.5px] sm:px-1 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
              >
                {category.image ? (
                  <div className="relative h-32 w-full bg-white">
                    <Image
                      src={category.image}
                      alt={category.name || "Category"}
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
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2">
                    {category.name}
                  </h3>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
