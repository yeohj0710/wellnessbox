"use client";

import { useState, useEffect } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/admin");
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get("redirect");
    if (redirect) setRedirectPath(redirect);
  }, []);
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    const res = await fetch("/api/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, loginType: "admin" }),
    });
    if (res.ok) {
      window.location.href = redirectPath;
    } else {
      setError("비밀번호가 올바르지 않습니다.");
      setIsLoading(false);
    }
  };
  return (
    <div className="px-2 flex flex-col w-full max-w-[640px] mx-auto items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full bg-white shadow-md rounded-lg max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 text-center">관리자 로그인</h1>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="mt-6 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          {error && (
            <p className="text-sm mt-2 text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`h-10 flex justify-center items-center mt-3 w-full rounded-lg font-bold text-white transition ${
              isLoading ? "bg-sky-300 cursor-not-allowed" : "bg-sky-400 hover:bg-sky-500"
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "로그인"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
