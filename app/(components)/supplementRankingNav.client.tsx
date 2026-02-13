"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import SupplementRanking from "@/app/(components)/supplementRanking";
import { useLoading } from "@/components/common/loadingContext.client";

interface SupplementRankingNavProps {
  basePath: string;
  initialProducts?: any[];
}

export default function SupplementRankingNav({
  basePath,
  initialProducts = [],
}: SupplementRankingNavProps) {
  const router = useRouter();
  const { showLoading } = useLoading();
  const [, startTransition] = useTransition();

  const handleProductClick = (id: number) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("scrollPos", String(window.scrollY));
    }
    showLoading();
    startTransition(() => {
      router.push(`${basePath}?product=${id}#home-products`, { scroll: false });
    });
  };

  return (
    <SupplementRanking
      onProductClick={handleProductClick}
      initialProducts={initialProducts}
    />
  );
}
