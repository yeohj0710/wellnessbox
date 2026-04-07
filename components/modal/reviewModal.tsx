"use client";

import React from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ModalLayer from "@/components/common/modalLayer";
import WordOfMouthShareCard from "@/components/common/WordOfMouthShareCard";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import SatisfactionRecoveryCard from "@/components/order/SatisfactionRecoveryCard";
import type { ReviewModalProps } from "./reviewModal.types";
import { useReviewModal } from "./useReviewModal";

export default function ReviewModal({
  initialOrder,
  onClose,
  setAllReviewsCompleted,
}: ReviewModalProps) {
  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(true);
  const {
    order,
    currentItem,
    currentReview,
    loading,
    isSubmitting,
    currentIndex,
    hoverRate,
    isUploadingImage,
    isSendingRecoveryMessage,
    recoveryMessageSentByItemId,
    orderItemsLength,
    wordOfMouthModel,
    setHoverRate,
    updateCurrentReview,
    handleImageUpload,
    handleDeleteImage,
    handleSendRecoveryMessage,
    handleSubmitAndAdvance,
  } = useReviewModal({
    initialOrder,
    onClose,
    setAllReviewsCompleted,
  });

  const currentProduct = currentItem?.pharmacyProduct?.product ?? null;
  const currentProductImage = currentProduct?.images?.[0] ?? null;
  const currentProductName = currentProduct?.name ?? "상품";
  const currentOptionType = currentItem?.pharmacyProduct?.optionType ?? "옵션";

  return (
    <ModalLayer>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-2 sm:px-0"
        onClick={onClose}
      >
        <div
          className="relative w-96 rounded bg-white p-6 shadow-md"
          ref={panelRef}
          style={panelStyle}
          onClick={(event) => event.stopPropagation()}
        >
        <div
          onPointerDown={handleDragPointerDown}
          className={`absolute left-0 right-12 top-0 h-10 touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          aria-hidden
        />
        <button
          className="absolute right-4 top-4 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="mb-4 flex flex-row items-center gap-1.5">
          <span className="text-lg font-bold">리뷰 작성</span>
          <span className="text-sm text-gray-400">
            ({currentIndex + 1} / {orderItemsLength})
          </span>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="mb-10 h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          </div>
        ) : currentItem ? (
          <div>
            <div className="flex flex-col items-center justify-center gap-2 text-sm text-gray-600">
              <span className="text-base font-bold text-gray-800">
                이 상품은 어떠셨나요?
              </span>
              {currentProductImage ? (
                <div className="relative mt-4 h-24 w-full">
                  <Image
                    src={currentProductImage}
                    alt=""
                    fill
                    sizes="512px"
                    className="object-contain"
                  />
                </div>
              ) : null}
              <p className="text-center font-semibold text-gray-800">
                {currentProductName} ({currentOptionType})
              </p>
            </div>

            <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">
              별점
            </label>
            <div className="mb-4 flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className="relative text-5xl"
                  style={{ width: "3rem", height: "3rem" }}
                >
                  <span className="text-gray-300">★</span>
                  <span
                    className="absolute left-0 top-0 overflow-hidden text-yellow-400"
                    style={{
                      width:
                        hoverRate !== null
                          ? hoverRate >= star
                            ? "100%"
                            : hoverRate >= star - 0.5
                            ? "50%"
                            : "0%"
                          : (currentReview?.rate ?? 0) >= star
                          ? "100%"
                          : (currentReview?.rate ?? 0) >= star - 0.5
                          ? "50%"
                          : "0%",
                    }}
                  >
                    ★
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCurrentReview({ rate: star - 0.5 })}
                    onMouseEnter={() => setHoverRate(star - 0.5)}
                    onMouseLeave={() => setHoverRate(null)}
                    className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer"
                    style={{
                      background: "transparent",
                      border: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => updateCurrentReview({ rate: star })}
                    onMouseEnter={() => setHoverRate(star)}
                    onMouseLeave={() => setHoverRate(null)}
                    className="absolute right-0 top-0 z-20 h-full w-1/2 cursor-pointer"
                    style={{
                      background: "transparent",
                      border: "none",
                    }}
                  />
                </div>
              ))}
            </div>

            <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">
              리뷰 내용
            </label>
            <textarea
              className="w-full border p-2"
              rows={3}
              value={currentReview?.content || ""}
              onChange={(event) =>
                updateCurrentReview({ content: event.target.value })
              }
              placeholder="구매하신 후기를 작성해 주세요"
            />

            <SatisfactionRecoveryCard
              mode="review"
              order={order}
              itemIndex={currentIndex}
              rate={
                typeof currentReview?.rate === "number"
                  ? currentReview.rate
                  : null
              }
              content={currentReview?.content || ""}
              className="mt-4"
              onPrimaryAction={handleSendRecoveryMessage}
              primaryActionLoading={isSendingRecoveryMessage}
              primaryActionDone={Boolean(
                recoveryMessageSentByItemId[currentItem.id]
              )}
            />

            {wordOfMouthModel ? (
              <WordOfMouthShareCard model={wordOfMouthModel} className="mt-4" />
            ) : null}

            <div className="mt-1 flex items-center">
              <button
                type="button"
                onClick={() => document.getElementById("imageUpload")?.click()}
                disabled={isUploadingImage}
                className={`rounded px-3 py-1 text-sm text-white ${
                  isUploadingImage
                    ? "cursor-not-allowed bg-sky-300"
                    : "bg-sky-400 hover:bg-sky-500"
                }`}
              >
                {isUploadingImage ? "이미지 업로드 중" : "이미지 추가하기"}
              </button>
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                multiple
                onChange={(event) => handleImageUpload(event.target.files)}
                className="hidden"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {currentReview?.images?.map((image, index) => (
                <div key={`${image}-${index}`} className="relative h-16 w-16">
                  <Image
                    src={image}
                    alt={`리뷰 이미지 ${index + 1}`}
                    fill
                    sizes="256px"
                    className="rounded object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 rounded-full bg-red-500 p-1 text-xs text-white"
                    onClick={() => handleDeleteImage(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmitAndAdvance}
                disabled={isSubmitting}
                className={`rounded px-3 py-1 text-white ${
                  isSubmitting
                    ? "cursor-not-allowed bg-sky-300"
                    : "bg-sky-400 hover:bg-sky-500"
                }`}
              >
                완료
              </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-500">
            리뷰할 상품을 불러오지 못했습니다.
          </div>
        )}
        </div>
      </div>
    </ModalLayer>
  );
}
