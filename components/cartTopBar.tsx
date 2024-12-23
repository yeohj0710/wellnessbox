"use client";

type CartTopBarProps = {
  onBack: () => void;
};

export default function CartTopBar({ onBack }: CartTopBarProps) {
  return (
    <header className="fixed top-0 left-0 w-full bg-white z-50 shadow-md h-14 flex items-center px-4">
      <button onClick={onBack} className="text-gray-500 text-xl mr-4">
        ←
      </button>
      <h1 className="text-lg font-bold">장바구니</h1>
    </header>
  );
}
