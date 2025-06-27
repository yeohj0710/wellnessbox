"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import OrderDetails from "@/components/order/orderDetails";

export default function MyOrders() {
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setPhonePart1(localStorage.getItem("my-orders-phonePart1") || "010");
    setPhonePart2(localStorage.getItem("my-orders-phonePart2") || "");
    setPhonePart3(localStorage.getItem("my-orders-phonePart3") || "");
    setPassword(localStorage.getItem("my-orders-password") || "");
  }, []);
  useEffect(() => {
    setPhone(`${phonePart1}-${phonePart2}-${phonePart3}`);
  }, [phonePart1, phonePart2, phonePart3]);
  const handleFetchOrders = async () => {
    if (!phonePart2 || !phonePart3 || !password) {
      setError("전화번호와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.post("/api/orders-by-phone", {
        phone,
        password,
      });
      if (response.data.isOrderExists) {
        setIsViewingDetails(true);
      } else {
        setError("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "주문 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="w-full max-w-[640px] mt-8 mb-12">
      {!isViewingDetails ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFetchOrders();
          }}
          className="w-full max-w-[640px] px-10 pt-10 pb-14 bg-white sm:shadow-md sm:rounded-lg"
        >
          <h1 className="text-2xl font-bold text-gray-800">내 주문 조회</h1>
          <p className="text-sm text-gray-600 mt-6">
            결제 시 입력한
            <span className="text-sky-400 font-bold"> 전화번호</span>와
            <span className="text-sky-400 font-bold"> 비밀번호</span>로 주문을
            쉽게 조회할 수 있어요.
          </p>
          <div className="mt-6 mb-4">
            <h2 className="text-lg font-bold pb-2 mt-3">연락처 입력</h2>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                autoComplete="tel"
                maxLength={3}
                value={phonePart1}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/g, "");
                  setPhonePart1(newValue);
                  localStorage.setItem("my-orders-phonePart1", newValue);
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
                autoComplete="tel"
                maxLength={4}
                value={phonePart2}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/g, "");
                  setPhonePart2(newValue);
                  localStorage.setItem("my-orders-phonePart2", newValue);
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
                autoComplete="tel"
                maxLength={4}
                value={phonePart3}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/g, "");
                  setPhonePart3(newValue);
                  localStorage.setItem("my-orders-phonePart3", newValue);
                }}
                className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors ${
                  phonePart3.length === 4 ? "bg-gray-100 text-gray-500" : ""
                }`}
              />
            </div>
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-bold pb-2 mt-3">주문 조회 비밀번호</h2>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                localStorage.setItem("my-orders-password", e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFetchOrders();
                }
              }}
              placeholder="주문 시 입력한 비밀번호"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={`w-full h-10 bg-sky-400 text-white font-bold rounded-lg hover:bg-sky-500 transition ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              "주문 조회"
            )}
          </button>
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </form>
      ) : (
        <OrderDetails
          phone={phone}
          password={password}
          onBack={() => setIsViewingDetails(false)}
        />
      )}
    </div>
  );
}
