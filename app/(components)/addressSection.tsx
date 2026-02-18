"use client";

import { useState } from "react";
import AddressModal from "@/components/modal/addressModal";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useDraggableModal } from "@/components/common/useDraggableModal";

interface AddressSectionProps {
  roadAddress: string;
  setRoadAddress: (addr: string) => void;
  isAddressModalOpen: boolean;
  setIsAddressModalOpen: (open: boolean) => void;
}

export default function AddressSection({
  roadAddress,
  setRoadAddress,
  isAddressModalOpen,
  setIsAddressModalOpen,
}: AddressSectionProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const confirmModalDrag = useDraggableModal(isConfirmOpen, {
    resetOnOpen: true,
  });

  const handleSave = (newRoadAddress: string, detailAddress: string) => {
    setRoadAddress(newRoadAddress);
    localStorage.setItem("roadAddress", newRoadAddress);
    localStorage.setItem("detailAddress", detailAddress);
    setIsAddressModalOpen(false);
    window.dispatchEvent(new Event("addressUpdated"));
  };

  const handleDeleteConfirmed = () => {
    setRoadAddress("");
    localStorage.removeItem("roadAddress");
    localStorage.removeItem("detailAddress");
    localStorage.removeItem("cartItems");
    localStorage.removeItem("cartBackup");
    localStorage.removeItem("openCart");
    localStorage.removeItem("checkoutInProgress");
    window.dispatchEvent(new Event("cartUpdated"));
    setIsAddressModalOpen(false);
    window.dispatchEvent(new Event("addressCleared"));
    setIsConfirmOpen(false);
  };

  return (
    <>
      {roadAddress && (
        <div className="mt-3 bg-gray-100 px-4 gap-3 py-4 mx-3 sm:mx-2 mb-3 rounded-md flex items-center justify-between text-sm text-gray-700 shadow-sm">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800">현재 주소</p>
            <p className="text-gray-600 mt-1 truncate">{roadAddress}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="text-sm min-w-12 font-normal px-1.5 sm:px-3 h-7 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200"
            >
              수정
            </button>
            <button
              onClick={() => setIsConfirmOpen(true)}
              className="inline-flex items-center justify-center h-7 w-7 rounded ring-1 ring-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
              aria-label="주소 삭제"
              title="주소 삭제"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {isAddressModalOpen && (
        <AddressModal
          onClose={() => setIsAddressModalOpen(false)}
          onSave={handleSave}
          onDelete={() => setIsConfirmOpen(true)}
        />
      )}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            className="relative bg-white rounded-lg shadow-lg w-[calc(100%-2rem)] max-w-sm p-5"
            ref={confirmModalDrag.panelRef}
            style={confirmModalDrag.panelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerDown={confirmModalDrag.handleDragPointerDown}
              className={`absolute left-0 right-0 top-0 h-10 touch-none ${
                confirmModalDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              aria-hidden
            />
            <h2 className="text-lg font-bold text-gray-900">
              주소를 삭제할까요?
            </h2>
            <p
              className="text-sm text-gray-600 mt-2 break-words"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {roadAddress}
            </p>
            <p className="text-xs text-gray-500 mt-3 mb-2">
              주소를 삭제하면 장바구니와 약국 매칭이 초기화돼요.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
