"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function Footer() {
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const businessInfoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showBusinessInfo) {
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 300);
    }
  }, [showBusinessInfo]);
  return (
    <footer className="w-full mx-auto bg-gray-800 text-gray-300 text-sm">
      <div className="px-6 py-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start w-full sm:w-full">
            <Link href="/about">
              <div className="relative h-10 w-10 inline-block mb-2">
                <Image
                  src="/logo.png"
                  alt="웰니스박스 로고"
                  fill
                  sizes="128px"
                  className="hover:animate-bounce-custom object-contain"
                />
              </div>
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
              © 2025 웰니스박스. All rights reserved.
            </span>
            <span className="text-center text-xs sm:text-left text-gray-400 mt-4 max-w-full">
              본 플랫폼은 통신판매중개자로서, 상품의 판매 당사자가 아닙니다.
              구매 관련 모든 거래는 판매자와 구매자 간에 직접 이루어지며, 당사는
              중개 역할만을 수행합니다.
            </span>
            <span className="text-center text-xs sm:text-left text-gray-400 mt-0.5 max-w-full">
              <span className="text-center text-xs sm:text-left text-gray-400 mt-4 max-w-full">
                모든 거래에 대한 책임과 배송, 환불, 민원 등의 처리는
                웰니스박스에서 진행합니다. 민원담당자: 권혁찬 02-6013-4400
              </span>
            </span>
          </div>
          <div className="mt-auto flex flex-col items-center sm:items-end w-full sm:w-1/2 text-center sm:text-right gap-1">
            <button
              onClick={() => setShowBusinessInfo((prev) => !prev)}
              className="flex text-xs font-bold text-gray-400 focus:outline-none"
            >
              사업자 정보
              <ChevronDownIcon
                className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${
                  showBusinessInfo ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              ref={businessInfoRef}
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: showBusinessInfo ? "150px" : "0px" }}
            >
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-xs text-gray-400">
                  사업자등록번호: 795-01-03612
                </span>
                <span className="text-xs text-gray-400">
                  상호명: 웰니스박스 | 대표자: 박소현
                </span>
                <span className="text-xs text-gray-400">
                  대표 전화번호: 02-6013-4400
                </span>
                <span className="text-xs text-gray-400">
                  대표 이메일: smilerobert@naver.com
                </span>
                <span className="text-xs text-gray-400">
                  주소: 서울특별시 서초구 반포대로19길 10 308호
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
