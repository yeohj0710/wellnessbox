"use client";

import { useCallback } from "react";
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
  const buildProductHref = useCallback(
    (id: number) => `${basePath}?product=${id}#home-products`,
    [basePath]
  );

  const handleProductClick = (id: number) => {
    const href = buildProductHref(id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("scrollPos", String(window.scrollY));
    }
    showLoading();
    router.push(href, { scroll: false });
  };

  const handleProductIntent = useCallback(
    (id: number) => {
      const href = buildProductHref(id);
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname || "/";
        if (currentPath === basePath) {
          return;
        }
      }
      enqueueRoutePrefetch(router, href);
    },
    [basePath, buildProductHref, router]
  );

  return (
    <SupplementRanking
      onProductClick={handleProductClick}
      onProductIntent={handleProductIntent}
      initialProducts={initialProducts}
    />
  );
}
