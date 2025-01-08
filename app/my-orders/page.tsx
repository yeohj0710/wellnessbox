"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import OrderDetails from "@/components/orderDetails";

export default function MyOrders() {
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  const getFormattedPhone = () => `${phonePart1}-${phonePart2}-${phonePart3}`;

  const handleFetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const formattedPhone = getFormattedPhone();
      const response = await axios.post("/api/orders-by-phone", {
        phone: formattedPhone,
        password,
      });
      setOrders(response.data.orders);
      setIsViewingDetails(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "주문 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[640px] mx-auto mt-8 p-6 bg-white shadow rounded-lg">
      {!isViewingDetails ? (
        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            내 주문 조회
          </h1>
          <div className="mb-4">
            <h2 className="text-lg font-bold p-4 pb-2 mt-3">연락처 입력</h2>
            <div className="px-4 flex gap-2 items-center">
              <input
                type="text"
                maxLength={3}
                value={phonePart1}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/g, "");
                  setPhonePart1(newValue);
                  if (newValue.length === 3) {
                    document.getElementById("phonePart2")?.focus();
                  }
                }}
                className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-14 border rounded-md px-2 py-1.5 text-center transition-colors ${
                  phonePart1.length === 3 ? "bg-gray-100 text-gray-500" : ""
                }`}
              />
              <span className="text-gray-500">-</span>
              <input
                id="phonePart2"
                type="text"
                maxLength={4}
                value={phonePart2}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/g, "");
                  setPhonePart2(newValue);
                  if (newValue.length === 4) {
                    document.getElementById("phonePart3")?.focus();
                  }
                }}
                className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors ${
                  phonePart2.length === 4 ? "bg-gray-100 text-gray-500" : ""
                }`}
              />
              <span className="text-gray-500">-</span>
              <input
                id="phonePart3"
                type="text"
                maxLength={4}
                value={phonePart3}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/g, "");
                  setPhonePart3(newValue);
                }}
                className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors ${
                  phonePart3.length === 4 ? "bg-gray-100 text-gray-500" : ""
                }`}
              />
            </div>
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
              disabled={loading}
            />
          </div>
          <button
            onClick={handleFetchOrders}
            className={`w-full bg-sky-400 text-white font-bold py-2 rounded-lg hover:bg-sky-500 transition ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <span className="loader"></span> 조회 중...
              </div>
            ) : (
              "주문 조회"
            )}
          </button>
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </>
      ) : (
        <OrderDetails
          orders={orders}
          onBack={() => setIsViewingDetails(false)}
        />
      )}
    </div>
  );
}
