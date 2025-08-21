"use client";

import { useRef } from "react";

interface FooterCartBarProps {
  totalPrice: number;
  setIsCartVisible: (visible: boolean) => void;
}

export default function FooterCartBar({
  totalPrice,
  setIsCartVisible,
}: FooterCartBarProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="px-5 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
      <span>{totalPrice.toLocaleString()}원</span>
      <button
        ref={btnRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setIsCartVisible(true);
          btnRef.current?.blur();
        }}
        className="bg-white text-sky-400 hover:bg-sky-100 transition px-6 py-2 rounded-full font-semibold focus:outline-none focus-visible:outline-none focus:ring-0"
      >
        장바구니 보기
      </button>
    </div>
  );
}
