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
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const handleSearch = async () => {
    if (searchQuery.length <= 4) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setHasSearched(true);
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get("/api/search-address", {
        params: { query: searchQuery },
      });
      const data = response.data;
      setHasSearched(true);
      if (data.status === "OK" && data.addresses.length > 0) {
        setSearchResults(data.addresses);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      alert("주소 검색 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleSave = () => {
    if (!selectedAddress) {
      alert("주소를 선택하세요.");
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
        <div className="bg-white rounded-lg shadow-lg p-6 w-96 m-2">
          <h2 className="text-black text-xl font-bold mb-4">주소 설정</h2>
          <div className="mb-4 flex items-center">
            <input
              type="text"
              placeholder="도로명주소 검색 (예: 송도과학로 85)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              disabled={isLoading}
              className="text-gray-700 text-sm sm:text-base font-normal border px-2 py-1.5 flex-grow rounded mr-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-14 h-8 text-base font-normal px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200 flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "검색"
              )}
            </button>
          </div>
          <div className="mb-4 max-h-40 overflow-y-auto">
            {hasSearched ? (
              searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 border gap-2 rounded mb-2 flex items-center justify-between ${
                      selectedAddress ===
                      (result.roadAddress || result.jibunAddress)
                        ? "bg-blue-100"
                        : ""
                    }`}
                  >
                    <span className="text-gray-700 font-normal text-sm">
                      {result.roadAddress || result.jibunAddress}
                    </span>
                    <button
                      onClick={() =>
                        setSelectedAddress(
                          result.roadAddress || result.jibunAddress
                        )
                      }
                      className="font-normal px-2 py-1 h-7 min-w-12 bg-sky-400 text-white rounded hover:bg-sky-500 text-sm"
                    >
                      선택
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-24 text-center">
                  <p className="text-sm font-normal text-gray-500 mb-5">
                    검색 결과가 없습니다.
                  </p>
                  <p className="text-gray-500 font-normal text-xs">
                    혹시 <b>지번</b> 주소 또는 건물 <b>이름</b>을 입력하셨나요?
                    <br />
                    <b>도로명</b>과 건물 <b>번호</b>를 입력해 주세요. (예:
                    송도과학로 85)
                  </p>
                </div>
              )
            ) : null}
          </div>
          {selectedAddress && (
            <div className="mb-4">
              <p className="font-normal text-sm text-gray-700 mb-2">
                선택된 주소: {selectedAddress}
              </p>
              <input
                type="text"
                placeholder="상세 주소를 입력해 주세요."
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                className="font-normal text-sm text-gray-700 border px-2 py-1.5 w-full rounded focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="text-base font-normal px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 mr-2  transition duration-200"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="text-base font-normal px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200"
            >
              확인
            </button>
          </div>
        </div>
      </div>
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h2 className="text-black text-xl font-bold mb-4">주소 확인</h2>
            <p className="text-sm text-gray-700 mb-4 flex flex-col gap-1">
              <span className="font-normal">이 주소가 맞나요?</span>
              <span className="font-bold">{`${selectedAddress} ${detailedAddress}`}</span>
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-sm font-normal px-2.5 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 mr-2 transition duration-200"
              >
                취소
              </button>
              <button
                onClick={confirmSave}
                className="text-sm font-normal px-2.5 py-1 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200"
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
