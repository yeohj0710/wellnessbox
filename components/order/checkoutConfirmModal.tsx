"use client";

interface CheckoutConfirmModalProps {
  visible: boolean;
  roadAddress: string;
  detailAddress: string;
  userContact: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CheckoutConfirmModal({
  visible,
  roadAddress,
  detailAddress,
  userContact,
  onCancel,
  onConfirm,
}: CheckoutConfirmModalProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="mx-2 bg-white rounded-lg shadow-lg w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-base font-medium text-gray-800">주소와 연락처가 확실한가요?</h2>
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-medium text-gray-700">주소:</span>{" "}
            <span className="font-bold">
              {roadAddress} {detailAddress}
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium text-gray-700">연락처:</span>{" "}
            <span className="font-bold">{userContact}</span>
          </p>
        </div>
        <div className="flex border-t border-gray-200">
          <button
            onClick={onCancel}
            className="w-1/2 text-sm text-gray-500 py-3 hover:bg-gray-100 transition"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="w-1/2 text-sm text-sky-500 py-3 font-medium hover:bg-sky-50 transition"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
