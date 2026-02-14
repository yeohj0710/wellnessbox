"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import SupplementRanking from "@/app/(components)/supplementRanking";
import { useLoading } from "@/components/common/loadingContext.client";
import { enqueueRoutePrefetch } from "@/lib/navigation/prefetch";

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
  const buildProductHref = useCallback(
    (id: number) => `${basePath}?product=${id}#home-products`,
    [basePath]
  );

  const handleProductClick = (id: number) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("scrollPos", String(window.scrollY));
    }
    showLoading();
    startTransition(() => {
      router.push(buildProductHref(id), { scroll: false });
    });
  };

  const handleProductIntent = useCallback(
    (id: number) => {
      enqueueRoutePrefetch(router, buildProductHref(id));
    },
    [buildProductHref, router]
  );

  return (
    <SupplementRanking
      onProductClick={handleProductClick}
      onProductIntent={handleProductIntent}
      initialProducts={initialProducts}
    />
  );
}
