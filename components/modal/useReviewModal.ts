"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createMessage } from "@/lib/message";
import { getOrderForReview } from "@/lib/order";
import { getReviewExistsByOrderItemId, upsertReview } from "@/lib/review";
import { getUploadUrl } from "@/lib/upload";
import { buildReviewWordOfMouthModel } from "@/lib/word-of-mouth/engine";
import type {
  ReviewDraft,
  ReviewDraftMap,
  ReviewModalInitialOrder,
  ReviewModalOrder,
  ReviewModalOrderItem,
} from "./reviewModal.types";

function createEmptyReviewDraft(): ReviewDraft {
  return {
    rate: 5,
    content: "",
    images: [],
  };
}

async function loadOrderReviewState(orderId: number) {
  const orderData = await getOrderForReview(orderId);
  if (!orderData) return null;

  const reviewsByItem = await Promise.all(
    orderData.orderItems.map(async (orderItem) => {
      const review = await getReviewExistsByOrderItemId(orderItem.id);
      return [orderItem.id, review] as const;
    })
  );
  const reviewMap = new Map(reviewsByItem);

  const reviews: ReviewDraftMap = {};
  const remainingItems: ReviewModalOrderItem[] = [];

  for (const orderItem of orderData.orderItems) {
    const review = reviewMap.get(orderItem.id);
    reviews[orderItem.id] = review
      ? {
          rate: typeof review.rate === "number" ? review.rate : 5,
          content: "",
          images: [],
        }
      : createEmptyReviewDraft();

    if (!review || !review.rate) {
      remainingItems.push(orderItem);
    }
  }

  return {
    orderData,
    reviews,
    remainingItems,
  };
}

async function uploadReviewImages(files: FileList, currentImages: string[]) {
  const uploadedUrls = [...currentImages];

  for (const file of Array.from(files)) {
    const { success, result } = await getUploadUrl();
    if (!success) continue;

    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(result.uploadURL, {
      method: "POST",
      body: formData,
    });
    const responseData = await response.json();
    const fileUrl = responseData.result.variants.find((url: string) => url.endsWith("/public"));
    if (fileUrl) {
      uploadedUrls.push(fileUrl);
    }
  }

  return uploadedUrls;
}

export function useReviewModal(input: {
  initialOrder: ReviewModalInitialOrder;
  onClose: () => void;
  setAllReviewsCompleted: (value: boolean) => void;
}) {
  const { initialOrder, onClose, setAllReviewsCompleted } = input;
  const [order, setOrder] = useState<ReviewModalOrder>({
    id: initialOrder.id,
    orderItems: [],
  });
  const [reviews, setReviews] = useState<ReviewDraftMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoverRate, setHoverRate] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSendingRecoveryMessage, setIsSendingRecoveryMessage] = useState(false);
  const [recoveryMessageSentByItemId, setRecoveryMessageSentByItemId] = useState<
    Record<number, boolean>
  >({});
  const [orderItemsLength, setOrderItemsLength] = useState(initialOrder.orderItems.length || 1);

  const currentItem = useMemo(
    () => (order?.orderItems?.[currentIndex] ? order.orderItems[currentIndex] : null),
    [currentIndex, order]
  );
  const currentReview = useMemo(
    () => (currentItem ? reviews[currentItem.id] ?? createEmptyReviewDraft() : null),
    [currentItem, reviews]
  );
  const wordOfMouthModel = useMemo(() => {
    if (!currentItem) return null;
    return buildReviewWordOfMouthModel({
      order,
      itemIndex: currentIndex,
      rate: typeof currentReview?.rate === "number" ? currentReview.rate : null,
      content: currentReview?.content || "",
    });
  }, [currentIndex, currentItem, currentReview, order]);

  useEffect(() => {
    async function fetchData() {
      try {
        const loaded = await loadOrderReviewState(initialOrder.id);
        if (!loaded) return;

        setOrderItemsLength(loaded.orderData.orderItems.length);
        setReviews(loaded.reviews);

        if (loaded.remainingItems.length === 0) {
          alert("모든 리뷰를 이미 작성했어요.");
          onClose();
          return;
        }

        setOrder({
          ...loaded.orderData,
          orderItems: loaded.remainingItems,
        });
        setCurrentIndex(0);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [initialOrder.id, onClose]);

  useEffect(() => {
    if (order?.orderItems?.length > 0) {
      setCurrentIndex(0);
    }
  }, [order]);

  const updateCurrentReview = useCallback(
    (patch: Partial<ReviewDraft>) => {
      if (!currentItem) return;
      setReviews((prev) => ({
        ...prev,
        [currentItem.id]: {
          ...(prev[currentItem.id] ?? createEmptyReviewDraft()),
          ...patch,
        },
      }));
    },
    [currentItem]
  );

  const handleSubmitCurrent = useCallback(async () => {
    if (!currentItem || !currentReview) return false;
    const productId = currentItem.pharmacyProduct?.productId;
    if (!productId) {
      alert("리뷰 대상을 확인하지 못했습니다.");
      return false;
    }

    setIsSubmitting(true);
    try {
      await upsertReview({
        orderItemId: currentItem.id,
        rate: currentReview.rate,
        content: currentReview.content,
        images: currentReview.images,
        orderId: order.id,
        productId,
      });
      return true;
    } catch (error) {
      console.error(error);
      alert("리뷰 작성에 실패했습니다.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [currentItem, currentReview, order.id]);

  const handleSubmitAndAdvance = useCallback(async () => {
    const submitted = await handleSubmitCurrent();
    if (!submitted) return;

    if (currentIndex + 1 < order.orderItems.length) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    setAllReviewsCompleted(true);
    onClose();
    alert("리뷰가 성공적으로 등록됐어요.");
  }, [currentIndex, handleSubmitCurrent, onClose, order.orderItems.length, setAllReviewsCompleted]);

  const handleSendRecoveryMessage = useCallback(
    async (draft: string) => {
      if (!currentItem?.id || !order?.id || !draft.trim()) return;
      if (recoveryMessageSentByItemId[currentItem.id]) return;

      setIsSendingRecoveryMessage(true);
      try {
        await createMessage({
          orderId: order.id,
          content: draft.trim(),
        });
        setRecoveryMessageSentByItemId((prev) => ({
          ...prev,
          [currentItem.id]: true,
        }));
      } catch (error) {
        console.error(error);
        alert("설명 전달에 실패했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsSendingRecoveryMessage(false);
      }
    },
    [currentItem, order?.id, recoveryMessageSentByItemId]
  );

  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !currentItem) return;

      setIsUploadingImage(true);
      try {
        const uploadedUrls = await uploadReviewImages(
          files,
          reviews[currentItem.id]?.images || []
        );
        updateCurrentReview({ images: uploadedUrls });
      } finally {
        setIsUploadingImage(false);
      }
    },
    [currentItem, reviews, updateCurrentReview]
  );

  const handleDeleteImage = useCallback(
    (index: number) => {
      if (!currentReview) return;
      updateCurrentReview({
        images: currentReview.images.filter((_, imageIndex) => imageIndex !== index),
      });
    },
    [currentReview, updateCurrentReview]
  );

  return {
    order,
    currentItem,
    currentReview,
    reviews,
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
  };
}
