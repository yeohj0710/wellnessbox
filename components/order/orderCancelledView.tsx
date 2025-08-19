"use client";

export default function OrderCancelledView({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="w-full max-w-[640px] mx-auto">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 mt-12">
        결제가 취소되었습니다.
      </h1>
      <div className="text-center mt-6">
        <button
          onClick={onReturn}
          className="bg-sky-400 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-500 transition mb-12"
        >
          장바구니로 돌아가기
        </button>
      </div>
    </div>
  );
}
