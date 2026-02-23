"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getOrdersWithItemsAndStatusPaginated,
  getOrdersWithItemsByPhonePaginated,
} from "@/lib/order";
import { generateOptimizedPageNumbers } from "@/lib/pagination";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import CustomerOrderAccordionItem from "./customerOrderAccordionItem";
import type { OrderAccordionOrder } from "./orderAccordion.types";

type PaginatedOrdersResult = Awaited<
  ReturnType<typeof getOrdersWithItemsAndStatusPaginated>
>;
type CustomerOrderSummary = PaginatedOrdersResult["orders"][number];

function toOrderStatus(value: unknown): OrderStatus {
  if (
    typeof value === "string" &&
    (Object.values(ORDER_STATUS) as string[]).includes(value)
  ) {
    return value as OrderStatus;
  }
  return ORDER_STATUS.PAYMENT_COMPLETE;
}

type OrderDetailsProps = {
  phone: string;
  password?: string;
  onBack?: () => void;
  lookupMode?: "phone-password" | "phone-only";
};

export default function OrderDetails({
  phone,
  password = "",
  onBack,
  lookupMode = "phone-password",
}: OrderDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const normalizedPhone = phone.replace(/\D/g, "");
      localStorage.setItem("customerAccountKey", normalizedPhone);
    } catch {}
  }, [phone]);

  const fetchOrders = useCallback(
    async (page: number) => {
      setIsPageLoading(true);
      try {
        const result =
          lookupMode === "phone-only"
            ? await getOrdersWithItemsByPhonePaginated(phone, page)
            : await getOrdersWithItemsAndStatusPaginated(phone, password, page);
        setOrders(result.orders);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
        setError(null);
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error
            ? err.message
            : "주문 정보를 불러오지 못했습니다.";
        setError(message);
        setOrders([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setIsPageLoading(false);
      }
    },
    [lookupMode, password, phone]
  );

  useEffect(() => {
    setLoading(true);
    fetchOrders(1);
  }, [fetchOrders]);

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    await fetchOrders(page);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (error) {
    return (
      <div className="w-full flex justify-center px-3 sm:px-4">
        <div className="w-full sm:w-[640px] bg-white border border-gray-100 sm:shadow-md rounded-2xl p-6 text-center">
          <p className="text-base font-semibold text-gray-900">
            주문을 불러오지 못했어요.
          </p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              뒤로 가기
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full flex flex-col gap-0 sm:gap-4">
      {isPageLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        orders.map((order, index) => {
          const normalizedOrder = {
            ...order,
            status: toOrderStatus(order.status),
          } as unknown as OrderAccordionOrder;

          return (
          <div key={order.id} className="w-full">
            <CustomerOrderAccordionItem
              initialOrder={normalizedOrder}
              isInitiallyExpanded={false}
              onBack={onBack}
            />
            {index < orders.length - 1 && (
              <div className="hidden max-sm:block px-4">
                <div className="border-t border-gray-200" />
              </div>
            )}
          </div>
          );
        })
      )}

      {totalPages > 1 ? (
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
      ) : null}
    </div>
  );
}
