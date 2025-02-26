"use client";

import AddressModal from "@/components/addressModal";

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
  const handleSave = (newRoadAddress: string, detailAddress: string) => {
    setRoadAddress(newRoadAddress);
    localStorage.setItem("roadAddress", newRoadAddress);
    localStorage.setItem("detailAddress", detailAddress);
    setIsAddressModalOpen(false);
  };
  return (
    <>
      {roadAddress && (
        <div className="mt-3 bg-gray-100 px-4 gap-3 py-4 mx-3 sm:mx-2 mb-4 rounded-md flex items-center justify-between text-sm text-gray-700 shadow-sm">
          <div>
            <p className="font-semibold text-gray-800">현재 주소</p>
            <p className="text-gray-600 mt-1">{roadAddress}</p>
          </div>
          <button
            onClick={() => setIsAddressModalOpen(true)}
            className="text-sm min-w-12 font-normal px-1.5 sm:px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200"
          >
            수정
          </button>
        </div>
      )}
      {isAddressModalOpen && (
        <AddressModal
          onClose={() => setIsAddressModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
