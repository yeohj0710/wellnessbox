"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrderComplete({ order }: { order?: any }) {
  const router = useRouter();
  const finalOrder = order || mockOrder;
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, []);
  if (!finalOrder || !finalOrder.orderItems) {
    router.push("/");
    return null;
  }
  const { roadAddress, detailAddress, phone, totalPrice, orderItems } =
    finalOrder;
  return (
    <div className="w-full max-w-[640px] mx-auto mt-4 px-3">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-4 mt-8">
        결제가 완료되었습니다! 🎉
      </h1>
      <div className="px-4 py-4 bg-white shadow rounded-lg">
        <h2 className="text-lg font-bold text-gray-700 mb-4">주문 상세 내역</h2>
        {orderItems.map((item: any, index: number) => (
          <div
            key={index}
            className="flex items-center justify-between mb-4 border-b pb-4"
          >
            <div className="flex items-center gap-4">
              <img
                src={item.product.images?.[0] || "/placeholder.png"}
                alt={item.product.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  {item.product.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {item.product.categories
                    .map((category: any) => category.name)
                    .join(", ") || "옵션 없음"}
                </p>
                <p className="text-sm font-bold text-sky-400 mt-1">
                  ₩{item.product.price.toLocaleString()} x {item.quantity}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-sky-400">
              ₩{(item.product.price * item.quantity).toLocaleString()}
            </p>
          </div>
        ))}
        <div className="flex justify-end mt-4 text-sm text-gray-600 gap-1">
          <span>배송비</span>
          <span className="font-bold">₩3,000</span>
        </div>
        <div className="mt-4 text-right">
          <p className="text-base text-gray-600">
            주소: {roadAddress} {detailAddress}
          </p>
          <p className="text-base text-gray-600 mt-1">연락처: {phone}</p>
          <h3 className="flex justify-end gap-2 text-lg font-bold mt-2">
            <span className="text-gray-700">총 결제 금액</span>
            <span className="text-sky-400">₩{totalPrice.toLocaleString()}</span>
          </h3>
        </div>
      </div>
      <div className="px-4 py-4 bg-white shadow rounded-lg mt-4">
        <p className="text-sm text-gray-600">
          결제 시 입력한
          <span className="text-sky-400 font-bold"> 전화번호</span>와
          <span className="text-sky-400 font-bold"> 비밀번호</span>로 주문을
          쉽게 조회할 수 있어요.
        </p>
      </div>
      <div className="mt-6 flex justify-center">
        <Link
          href="/my-orders"
          className="bg-sky-400 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-500 transition mb-12"
        >
          내 주문 조회하기
        </Link>
      </div>
    </div>
  );
}

const mockOrder = {
  id: 6,
  roadAddress: "인천광역시 연수구 송도과학로 85 연세대학교 국제캠퍼스",
  detailAddress: "A동 102호",
  phone: "010-2342-1222",
  password: "1234",
  requestNotes: "문 앞",
  entrancePassword: "",
  directions: "",
  paymentId: "payment1736323899368",
  transactionType: "PAYMENT",
  txId: "019444f8-235c-019b-ae21-facf8a8640c4",
  status: "결제 완료",
  createdAt: "2025-01-08T08:11:59.693Z",
  updatedAt: "2025-01-08T08:11:59.693Z",
  pharmacyid: 1,
  pharmacy: {
    id: 1,
    name: "송도캠퍼스약국",
    address: "인천 연수구 송도과학로27번길 55 롯데캐슬캠퍼스타운상가 A동 3층",
    phone: "0507-1386-4450",
    userId: "asdf",
    password: "asdf",
    createdAt: "2025-01-03T02:58:38.439Z",
    updatedAt: "2025-01-08T04:39:27.681Z",
  },
  totalPrice: 16700,
  orderItems: [
    {
      id: 5,
      quantity: 1,
      orderId: 6,
      productId: 11,
      product: {
        id: 11,
        name: "지큐랩 장건강 포스트 솔루션 (7일 패키지)",
        images: [
          "https://imagedelivery.net/9kyXN1C-THXijlwsh9RpXw/0158d983-7d87-4b57-0e28-4caeff7a2900/public",
        ],
        description: "7회분 (7일 패키지)",
        price: 6700,
        createdAt: "2024-12-30T10:03:18.437Z",
        updatedAt: "2025-01-06T07:46:19.616Z",
        categories: [
          {
            name: "포스트바이오틱스",
          },
        ],
      },
    },
    {
      id: 6,
      quantity: 4,
      orderId: 6,
      productId: 13,
      product: {
        id: 13,
        name: "트리플 스트렝스 오메가3 피쉬오일 (7일 패키지)",
        images: [
          "https://imagedelivery.net/9kyXN1C-THXijlwsh9RpXw/9465bfc8-6ae2-4112-b56c-a36de1ff3e00/public",
        ],
        description: "7정 (7일 패키지)",
        price: 2300,
        createdAt: "2024-12-30T10:03:18.437Z",
        updatedAt: "2024-12-30T10:03:18.437Z",
        categories: [
          {
            name: "오메가3",
          },
        ],
      },
    },
  ],
};
