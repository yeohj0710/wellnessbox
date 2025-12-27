"use client";

export default function PharmacyDetailModal({
  selectedPharmacy,
  onClose,
}: {
  selectedPharmacy: any;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl mx-3 max-h-[90vh] overflow-y-auto rounded-2xl transition-all duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-[1px] rounded-2xl bg-[conic-gradient(at_50%_50%,#6C4DFF_0deg,#3B5BFF_140deg,#56CCF2_260deg,#6C4DFF_360deg)] shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
          <div className="relative rounded-2xl bg-white">
            <button
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition"
              onClick={onClose}
              aria-label="닫기"
            >
              ✕
            </button>
            <div className="px-4 pt-7 pb-4">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#4568F5] to-[#6C4DFF] text-white text-lg shadow-[0_6px_16px_rgba(67,103,230,0.28)]">
                🏢
              </div>

              <h3 className="text-center text-lg sm:text-xl font-extrabold text-[#0F1222]">
                사업자 정보
              </h3>
              <div className="mt-4 rounded-lg ring-1 ring-black/5 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {selectedPharmacy.representativeName && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                      <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                        대표자명
                      </div>
                      <div className="sm:col-span-8 text-sm sm:text-base font-semibold text-gray-800 leading-5">
                        {selectedPharmacy.representativeName}
                      </div>
                    </div>
                  )}
                  {selectedPharmacy.name && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                      <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                        상호명
                      </div>
                      <div className="sm:col-span-8 text-sm sm:text-base font-semibold text-gray-800 leading-5">
                        {selectedPharmacy.name}
                      </div>
                    </div>
                  )}
                  {selectedPharmacy.address && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                      <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                        사업자주소
                      </div>
                      <div className="sm:col-span-8 text-sm sm:text-base text-gray-800 whitespace-pre-line leading-5">
                        {selectedPharmacy.address}
                      </div>
                    </div>
                  )}
                  {selectedPharmacy.registrationNumber && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                      <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                        사업자등록번호
                      </div>
                      <div className="sm:col-span-8 text-sm sm:text-base font-semibold text-gray-800 tracking-wide tabular-nums leading-5">
                        {selectedPharmacy.registrationNumber}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-center">
                <button
                  onClick={onClose}
                  className="inline-flex h-10 items-center justify-center rounded-full px-5 text-white text-sm font-medium bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-md hover:from-[#5A78FF] hover:to-[#7A5BFF] active:scale-[0.99] transition"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
