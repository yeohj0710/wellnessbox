"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBasicOrdersByRider } from "@/lib/order";
import { generateOptimizedPageNumbers } from "@/lib/pagination";
import FullPageLoader from "@/components/common/fullPageLoader";
import { getRider } from "@/lib/rider";
import OrderAccordionItem from "@/components/rider/orderAccordionItem";
import { useRiderPushSubscription } from "@/components/rider/useRiderPushSubscription";
import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import { normalizeOrderSummary } from "@/components/order/orderAccordionNormalize";

type RiderIdentity = {
  id: number;
};

export default function Rider() {
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState<RiderIdentity | null>(null);
  const [orders, setOrders] = useState<OrderAccordionOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const router = useRouter();

  const { isSubscribed, isSubscribeLoading, toggleSubscription } =
    useRiderPushSubscription({
      riderId: rider?.id ?? null,
    });

  useEffect(() => {
    let cancelled = false;

    async function fetchRider() {
      try {
        const riderIdentity = await getRider();
        if (cancelled) return;

        if (!riderIdentity || typeof riderIdentity.id !== "number") {
          router.replace("/rider-login");
          return;
        }

        setRider({ id: riderIdentity.id });
      } catch (error) {
        console.error(error);
        if (!cancelled) router.replace("/rider-login");
      }
    }

    void fetchRider();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!rider) return;

    let cancelled = false;

    const fetchOrders = async () => {
      setIsPageLoading(true);
      try {
        const result = await getBasicOrdersByRider(1);
        if (cancelled) return;

        setOrders(result.orders.map((order) => normalizeOrderSummary(order)));
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error(error);
        if (cancelled) return;

        setOrders([]);
        setTotalPages(1);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsPageLoading(false);
        }
      }
    };

    void fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [rider]);

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;

    setCurrentPage(page);
    setIsPageLoading(true);

    try {
      const result = await getBasicOrdersByRider(page);
      setOrders(result.orders.map((order) => normalizeOrderSummary(order)));
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error(error);
    } finally {
      setIsPageLoading(false);
    }
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const isSubscriptionUnknown = isSubscribed === null;

  if (loading) return <FullPageLoader />;

  return (
    <div className="w-full mt-8 mb-12 flex flex-col gap-4">
      <div className="px-4">
        <div className="w-full max-w-[640px] mx-auto rounded-2xl bg-white sm:shadow-md sm:border p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">픽업 대기 주문 알림</p>
            <p className="text-xs text-gray-500 mt-0.5">
              조제가 완료되어 픽업이 필요한 주문이 생기면 알려드려요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label
              className={`relative inline-flex items-center ${
                isSubscribeLoading || isSubscriptionUnknown
                  ? "opacity-50 pointer-events-none"
                  : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={!!isSubscribed}
                onChange={toggleSubscription}
                disabled={isSubscribeLoading || isSubscriptionUnknown}
                className="sr-only peer"
                aria-label="픽업 대기 주문 알림"
                aria-checked={!!isSubscribed}
                role="switch"
              />
              <span className="w-12 h-7 rounded-full bg-gray-200 peer-checked:bg-sky-500 transition-colors duration-200 relative after:absolute after:top-0.5 after:left-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5" />
            </label>

            {isSubscribeLoading || isSubscriptionUnknown ? (
              <span
                className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
            ) : (
              <span
                className={`text-xs ${isSubscribed ? "text-sky-600" : "text-gray-500"}`}
              >
                {isSubscribed ? "켜짐" : "꺼짐"}
              </span>
            )}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex justify-center items-center w-full max-w-[640px] mx-auto mt-8 mb-12 py-12 bg-white sm:shadow-md sm:rounded-lg">
          <p className="text-gray-500">아직 픽업 대기 중인 주문이 없어요.</p>
        </div>
      ) : (
        <>
          {isPageLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            orders.map((order, index) => (
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
                  onClick={() => void handlePageChange(1)}
                  disabled={!canGoPrev}
                  aria-label="첫 페이지"
                  className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  ≪
                </button>
                <button
                  onClick={() => void handlePageChange(currentPage - 1)}
                  disabled={!canGoPrev}
                  aria-label="이전 페이지"
                  className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  &lt;
                </button>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1">
                  {generateOptimizedPageNumbers(totalPages, currentPage).map((page) => (
                    <button
                      key={page}
                      onClick={() => void handlePageChange(page)}
                      aria-current={page === currentPage ? "page" : undefined}
                      className={`h-9 min-w-9 px-3 rounded-full text-sm transition-all border ${
                        page === currentPage
                          ? "bg-sky-600 text-white border-sky-600 shadow"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => void handlePageChange(currentPage + 1)}
                  disabled={!canGoNext}
                  aria-label="다음 페이지"
                  className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  &gt;
                </button>
                <button
                  onClick={() => void handlePageChange(totalPages)}
                  disabled={!canGoNext}
                  aria-label="마지막 페이지"
                  className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  ≫
                </button>
              </div>

              <div className="mt-2 w-full text-center text-xs text-gray-500">
                페이지 {currentPage} / {totalPages}
              </div>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
