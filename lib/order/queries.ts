// Query operations related to orders
"use server";
import db from "@/lib/db";
import { ORDER_STATUS, OrderStatus } from "./orderStatus";

export async function checkOrderExists(phone: string, password: string) {
  const exists = await db.order.findFirst({
    where: { phone, password },
    select: { id: true },
  });
  return !!exists;
}

export async function getOrdersWithItemsAndStatus(phone: string, password: string) {
  const orders = await db.order.findMany({
    where: { phone, password },
    select: {
      id: true,
      status: true,
      createdAt: true,
      orderItems: {
        select: {
          quantity: true,
          pharmacyProduct: {
            select: {
              optionType: true,
              product: {
                select: { name: true },
              },
            },
          },
          review: {
            select: { rate: true, content: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (orders.length === 0) {
    throw new Error("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
  }
  return orders;
}

export async function getOrderById(orderid: number) {
  return await db.order.findFirst({
    where: { id: orderid },
    select: {
      status: true,
      createdAt: true,
      totalPrice: true,
      roadAddress: true,
      detailAddress: true,
      phone: true,
      requestNotes: true,
      entrancePassword: true,
      directions: true,
      orderItems: {
        select: {
          id: true,
          quantity: true,
          pharmacyProduct: {
            select: {
              optionType: true,
              price: true,
              product: {
                select: {
                  name: true,
                  images: true,
                  description: true,
                  categories: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          review: {
            select: { rate: true, content: true },
          },
        },
      },
      pharmacy: {
        select: { id: true, name: true, address: true, phone: true },
      },
    },
  });
}

export async function getOrderForReview(orderid: number) {
  return await db.order.findFirst({
    where: { id: orderid },
    select: {
      id: true,
      orderItems: {
        select: {
          id: true,
          review: {
            select: { rate: true, content: true },
          },
          pharmacyProduct: {
            select: {
              productId: true,
              optionType: true,
              product: {
                select: { name: true, images: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getOrderStatusById(orderid: number) {
  return await db.order.findFirst({
    where: { id: orderid },
    select: { status: true },
  });
}

export async function getBasicOrdersByPharmacy(pharmacyId: number) {
  return await db.order.findMany({
    where: { pharmacyId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      orderItems: {
        select: {
          quantity: true,
          pharmacyProduct: {
            select: {
              optionType: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBasicOrdersByRider() {
  return await db.order.findMany({
    where: {
      NOT: [
        { status: ORDER_STATUS.PAYMENT_COMPLETE },
        { status: ORDER_STATUS.COUNSEL_COMPLETE },
        { status: ORDER_STATUS.CANCELED },
      ],
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      orderItems: {
        select: {
          quantity: true,
          pharmacyProduct: {
            select: {
              optionType: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderByPaymentId(paymentId: string) {
  return await db.order.findFirst({
    where: { paymentId },
    select: { id: true },
  });
}
