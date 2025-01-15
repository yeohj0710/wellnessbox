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
          order.idx === updatedOrder.idx
            ? { ...updatedOrder, pharmacy: order.pharmacy }
            : order
        )
      );
      setUpdatingOrderIdx(null);
    } catch (error) {
      console.error(error);
      alert("주문 상태 업데이트에 실패했습니다.");
      setUpdatingOrderIdx(null);
    }
  };
  return (
    <div className="w-full max-w-[640px] mx-auto mt-8 mb-12 px-6 sm:px-10 pt-10 pb-14 bg-white sm:shadow-md sm:rounded-lg">
      <h1 className="text-xl font-bold mb-4">라이더 주문 관리</h1>
      {loading ? (
        <div className="flex justify-center items-center w-full h-20">
          <div className="w-6 h-6 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {riderOrders.length === 0 ? (
            <p className="text-gray-600">
              현재 "조제 완료", "픽업 완료" 또는 "배송 완료" 상태의 주문이
              없습니다.
            </p>
          ) : (
            <ul className="space-y-4">
              {riderOrders.map((order: any) => (
                <li
                  key={order.idx}
                  className="p-3 border rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 p-4 bg-gray-50 rounded-lg shadow-md">
                      <p className="text-lg font-bold text-gray-800 mb-2">
                        주문 번호:{" "}
                        <span className="text-sky-500">{order.idx}</span>
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        상태:{" "}
                        <span
                          className={`font-bold ${
                            order.status === "배송 완료"
                              ? "text-green-500"
                              : order.status === "픽업 완료"
                              ? "text-blue-500"
                              : "text-yellow-500"
                          }`}
                        >
                          {order.status}
                        </span>
                      </p>
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-600">
                          약국명
                        </p>
                        <p className="text-sm text-gray-700">
                          {order.pharmacy?.name || "정보 없음"}
                        </p>
                        <p className="text-sm font-semibold text-gray-600 mt-2">
                          약국 주소
                        </p>
                        <p className="text-sm text-gray-700">
                          {order.pharmacy?.address || "정보 없음"}
                        </p>
                        <p className="text-sm font-semibold text-gray-600 mt-2">
                          약국 전화번호
                        </p>
                        <p className="text-sm text-gray-700">
                          {order.pharmacy?.phone || "정보 없음"}
                        </p>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-600">
                          배송지 주소
                        </p>
                        <p className="text-sm text-gray-700">
                          {order.roadAddress} {order.detailAddress}
                        </p>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-700">
                          주문자 전화번호: {order.phone}
                        </p>
                        <p className="text-gray-700">
                          배송 시 요청 사항: {order.requestNotes || "없음"}
                        </p>
                        <p className="text-gray-700">
                          공동현관 비밀번호: {order.entrancePassword || "없음"}
                        </p>
                        <p className="text-gray-700">
                          찾아오는 길 안내: {order.directions || "없음"}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mt-4">
                        총 결제 금액:{" "}
                        <span className="text-lg font-bold text-sky-400">
                          ₩{order.totalPrice?.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        최종 업데이트:{" "}
                        {new Date(order.updatedAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() =>
                          handleUpdateStatus(order.idx, "조제 완료")
                        }
                        className="w-28 h-9 bg-yellow-500 text-white rounded text-sm flex items-center justify-center shadow-sm hover:bg-yellow-600 transition"
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
                        onClick={() =>
                          handleUpdateStatus(order.idx, "픽업 완료")
                        }
                        className="w-28 h-9 bg-sky-500 text-white rounded text-sm flex items-center justify-center shadow-sm hover:bg-sky-600 transition"
                        disabled={updatingOrderIdx === order.idx}
                      >
                        {updatingOrderIdx === order.idx ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          "픽업 완료"
                        )}
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(order.idx, "배송 완료")
                        }
                        className="w-28 h-9 bg-green-500 text-white rounded text-sm flex items-center justify-center shadow-sm hover:bg-green-600 transition"
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
        </>
      )}
    </div>
  );
}
