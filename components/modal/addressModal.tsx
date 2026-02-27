"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useDraggableModal } from "@/components/common/useDraggableModal";

type AddressModalProps = {
  onClose: () => void;
  onSave: (roadAddress: string, detailAddress: string) => void;
  onDelete?: () => void;
};

type AddressSearchItem = {
  roadAddress?: string;
  jibunAddress?: string;
};

function normalizeSearchItems(raw: unknown): AddressSearchItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const roadAddress =
        typeof record.roadAddress === "string" ? record.roadAddress.trim() : "";
      const jibunAddress =
        typeof record.jibunAddress === "string" ? record.jibunAddress.trim() : "";
      if (!roadAddress && !jibunAddress) return null;
      return { roadAddress, jibunAddress } as AddressSearchItem;
    })
    .filter((item): item is AddressSearchItem => item !== null);
}

function getAddressLabel(item: AddressSearchItem) {
  return (item.roadAddress || item.jibunAddress || "").trim();
}

export default function AddressModal({
  onClose,
  onSave,
  onDelete,
}: AddressModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressSearchItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [detailedAddress, setDetailedAddress] = useState("");
  const [searchError, setSearchError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const addressDrag = useDraggableModal(true, { resetOnOpen: true });

  useEffect(() => {
    try {
      const has =
        typeof window !== "undefined" && !!localStorage.getItem("roadAddress");
      setCanDelete(has);
    } catch {
      setCanDelete(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    setSearchError("");
    setValidationError("");
    setHasSearched(true);

    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("주소 검색어를 2글자 이상 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get("/api/search-address", {
        params: { query },
      });
      const data = response.data as {
        status?: string;
        addresses?: unknown;
      };
      const nextResults =
        data?.status === "OK" ? normalizeSearchItems(data.addresses) : [];

      setSearchResults(nextResults);
      if (nextResults.length === 0) {
        setSearchError("검색 결과가 없습니다. 도로명 + 건물번호로 다시 검색해 주세요.");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setSearchResults([]);
      setSearchError("주소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!selectedAddress) {
      setValidationError("검색 결과에서 주소를 먼저 선택해 주세요.");
      return;
    }
    onSave(selectedAddress, detailedAddress.trim());
    onClose();
  };

  const handleAddressSelect = (item: AddressSearchItem) => {
    setSelectedAddress(getAddressLabel(item));
    setValidationError("");
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[1.5px] sm:items-center sm:p-5"
      onClick={onClose}
    >
      <section
        ref={addressDrag.panelRef}
        style={addressDrag.panelStyle}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="배송지 주소 설정"
        className="relative w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)]"
      >
        <div
          onPointerDown={addressDrag.handleDragPointerDown}
          className={`absolute left-0 right-14 top-0 h-10 touch-none ${
            addressDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          aria-hidden
        />

        <header className="border-b border-slate-200 px-5 pb-4 pt-5 sm:px-6">
          <div className="mb-3 flex justify-center">
            <span className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">주소 설정</h2>
              <p className="mt-1 text-sm text-slate-600">
                배송 가능한 약국 확인을 위해 주소를 입력해 주세요.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              aria-label="닫기"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid gap-4 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="도로명 또는 지번을 검색하세요"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              disabled={isLoading}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isLoading}
              className="inline-flex h-11 min-w-[4.75rem] items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "검색"
              )}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
            <div className="max-h-56 overflow-y-auto pr-1">
              {!hasSearched ? (
                <div className="px-3 py-10 text-center text-sm text-slate-500">
                  주소를 검색하면 결과가 여기에 표시됩니다.
                </div>
              ) : null}

              {hasSearched && searchResults.length > 0
                ? searchResults.map((result, index) => {
                    const label = getAddressLabel(result);
                    const isSelected = selectedAddress === label;
                    return (
                      <button
                        key={`${label}-${index}`}
                        type="button"
                        onClick={() => handleAddressSelect(result)}
                        className={`mb-2 w-full rounded-xl border px-3 py-3 text-left transition last:mb-0 ${
                          isSelected
                            ? "border-sky-300 bg-sky-50"
                            : "border-slate-200 bg-white hover:border-sky-200"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {result.roadAddress || result.jibunAddress}
                        </p>
                        {result.roadAddress && result.jibunAddress ? (
                          <p className="mt-1 text-xs text-slate-500">
                            지번: {result.jibunAddress}
                          </p>
                        ) : null}
                      </button>
                    );
                  })
                : null}

              {hasSearched && !isLoading && searchResults.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-slate-500">
                  {searchError || "검색 결과가 없습니다."}
                </div>
              ) : null}
            </div>
          </div>

          {selectedAddress ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
              <p className="text-xs font-semibold text-emerald-700">선택한 주소</p>
              <p className="mt-1 text-sm font-medium text-emerald-900">
                {selectedAddress}
              </p>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label
              htmlFor="address-detail-input"
              className="text-xs font-semibold text-slate-600"
            >
              상세 주소 (선택)
            </label>
            <input
              id="address-detail-input"
              type="text"
              placeholder="예: 101동 1203호"
              value={detailedAddress}
              onChange={(event) => setDetailedAddress(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSave();
                }
              }}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {validationError ? (
            <p className="text-sm text-rose-600" role="alert">
              {validationError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            {canDelete && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="mr-auto inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                주소 삭제
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
            >
              주소 저장
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
