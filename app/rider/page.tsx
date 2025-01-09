"use client";

import React, { useEffect, useState } from "react";
import { getOrders, updateOrderStatus } from "@/lib/order";

export default function RiderPage() {
  const [riderOrders, setRiderOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderIdx, setUpdatingOrderIdx] = useState<number | null>(null);
  const fetchRiderOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await getOrders();

      const filtered = allOrders.filter(
        (order: any) =>
          order.status === "조제 완료" ||
          order.status === "픽업 완료" ||
          order.status === "배송 완료"
      );
      setRiderOrders(filtered);
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("주문 정보를 불러오는 데 실패했습니다.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiderOrders();
  }, []);

  const handleUpdateStatus = async (orderIdx: number, newStatus: string) => {
    try {
      setUpdatingOrderIdx(orderIdx);
      const updatedOrder = await updateOrderStatus(orderIdx, newStatus);

      setRiderOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.idx === updatedOrder.idx ? updatedOrder : order
        )
      );
      setUpdatingOrderIdx(null);
    } catch (error) {
      console.error(error);
      alert("주문 상태 업데이트에 실패했습니다.");
      setUpdatingOrderIdx(null);
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center w-full h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-[640px] mx-auto mt-8 mb-12 px-6 sm:px-10 pt-10 pb-14 bg-white sm:shadow-md sm:rounded-lg">
      <h1 className="text-xl font-bold mb-4">라이더 페이지</h1>

      {riderOrders.length === 0 ? (
        <p className="text-gray-600">
          현재 "조제 완료", "픽업 완료" 또는 "배송 완료" 상태의 주문이 없습니다.
        </p>
      ) : (
        <ul className="space-y-4">
          {riderOrders.map((order: any) => (
            <li
              key={order.idx}
              className="p-3 border rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">
                    주문 번호: {order.idx}
                  </p>
                  <p className="text-sm text-gray-600">
                    상태:{" "}
                    <span className="font-bold text-sky-400">
                      {order.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    주소: {order.roadAddress} {order.detailAddress}
                  </p>
                  <p className="text-sm text-gray-600">
                    총 결제 금액: ₩{order.totalPrice?.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleUpdateStatus(order.idx, "조제 완료")}
                    className="px-3 py-1 bg-yellow-500 text-white rounded text-sm flex items-center justify-center"
                    disabled={
                      updatingOrderIdx === order.idx ||
                      order.status === "조제 완료"
                    }
                  >
                    {updatingOrderIdx === order.idx &&
                    order.status !== "조제 완료" ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "조제 완료"
                    )}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.idx, "픽업 완료")}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm flex items-center justify-center"
                    disabled={updatingOrderIdx === order.idx}
                  >
                    {updatingOrderIdx === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "픽업 완료"
                    )}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.idx, "배송 완료")}
                    className="px-3 py-1 bg-sky-500 text-white rounded text-sm flex items-center justify-center"
                    disabled={updatingOrderIdx === order.idx}
                  >
                    {updatingOrderIdx === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "배송 완료"
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
