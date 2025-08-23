"use client";

import React, { useState, useEffect } from "react";
import { getBasicOrdersByRider } from "@/lib/order";
import { generateOptimizedPageNumbers } from "@/lib/pagination";
import { useRouter } from "next/navigation";
import FullPageLoader from "@/components/common/fullPageLoader";
import { getRider } from "@/lib/rider";
import OrderAccordionItem from "@/components/rider/orderAccordionItem";

export default function Rider() {
  const [loading, setLoading] = useState<boolean>(true);
  const [rider, setRider] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchRider() {
      const rider = await getRider();
      if (!rider) {
        router.push("/rider-login");
      } else {
        setRider(rider);
      }
    }
    fetchRider();
  }, [router]);

  useEffect(() => {
    if (!rider) return;
    const load = async () => {
      setIsPageLoading(true);
      const { orders: fetchedOrders, totalPages } = await getBasicOrdersByRider(
        1
      );
      setOrders(fetchedOrders);
      setTotalPages(totalPages);
      setLoading(false);
      setIsPageLoading(false);
    };
    load();
  }, [rider]);

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    setIsPageLoading(true);
    const { orders: fetchedOrders, totalPages: newTotal } =
      await getBasicOrdersByRider(page);
    setOrders(fetchedOrders);
    setTotalPages(newTotal);
    setIsPageLoading(false);
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (loading) return <FullPageLoader />;
  if (orders.length === 0) {
    return (
      <div className="flex justify-center items-center w-full max-w-[640px] mx-auto mt-8 mb-12 py-12 bg-white sm:shadow-md sm:rounded-lg">
        <p className="text-gray-500">아직 들어온 주문이 없어요.</p>
      </div>
    );
  }

  return (
    <div className="w-full mt-8 mb-12 flex flex-col gap-4">
      {isPageLoading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        orders.map((order: any, index: number) => (
          <OrderAccordionItem
            key={order.id}
            initialOrder={order}
            isInitiallyExpanded={index === 0}
          />
        ))
      )}
      <nav aria-label="페이지네이션" className="mt-6">
        <div className="mx-auto w-full max-w-[640px] px-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => handlePageChange(1)}
              disabled={!canGoPrev}
              aria-label="첫 페이지"
              className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              «
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!canGoPrev}
              aria-label="이전 페이지"
              className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              ←
            </button>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1">
              {generateOptimizedPageNumbers(totalPages, currentPage).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={`h-9 min-w-9 px-3 rounded-full text-sm transition-all border ${
                      page === currentPage
                        ? "bg-sky-600 text-white border-sky-600 shadow"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!canGoNext}
              aria-label="다음 페이지"
              className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              →
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={!canGoNext}
              aria-label="마지막 페이지"
              className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              »
            </button>
          </div>
          <div className="mt-2 w-full text-center text-xs text-gray-500">
            페이지 {currentPage} / {totalPages}
          </div>
        </div>
      </nav>
    </div>
  );
}
