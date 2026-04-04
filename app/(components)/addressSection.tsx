"use client";

import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import AddressModal from "@/components/modal/addressModal";

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
        <div className="mb-4 mt-3 px-3 sm:px-4">
          <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-gray-700 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
            <div className="min-w-0">
              <p className="font-semibold text-gray-800">현재 주소</p>
              <p className="mt-1 truncate text-gray-600">{roadAddress}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="h-8 min-w-12 whitespace-nowrap rounded-xl bg-sky-500 px-3 text-sm font-medium text-white transition duration-200 hover:bg-sky-600"
              >
                수정
              </button>
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-100"
                aria-label="주소 삭제"
                title="주소 삭제"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            className="relative w-[calc(100%-2rem)] max-w-sm rounded-lg bg-white p-5 shadow-lg"
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
            <h2 className="text-lg font-bold text-gray-900">주소를 삭제할까요?</h2>
            <p
              className="mt-2 break-words text-sm text-gray-600"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {roadAddress}
            </p>
            <p className="mb-2 mt-3 text-xs text-gray-500">
              주소를 삭제하면 장바구니와 약국 매칭이 초기화돼요.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="rounded bg-red-500 px-3 py-1 text-sm text-white transition hover:bg-red-600"
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
