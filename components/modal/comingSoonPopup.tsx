"use client";

import { useEffect, useState } from "react";

export default function ComingSoonPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [doNotShow, setDoNotShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hideUntil = localStorage.getItem("hideComingSoonUntil");
    if (!hideUntil || Date.now() > parseInt(hideUntil, 10)) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== "undefined" && doNotShow) {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem("hideComingSoonUntil", tomorrow.toString());
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-80 m-2"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-black text-xl font-bold mb-4 text-center">
          Coming Soon
        </h2>
        <p className="text-gray-600 text-sm mb-4 text-center">
          임시 판매(베타테스트) 기간이 종료되었습니다.
          <br />
          보내주신 성원에 진심으로 감사드립니다.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="dont-show"
              type="checkbox"
              checked={doNotShow}
              onChange={() => setDoNotShow(!doNotShow)}
              className="mr-2"
            />
            <label htmlFor="dont-show" className="text-sm text-gray-600">
              하루동안 보지 않기
            </label>
          </div>
          <button
            onClick={handleClose}
            className="text-base font-normal px-3 py-0.5 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
