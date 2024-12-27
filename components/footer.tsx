"use client";

export default function Footer() {
  return (
    <footer className="w-full max-w-[640px] mx-auto bg-gray-800 text-gray-300 text-sm">
      <div className="max-w-[640px] mx-auto px-5 py-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex flex-col items-center sm:items-start">
          <img
            src="/icon.png"
            alt="웰니스박스 로고"
            className="h-8 w-8 inline-block mb-2"
          />
          <span className="text-center sm:text-left">
            © 2024 웰니스박스. All rights reserved.
          </span>
        </div>
        <div className="flex flex-col items-center sm:items-end">
          <span className="text-xs text-gray-400">
            사업자등록번호: 795-01-03612
          </span>
          <span className="text-xs text-gray-400">
            상호명: 코딩테라스 | 대표자: 박소현
          </span>
          <span className="text-xs text-gray-400">
            주소: 서울특별시 서초구 반포대로19길 10
          </span>
        </div>
      </div>
    </footer>
  );
}
