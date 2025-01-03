"use client";

import { useState } from "react";
import axios from "axios";

interface AddressModalProps {
  onClose: () => void;
  onSave: (fullAddress: string) => void;
}

export default function AddressModal({ onClose, onSave }: AddressModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [detailedAddress, setDetailedAddress] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const handleSearch = async () => {
    try {
      const response = await axios.get("/api/search-address", {
        params: { query: searchQuery },
      });
      const data = response.data;
      if (data.status === "OK" && data.addresses.length > 0) {
        setSearchResults(data.addresses);
      } else {
        setSearchResults([]);
        alert("검색 결과가 없습니다.");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      alert("주소 검색 중 오류가 발생했습니다.");
    }
  };
  const handleSave = () => {
    if (!selectedAddress) {
      alert("주소를 선택하세요.");
      return;
    }
    if (!detailedAddress) {
      alert("상세 주소를 입력하세요.");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const confirmSave = () => {
    onSave(`${selectedAddress} ${detailedAddress}`);
    setIsConfirmModalOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-96">
          <h2 className="text-xl font-bold mb-4">주소 설정</h2>
          <div className="mb-4 flex items-center">
            <input
              type="text"
              placeholder="도로명주소 검색 (예: 송도과학로 85)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.length > 4) handleSearch();
              }}
              className="border px-2 py-1.5 flex-grow rounded mr-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              onClick={() => {
                if (searchQuery.length > 4) handleSearch();
              }}
              className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
            >
              검색
            </button>
          </div>
          <div className="mb-4 max-h-40 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className={`px-2 py-1 border gap-2 rounded mb-2 flex items-center justify-between ${
                  selectedAddress ===
                  (result.roadAddress || result.jibunAddress)
                    ? "bg-blue-100"
                    : ""
                }`}
              >
                <span className="text-sm">
                  {result.roadAddress || result.jibunAddress}
                </span>
                <button
                  onClick={() =>
                    setSelectedAddress(
                      result.roadAddress || result.jibunAddress
                    )
                  }
                  className="px-2 py-1 h-7 w-12 bg-sky-400 text-white rounded hover:bg-sky-500 text-sm"
                >
                  선택
                </button>
              </div>
            ))}
          </div>
          {selectedAddress && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                선택된 주소: {selectedAddress}
              </p>
              <input
                type="text"
                placeholder="상세 주소를 입력해 주세요."
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
                className="border p-2 w-full rounded"
              />
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-300 text-white rounded hover:bg-gray-400 mr-2"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
            >
              확인
            </button>
          </div>
        </div>
      </div>
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h2 className="text-xl font-bold mb-4">주소 확인</h2>
            <p className="text-sm text-gray-700 mb-4 flex flex-col gap-1">
              <span>이 주소가 맞나요?</span>
              <span className="font-bold">{`${selectedAddress} ${detailedAddress}`}</span>
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3 py-1 bg-gray-300 text-white rounded hover:bg-gray-400 mr-2"
              >
                취소
              </button>
              <button
                onClick={confirmSave}
                className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
