"use client";

export type ReviewModalReview = {
  rate: number | null;
  content?: string | null;
};

export type ReviewModalOrderItem = {
  id: number;
  quantity: number | null;
  review?: ReviewModalReview | null;
  pharmacyProduct: {
    productId: number | null;
    optionType: string | null;
    product: {
      name: string | null;
      images: string[];
    } | null;
  } | null;
};

export type ReviewModalOrder = {
  id: number;
  orderItems: ReviewModalOrderItem[];
};

export type ReviewModalInitialOrder = {
  id: number;
  orderItems: Array<{
    id?: number | null;
  }>;
};

export type ReviewDraft = {
  rate: number;
  content: string;
  images: string[];
};

export type ReviewDraftMap = Record<number, ReviewDraft>;

export type ReviewModalProps = {
  initialOrder: ReviewModalInitialOrder;
  onClose: () => void;
  setAllReviewsCompleted: (value: boolean) => void;
};
