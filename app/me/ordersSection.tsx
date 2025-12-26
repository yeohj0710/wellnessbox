"use client";

import { useMemo, useState } from "react";

import OrderDetails from "@/components/order/orderDetails";
import PhoneLinkSection from "./phoneLinkSection";

type OrdersSectionProps = {
  initialPhone?: string;
  initialLinkedAt?: string;
};

function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return "연동된 전화번호 없음";
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
  initialPhone,
  initialLinkedAt,
}: OrdersSectionProps) {
  const [linkedPhone, setLinkedPhone] = useState(initialPhone ?? "");
  const [linkedAt, setLinkedAt] = useState<string | undefined>(initialLinkedAt);

  const hasLinkedPhone = useMemo(() => Boolean(linkedPhone), [linkedPhone]);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-800">내 주문 목록</h2>
        <p className="text-sm text-gray-600">
          카카오 로그인과 연동한 전화번호로 주문 내역을 확인할 수 있어요. 전화번호를
          인증하면 해당 번호로 등록된 주문을 자동으로 불러올게요.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-800">
              현재 연결 상태: {formatPhoneDisplay(linkedPhone)}
            </p>
            {linkedAt ? (
              <p className="text-xs text-gray-500">
                연동 시각: {new Date(linkedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              hasLinkedPhone
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {hasLinkedPhone ? "주문 조회 가능" : "전화번호 연동 필요"}
          </span>
        </div>

        {!hasLinkedPhone ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-800">주문 목록을 확인하려면?</p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-gray-600">
              <li>결제 시 사용한 전화번호를 연동해 주세요.</li>
              <li>인증이 완료되면 해당 번호로 등록된 주문을 자동으로 조회해요.</li>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <PhoneLinkSection
          initialPhone={linkedPhone}
          initialLinkedAt={linkedAt}
          onLinked={(phone, linkedAtValue) => {
            setLinkedPhone(phone);
            setLinkedAt(linkedAtValue);
          }}
        />
      </div>

      {hasLinkedPhone ? (
        <div className="mt-8">
          <OrderDetails phone={linkedPhone} lookupMode="phone-only" />
        </div>
      ) : null}
    </div>
  );
}

