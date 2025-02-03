"use client";

import { useState } from "react";
import Link from "next/link";
import { riderLogin } from "@/lib/rider";

export default function RiderLogin() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await riderLogin(userId, password);
      if (result?.success) {
        window.location.href = "/rider";
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="px-2 flex flex-col w-full max-w-[640px] mx-auto items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full bg-white shadow-md rounded-lg max-w-md p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          라이더 로그인
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          아이디와 비밀번호를 입력해 주세요.
        </p>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="아이디"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
          {error && (
            <p className="text-red-500 text-sm font-medium text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full h-10 bg-sky-400 hover:bg-sky-500 text-white font-semibold py-2 rounded-lg transition duration-200 flex justify-center items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "로그인"
            )}
          </button>
        </form>
        <div className="flex flex-row justify-center gap-2 mt-6 text-sm text-gray-600">
          <p className="mb-2">로그인에 문제가 있나요?</p>
          <Link
            href="/about/contact"
            className="text-sky-400 hover:text-sky-500 font-semibold"
          >
            문의하기 &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
