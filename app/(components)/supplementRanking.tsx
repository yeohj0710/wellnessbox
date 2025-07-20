"use client";

import { useEffect, useState } from "react";
import { getProductsByUpdatedAt } from "@/lib/product/product";
import ProductGrid from "@/app/(components)/productGrid";

interface Product {
  id: number;
  name: string;
  images: string[];
  categories: { name: string }[];
  pharmacyProducts: any[];
  rating: number;
  reviewCount: number;
}

export default function SupplementRanking() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const fetched: any = await getProductsByUpdatedAt();
      setProducts(fetched);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <section className="w-full max-w-[640px] mx-auto mt-8 bg-white">
      <h1 className="text-xl font-bold px-4 mt-4 mb-2">인기 영양제 랭킹</h1>
      <ProductGrid
        isLoading={isLoading}
        products={products}
        selectedPackage="전체"
        selectedPharmacy={null}
        setSelectedProduct={() => {}}
      />
    </section>
  );
}
