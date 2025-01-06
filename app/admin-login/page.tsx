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
  const handleSubmit = async () => {
    setIsLoading(true);
    const res = await fetch("/api/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setIsLoading(false);
    if (res.ok) {
      window.location.href = redirectPath;
    } else {
      setError("비밀번호가 올바르지 않습니다.");
    }
  };
  return (
    <div className="mt-8 w-full max-w-[640px] mx-auto xl:w-1/2 px-5 py-7 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          관리자 로그인
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="비밀번호를 입력하세요"
          className="mt-6 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`mt-3 w-full py-2 rounded-lg font-bold text-white transition ${
            isLoading
              ? "bg-sky-300 cursor-not-allowed"
              : "bg-sky-400 hover:bg-sky-500"
          }`}
        >
          {isLoading ? "로그인 중..." : "확인"}
        </button>
      </div>
    </div>
  );
}
