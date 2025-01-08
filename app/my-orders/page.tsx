"use client";

import { useState } from "react";
import axios from "axios";

export default function MyOrders() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const handleFetchOrders = async () => {
    try {
      const response = await axios.post("/api/orders-by-phone", {
        phone,
        password,
      });
      setOrders(response.data.orders);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "주문 조회에 실패했습니다.");
    }
  };
  return (
    <div className="w-full max-w-[640px] mx-auto mt-8 p-6 bg-white shadow rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">내 주문 조회</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          전화번호
        </label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="예: 010-1234-5678"
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="주문 시 입력한 비밀번호"
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <button
        onClick={handleFetchOrders}
        className="w-full bg-sky-500 text-white font-bold py-2 rounded-lg hover:bg-sky-600 transition"
      >
        주문 조회
      </button>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">주문 내역</h2>
        {orders.length > 0 ? (
          orders.map((order: any, index: number) => (
            <div
              key={index}
              className="border-b py-4 flex justify-between items-center"
            >
              <div>
                <p className="text-sm text-gray-700">주문 번호: {order.idx}</p>
                <p className="text-sm text-gray-500">상태: {order.status}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">조회된 주문이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
