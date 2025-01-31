"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getReviewExistsByOrderItemId, upsertReview } from "@/lib/review";
import { getOrderForReview } from "@/lib/order";
import { getUploadUrl } from "@/lib/upload";

export default function ReviewModal({
  initialOrder,
  onClose,
  setAllReviewsCompleted,
}: any) {
  const [order, setOrder] = useState<any>(initialOrder);
  const [reviews, setReviews] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoverRate, setHoverRate] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [orderItemsLength, setOrderItemsLength] = useState(1);
  const currentItem =
    order?.orderItems && order.orderItems[currentIndex]
      ? order.orderItems[currentIndex]
      : null;
  useEffect(() => {
    async function fetchData() {
      try {
        const orderData = await getOrderForReview(initialOrder.id);
        if (!orderData) return;
        setOrderItemsLength(orderData.orderItems.length);
        setOrder((prevOrder: any) => ({
          ...prevOrder,
          ...orderData,
        }));
        const reviewsData: any = {};
        const remainingItems = [];
        for (const orderItem of orderData.orderItems) {
          const review = await getReviewExistsByOrderItemId(orderItem.id);
          reviewsData[orderItem.id] = review || {
            rate: 5,
            content: "",
            images: [],
          };
          if (!review || !review.rate) {
            remainingItems.push(orderItem);
          }
        }
        if (remainingItems.length === 0) {
          alert("모든 리뷰를 이미 작성했어요.");
          onClose();
          return;
        }
        setOrder({
          ...orderData,
          orderItems: remainingItems,
        });
        setReviews(reviewsData);
        setCurrentIndex(0);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  useEffect(() => {
    if (order?.orderItems?.length > 0) {
      setCurrentIndex(0);
    }
  }, [order]);
  async function handleSubmit(orderItemId: number) {
    const { rate, content, images } = reviews[orderItemId];
    const orderId = order.id;
    const productId = currentItem.pharmacyProduct.productId;
    setIsSubmitting(true);
    try {
      await upsertReview({
        orderItemId,
        rate,
        content,
        images,
        orderId,
        productId,
      });
    } catch (err) {
      console.error(err);
      alert("리뷰 작성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    const uploadedUrls = [...(reviews[currentItem.id]?.images || [])];
    for (const file of files) {
      const { success, result } = await getUploadUrl();
      if (success) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(result.uploadURL, {
          method: "POST",
          body: formData,
        });
        const responseData = await response.json();
        const fileUrl = responseData.result.variants.find((url: string) =>
          url.endsWith("/public")
        );
        if (fileUrl) {
          uploadedUrls.push(fileUrl);
          setReviews((prev: any) => ({
            ...prev,
            [currentItem.id]: {
              ...prev[currentItem.id],
              images: [...uploadedUrls],
            },
          }));
        }
      }
    }
    setIsUploadingImage(false);
  };
  const handleDeleteImage = (index: number) => {
    setReviews((prev: any) => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        images: prev[currentItem.id].images.filter(
          (_: string, i: number) => i !== index
        ),
      },
    }));
  };
  return (
    <div
      className="px-2 sm:px-0 fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onClose}
    >
      <div
        className="relative bg-white p-6 rounded shadow-md w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="mb-4 flex flex-row gap-1.5 items-center">
          <span className="text-lg font-bold">리뷰 작성</span>
          <span className="text-sm text-gray-400">
            ({orderItemsLength - currentIndex} / {orderItemsLength})
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="mb-10 w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="">
            <div className="flex flex-col gap-2 text-sm text-gray-600 items-center justify-center">
              <span className="text-base font-bold text-gray-800">
                이 제품은 어떠셨나요?
              </span>
              <img
                className="w-full h-24 object-contain mt-4"
                alt=""
                src={currentItem.pharmacyProduct.product.images[0]}
              />
              <p className="font-semibold text-gray-800 text-center">
                {currentItem.pharmacyProduct.product.name} (
                {currentItem.pharmacyProduct.optionType})
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
              별점
            </label>
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className="relative text-5xl"
                  style={{ width: "3rem", height: "3rem" }}
                >
                  <span className="text-gray-300">★</span>
                  <span
                    className="absolute top-0 left-0 text-yellow-400 overflow-hidden"
                    style={{
                      width:
                        hoverRate !== null
                          ? hoverRate >= star
                            ? "100%"
                            : hoverRate >= star - 0.5
                            ? "50%"
                            : "0%"
                          : reviews[currentItem.id]?.rate >= star
                          ? "100%"
                          : reviews[currentItem.id]?.rate >= star - 0.5
                          ? "50%"
                          : "0%",
                    }}
                  >
                    ★
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setReviews((prev: any) => ({
                        ...prev,
                        [currentItem.id]: {
                          ...prev[currentItem.id],
                          rate: star - 0.5,
                        },
                      }))
                    }
                    onMouseEnter={() => setHoverRate(star - 0.5)}
                    onMouseLeave={() => setHoverRate(null)}
                    className="absolute top-0 left-0 w-1/2 h-full z-10 cursor-pointer"
                    style={{
                      background: "transparent",
                      border: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setReviews((prev: any) => ({
                        ...prev,
                        [currentItem.id]: {
                          ...prev[currentItem.id],
                          rate: star,
                        },
                      }))
                    }
                    onMouseEnter={() => setHoverRate(star)}
                    onMouseLeave={() => setHoverRate(null)}
                    className="absolute top-0 right-0 w-1/2 h-full z-20 cursor-pointer"
                    style={{
                      background: "transparent",
                      border: "none",
                    }}
                  />
                </div>
              ))}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
              리뷰 내용
            </label>
            <textarea
              className="border w-full p-2"
              rows={3}
              value={reviews[currentItem.id]?.content || ""}
              onChange={(e) =>
                setReviews((prev: any) => ({
                  ...prev,
                  [currentItem.id]: {
                    ...prev[currentItem.id],
                    content: e.target.value,
                  },
                }))
              }
              placeholder="구매하신 후기를 작성해 주세요."
            />
            <div className="flex items-center mt-1">
              <button
                onClick={() => document.getElementById("imageUpload")?.click()}
                className="text-sm px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
              >
                이미지 추가하기
              </button>
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {reviews[currentItem.id]?.images?.map(
                (image: string, index: number) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`이미지 ${index + 1}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <button
                      className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full p-1"
                      onClick={() => handleDeleteImage(index)}
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  await handleSubmit(currentItem.id);
                  if (currentIndex + 1 < order.orderItems.length) {
                    setCurrentIndex((prev) => prev + 1);
                  } else {
                    setAllReviewsCompleted(true);
                    onClose();
                    alert("리뷰가 성공적으로 등록되었어요.");
                  }
                }}
                disabled={isSubmitting}
                className={`px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500 ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
