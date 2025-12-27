"use client";

import { useMemo } from "react";
import OrderDetails from "@/components/order/orderDetails";

type OrdersSectionProps = {
  phone: string;
  linkedAt?: string;
  onOpenVerify: () => void;
};

function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export default function OrdersSection({
  phone,
  linkedAt,
  onOpenVerify,
}: OrdersSectionProps) {
  const hasPhone = useMemo(() => Boolean(phone), [phone]);
  const isLinked = useMemo(() => Boolean(phone && linkedAt), [phone, linkedAt]);
  const phoneDisplay = useMemo(() => formatPhoneDisplay(phone), [phone]);

  return (
    <section className="mt-7 rounded-2xl bg-gray-50 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-gray-900">주문 내역</div>
          <div className="mt-2 text-sm text-gray-600">
            결제에 사용한 전화번호를 인증하면 주문 내역을 확인할 수 있어요.
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-gray-200">
        {isLinked ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 text-sm text-gray-700">
              인증된 전화번호:{" "}
              <span className="font-semibold text-gray-900">
                {phoneDisplay}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenVerify}
              className="shrink-0 inline-flex h-8 items-center rounded-full bg-sky-100 px-3 text-sm font-semibold text-sky-700 hover:bg-sky-200"
            >
              전화번호 변경
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              {hasPhone
                ? "등록된 전화번호는 있어요."
                : "아직 전화번호가 없어요."}
              <div className="mt-1 text-xs text-gray-500">
                결제에 사용한 전화번호를 인증해 주세요.
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenVerify}
              className="shrink-0 inline-flex h-8 items-center rounded-full bg-sky-100 px-3 text-sm font-semibold text-sky-700 hover:bg-sky-200"
            >
              전화번호 인증
            </button>
          </div>
        )}
      </div>

      {isLinked ? (
        <div className="mt-6">
          <OrderDetails phone={phone} lookupMode="phone-only" />
        </div>
      ) : null}
    </section>
  );
}
