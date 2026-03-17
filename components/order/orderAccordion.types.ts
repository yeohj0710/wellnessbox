export type OrderProductCategory = {
  name: string | null;
};

export type OrderProduct = {
  name: string | null;
  images?: string[] | null;
  description?: string | null;
  categories?: OrderProductCategory[] | null;
};

export type OrderPharmacyProduct = {
  optionType: string | null;
  price: number | null;
  stock?: number | null;
  product: OrderProduct | null;
};

export type OrderItemReview = {
  rate?: number | null;
  content?: string | null;
};

export type OrderLineItem = {
  id?: number;
  quantity: number | null;
  pharmacyProduct: OrderPharmacyProduct | null;
  review?: OrderItemReview | null;
};

export type OrderPharmacyInfo = {
  id?: number;
  name?: string;
  address?: string;
  phone?: string;
};

export type OrderAccordionOrder = {
  id: number;
  status: OrderStatus;
  createdAt: string | number | Date;
  updatedAt?: string | number | Date;
  orderItems: OrderLineItem[];
  messagesPreview?: OrderMessage[];
  messageCount?: number;
  totalPrice?: number;
  roadAddress?: string;
  detailAddress?: string;
  phone?: string;
  endpoint?: string;
  requestNotes?: string | null;
  entrancePassword?: string | null;
  directions?: string | null;
  pharmacy?: OrderPharmacyInfo | null;
};

export type OrderMessage = {
  id: number;
  orderId: number;
  pharmacyId: number | null;
  content: string;
  createdAt: string;
  timestamp: number;
};
import type { OrderStatus } from "@/lib/order/orderStatus";
