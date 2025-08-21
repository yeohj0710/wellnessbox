"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OrderSummary({ order }: { order: any }) {
  const router = useRouter();
  const invalid =
    !!order &&
    (!Array.isArray(order.orderItems) ||
      order.orderItems.length === 0 ||
      order.orderItems.some(
        (i: any) => !i?.pharmacyProduct?.product || !i?.pharmacyProductId
      ));
  if (invalid) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        주문 데이터가 올바르지 않습니다. 고객센터로 문의해 주세요.
        <div className="mt-3 flex gap-2">
          <Link
            href="/about/contact"
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
          >
            문의하기
          </Link>
          <button
            onClick={() => router.push("/")}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white shadow rounded-lg px-8 py-8 mx-2 sm:mx-0">
      <h2 className="text-lg font-bold text-gray-700 mb-6">주문 상세 내역</h2>
      {order?.orderItems.map((orderItem: any, orderId: number) => {
        const { pharmacyProduct } = orderItem;
        const { product } = pharmacyProduct;
        const productImage = product.images?.[0] || "/placeholder.png";
        const productName = product.name;
        const optionType = pharmacyProduct.optionType;
        const productCategories = product.categories?.length
          ? product.categories.map((c: any) => c.name).join(", ")
          : "옵션 없음";
        const unitPrice = pharmacyProduct.price.toLocaleString();
        const totalPrice = (
          pharmacyProduct.price * orderItem.quantity
        ).toLocaleString();
        return (
          <div key={orderId} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <Image
                  src={productImage}
                  alt={productName}
                  fill
                  sizes="128px"
                  className="object-cover rounded-lg"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  {productName} ({optionType})
                </h3>
                <p className="text-xs text-gray-500">{productCategories}</p>
                <p className="text-sm font-bold text-sky-400 mt-1">
                  {unitPrice}원 × {orderItem.quantity}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-sky-400 whitespace-nowrap tabular-nums shrink-0 min-w-[72px] text-right">
              {totalPrice}원
            </p>
          </div>
        );
      })}
      <div className="flex justify-end text-sm text-gray-600">
        <span>배송비</span>
        <span className="font-bold ml-2">3,000원</span>
      </div>
      <div className="flex justify-end gap-2 text-base font-bold mt-2">
        <span className="text-gray-700">총 결제 금액</span>
        <span className="text-right whitespace-nowrap tabular-nums min-w-[72px] inline-flex justify-end">
          {order.totalPrice.toLocaleString()}원
        </span>
      </div>
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-x-4 mb-2">
          <span className="font-bold text-gray-500 shrink-0">수령주소</span>
          <span className="text-gray-800">
            {order?.roadAddress} {order?.detailAddress}
          </span>
        </div>
        <div className="flex items-center gap-x-4">
          <span className="font-bold text-gray-500 shrink-0">전화번호</span>
          <span className="text-gray-800">{order?.phone}</span>
        </div>
      </div>
    </div>
  );
}
