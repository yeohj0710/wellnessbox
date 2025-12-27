"use client";

import { useMemo } from "react";
import OrderDetails from "@/components/order/orderDetails";

type OrdersSectionProps = {
  phone: string;
  linkedAt?: string;
  onOpenVerify: () => void;
};

export default function OrdersSection({
  phone,
  linkedAt,
  onOpenVerify,
}: OrdersSectionProps) {
  const hasPhone = useMemo(() => Boolean(phone), [phone]);
  const isLinked = useMemo(() => Boolean(phone && linkedAt), [phone, linkedAt]);

  const phoneNormalized = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  return (
    <section className="mt-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-gray-900">주문 내역</div>
          <div className="mt-2 text-sm text-gray-600">
            전화번호를 연동하면 주문 내역을 간편하게 확인할 수 있어요.
          </div>
        </div>
      </div>

      {!isLinked ? (
        <div className="mt-4 rounded-2xl bg-gray-50 p-4 sm:p-5 ring-1 ring-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {hasPhone
                  ? "등록된 전화번호는 있어요."
                  : "아직 전화번호가 없어요."}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                전화번호를 연동해 주세요.
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenVerify}
              className="shrink-0 inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-3 text-sm font-semibold text-sky-700 hover:bg-sky-200"
            >
              전화번호 인증
            </button>
          </div>
        </div>
      ) : null}

      {isLinked ? (
        <div className="mt-6">
          <OrderDetails phone={phoneNormalized} lookupMode="phone-only" />
        </div>
      ) : null}
    </section>
  );
}
