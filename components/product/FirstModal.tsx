"use client";
import { useState } from "react";
import AddressModal from "@/components/modal/addressModal";

export default function FirstModal({
  product,
  selectedOption,
  quantity,
  onAddToCart,
  onClose,
  onProductDetailClose,
  onAddressSaved,
}: any) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <>
      {!isAddressModalOpen ? (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={handleBackgroundClick}
        >
          <div className="bg-white rounded-xl shadow-2xl px-6 sm:px-8 py-8 w-128">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              주소를 입력해 주세요!
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              해당 상품을 주문할 수 있는 약국을 보여드릴게요.
            </p>
            <p className="text-xs font-normal text-gray-600 mt-0.5 mb-6 leading-relaxed">
              (주소는 주문 완료 전에는 어디에도 제공되지 않아요.)
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={onClose}
                className="text-sm font-medium px-3 sm:px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition duration-200"
              >
                다른 상품을 구경할게요
              </button>
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="text-sm font-medium px-3 sm:px-4 py-2 bg-sky-500 text-white rounded-md shadow-md hover:bg-sky-600 transition duration-200"
              >
                주소를 입력할게요
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AddressModal
          onClose={() => {
            setIsAddressModalOpen(false);
            onClose();
          }}
          onSave={async (roadAddress: string, detailAddress: string) => {
            localStorage.setItem("roadAddress", roadAddress);
            localStorage.setItem("detailAddress", detailAddress);

            if (typeof onAddressSaved === "function") {
              onAddressSaved(roadAddress);
            }

            const cartItem = {
              productId: product.id,
              productName: product.name,
              optionType: selectedOption,
              quantity,
            };

            onAddToCart(cartItem);

            setIsAddressModalOpen(false);
            onClose();
            onProductDetailClose();
          }}
        />
      )}
      {isSaving && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </>
  );
}
