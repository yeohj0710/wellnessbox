"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import { ExpandableSection } from "@/components/common/expandableSection";

export default function AddressSection({
  roadAddress,
  setIsAddressModalOpen,
  detailAddress,
  setDetailAddress,
  requestNotes,
  setRequestNotes,
  entrancePassword,
  setEntrancePassword,
  directions,
  setDirections,
  phoneDisplay,
  linkedAt,
  onOpenPhoneModal,
  phoneStatusLoading,
  phoneStatusError,
  isUserLoggedIn,
  password,
  setPassword,
  unlinkError,
}: any) {
  const [showPw, setShowPw] = useState(true);

  return (
    <>
      <h2 className="p-4 pb-2 text-lg font-bold">주소 입력</h2>
      <div className="space-y-3 px-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">도로명 주소</label>
          <div className="flex items-center gap-2">
            <p className="flex-1 rounded-md border bg-gray-100 px-2.5 py-2 text-base text-gray-500">
              {roadAddress || "선택한 도로명 주소가 없어요."}
            </p>
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="min-w-12 rounded bg-sky-400 px-1.5 py-1 text-sm font-normal text-white transition duration-200 hover:bg-sky-500 sm:px-3"
            >
              수정
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">상세 주소 (선택)</label>
          <input
            type="text"
            value={detailAddress}
            onChange={(e) => {
              setDetailAddress(e.target.value);
              localStorage.setItem("detailAddress", e.target.value);
            }}
            placeholder="예: A동 101호"
            className="w-full rounded-md border px-3 py-2 text-base text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>

      <h2 className="mt-2 p-4 pb-2 text-lg font-bold">추가 요청사항</h2>
      <div className="space-y-3 px-4">
        <ExpandableSection title="배송 전 요청사항 (선택)">
          <input
            type="text"
            value={requestNotes}
            onChange={(e) => {
              setRequestNotes(e.target.value);
              localStorage.setItem("requestNotes", e.target.value);
            }}
            placeholder="예: 문 앞에 놓아주세요"
            className="w-full rounded-md border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </ExpandableSection>

        <ExpandableSection title="공동현관 비밀번호 (선택)">
          <input
            type="text"
            value={entrancePassword}
            onChange={(e) => {
              setEntrancePassword(e.target.value);
              localStorage.setItem("entrancePassword", e.target.value);
            }}
            placeholder="예: #1234"
            className="w-full rounded-md border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </ExpandableSection>

        <ExpandableSection title="찾아오는 길 안내 (선택)">
          <input
            type="text"
            value={directions}
            onChange={(e) => {
              setDirections(e.target.value);
              localStorage.setItem("directions", e.target.value);
            }}
            placeholder="예: 마트 옆 건물 입구가 있어요"
            className="w-full rounded-md border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </ExpandableSection>
      </div>

      <h2 className="mt-3 p-4 pb-2 text-lg font-bold">연락처</h2>
      <div className="space-y-3 px-4">
        <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">휴대폰 번호</div>
              <div className="text-sm text-gray-700">
                {phoneStatusLoading ? (
                  <InlineSpinnerLabel
                    label="확인 중"
                    className="text-gray-700"
                    spinnerClassName="text-sky-500"
                  />
                ) : (
                  phoneDisplay || "연결된 번호가 없어요"
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenPhoneModal}
              disabled={phoneStatusLoading}
              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-sky-100 px-4 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-sky-50"
            >
              {phoneDisplay ? "변경" : "인증"}
            </button>
          </div>

          <p className="text-xs text-gray-600">
            결제 때 사용하는 휴대폰 번호로 주문 내역을 더 쉽게 확인할 수 있어요.
          </p>

          {!isUserLoggedIn ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
              카카오로 로그인하면 더 많은 기능과 함께 편하게 이어서 사용할 수 있어요.
            </p>
          ) : null}

          {!linkedAt && phoneDisplay ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
              휴대폰 번호가 아직 확인되지 않았어요. "{phoneDisplay}" 번호로 다시 인증해
              주세요.
            </p>
          ) : null}

          {unlinkError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
              {unlinkError}
            </p>
          ) : null}

          {phoneStatusError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
              {phoneStatusError}
            </p>
          ) : null}
        </div>
      </div>

      <h2 className="mt-2 p-4 pb-2 text-lg font-bold">주문 조회 비밀번호</h2>
      <div className="space-y-3 px-4">
        <div className="relative">
          <input
            id="order-password"
            type={showPw ? "text" : "password"}
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="주문 조회 때 필요한 비밀번호예요."
            className="w-full rounded-md border px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 rounded p-1 -translate-y-1/2 hover:bg-gray-100"
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPw ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
