"use client";

import { useState } from "react";
import PaymentTest from "@/components/paymentTest";
import AddressModal from "@/components/addressModal";

export default function Features() {
  const [address, setAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <div className="mt-8 w-full sm:w-[640px] xl:w-1/2 px-5 py-7 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
        <div className="flex flex-row gap-[2%] justify-between mb-5 sm:mb-6 items-center">
          <h1 className="text-2xl font-bold text-gray-800">내 위치 등록하기</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
          >
            주소 설정하기
          </button>
        </div>
        <hr className="border-t border-gray-300 mb-6" />
        <p className="text-gray-700">등록된 주소: {address || "없음"}</p>
      </div>
      {showModal && (
        <AddressModal
          onClose={() => setShowModal(false)}
          onSave={(roadAddress: string, detailAddress: string) =>
            setAddress(`${roadAddress} ${detailAddress}`)
          }
        />
      )}
      <div className="mb-8 w-full sm:w-[640px] xl:w-1/2 px-5 py-7 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
        <div className="flex flex-row gap-[2%] justify-between mb-5 sm:mb-6 items-center">
          <h1 className="text-2xl font-bold text-gray-800">결제하기</h1>
        </div>
        <hr className="border-t border-gray-300 mb-6" />
        <PaymentTest />
      </div>
    </>
  );
}
