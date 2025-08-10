"use client";

interface ComingSoonPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function ComingSoonPopup({
  open,
  onClose,
}: ComingSoonPopupProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-lg p-6 w-96 m-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-4 text-gray-500"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-black text-xl font-bold mb-4 text-center">
          현재 리뉴얼 작업 중이에요.
        </h2>
        <p className="text-gray-600 text-sm mb-4 text-center">
          임시 판매(베타테스트) 기간이 종료되었어요.
          <br />
          보내주신 성원에 진심으로 감사드립니다.
          <br />
          8월 중으로 재판매가 시작됩니다.
        </p>
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="text-base font-normal px-3 py-0.5 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
