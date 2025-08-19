"use client";

export default function PharmacyInfoSection({
  selectedPharmacy,
  onShowDetail,
}: any) {
  if (!selectedPharmacy) return null;
  return (
    <div className="px-4 mt-8">
      <div className="flex justify-start items-center gap-3">
        <h2 className="text-lg font-bold text-gray-800">약국 정보</h2>
        <button
          onClick={onShowDetail}
          className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-xs text-gray-400 hover:text-gray-500"
        >
          사업자 정보
        </button>
      </div>
      <div className="mt-3">
        <div className="flex items-center">
          <span className="w-24 text-sm font-medium text-gray-600">약국명</span>
          <p className="flex-1 text-sm sm:text-base font-semibold text-gray-800">
            {selectedPharmacy.name}
          </p>
        </div>
        <div className="flex items-start mt-2">
          <span className="w-24 text-sm font-medium text-gray-600">약국 주소</span>
          <p className="flex-1 text-sm sm:text-base text-gray-700">
            {selectedPharmacy.address}
          </p>
        </div>
        <div className="flex items-center mt-2">
          <span className="w-24 text-sm font-medium text-gray-600">전화번호</span>
          <p className="flex-1 text-sm sm:text-base text-gray-700">
            {selectedPharmacy.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
