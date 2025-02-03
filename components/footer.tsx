"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full  mx-auto bg-gray-800 text-gray-300 text-sm">
      <div className="px-6 py-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start w-full sm:w-1/2">
            <Link href="/about">
              <img
                src="/logo.png"
                alt="웰니스박스 로고"
                className="h-10 w-10 inline-block mb-2 hover:animate-bounce-custom"
              />
            </Link>
            <div className="flex justify-center sm:justify-start gap-4 mt-2">
              <Link href="/about/terms" className="text-sm text-gray-400">
                이용약관
              </Link>
              <Link href="/about/privacy" className="text-sm text-gray-400">
                개인정보처리방침
              </Link>
              <Link href="/about/contact" className="text-sm text-gray-400">
                문의하기
              </Link>
            </div>
            <div className="flex justify-center sm:justify-start gap-4 mt-1.5">
              <Link href="/pharm-login" className="text-sm text-gray-400">
                약국으로 로그인
              </Link>
              <Link href="/rider-login" className="text-sm text-gray-400">
                라이더로 로그인
              </Link>
            </div>
            <span className="text-center text-xs sm:text-left text-gray-400 mt-4">
              © 2024 웰니스박스. All rights reserved.
            </span>
          </div>
          <div className="flex flex-col items-center sm:items-end w-full sm:w-1/2 text-center sm:text-right gap-1 mt-auto">
            <span className="text-xs text-gray-400">
              사업자등록번호: 795-01-03612
            </span>
            <span className="text-xs text-gray-400">
              상호명: 코딩테라스 | 대표자: 박소현
            </span>
            <span className="text-xs text-gray-400">
              대표 전화번호: 010-7603-8164
            </span>
            <span className="text-xs text-gray-400">
              대표 이메일: smilerobert@naver.com
            </span>
            <span className="text-xs text-gray-400">
              주소: 서울특별시 서초구 반포대로19길 10
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
