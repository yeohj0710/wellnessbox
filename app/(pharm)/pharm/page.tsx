"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBasicOrdersByPharmacy } from "@/lib/order";
import { generateOptimizedPageNumbers } from "@/lib/pagination";
import { getPharmacy } from "@/lib/pharmacy";
import FullPageLoader from "@/components/common/fullPageLoader";
import OrderAccordionItem from "@/components/pharm/orderAccordionItem";
import { usePharmPushSubscription } from "@/components/pharm/usePharmPushSubscription";
import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import { normalizeOrderSummary } from "@/components/order/orderAccordionNormalize";

type PharmacyIdentity = {
  id: number;
};

export default function Pharm() {
  const [loading, setLoading] = useState(true);
  const [pharm, setPharm] = useState<PharmacyIdentity | null>(null);
  const [orders, setOrders] = useState<OrderAccordionOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const router = useRouter();

  const { isSubscribed, isSubscribeLoading, toggleSubscription } =
    usePharmPushSubscription({
      pharmacyId: pharm?.id ?? null,
    });

  useEffect(() => {
    let cancelled = false;

    async function fetchPharmacy() {
      try {
        const pharmacy = await getPharmacy();
        if (cancelled) return;

        if (!pharmacy || typeof pharmacy.id !== "number") {
          router.replace("/pharm-login");
          return;
        }

        setPharm({ id: pharmacy.id });
      } catch (error) {
        console.error(error);
        if (!cancelled) router.replace("/pharm-login");
      }
    }

    void fetchPharmacy();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!pharm) return;

    let cancelled = false;

    const fetchOrders = async () => {
      setIsPageLoading(true);
      try {
        const result = await getBasicOrdersByPharmacy(pharm.id, 1);
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
  }, [pharm]);

  const handlePageChange = async (page: number) => {
    if (!pharm || page < 1 || page > totalPages || page === currentPage) return;

    setCurrentPage(page);
    setIsPageLoading(true);
    try {
      const result = await getBasicOrdersByPharmacy(pharm.id, page);
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
            <p className="text-sm font-semibold text-gray-900">신규 주문 알림</p>
            <p className="text-xs text-gray-500 mt-0.5">
              새 주문 접수 또는 상담 메시지가 오면 알림을 보내드려요.
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
                aria-label="신규 주문 알림"
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
          <p className="text-gray-500">아직 들어온 주문이 없어요.</p>
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
                pharm={pharm}
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
