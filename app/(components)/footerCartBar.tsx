"use client";

interface FooterCartBarProps {
  totalPrice: number;
  setIsCartVisible: (visible: boolean) => void;
}

export default function FooterCartBar({
  totalPrice,
  setIsCartVisible,
}: FooterCartBarProps) {
  return (
    <div className="px-5 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
      <span>{totalPrice.toLocaleString()}원</span>
      <button
        className="bg-white text-sky-400 hover:bg-sky-100 transition px-6 py-2 rounded-full font-semibold"
        onClick={() => setIsCartVisible(true)}
      >
        장바구니 보기
      </button>
    </div>
  );
}
