"use server";

import db from "@/lib/db";
import { ORDER_STATUS, OrderStatus } from "./orderStatus";
import {
  sendOrderNotification,
  sendNewOrderNotification,
  sendRiderNotification,
} from "@/lib/notification";

export async function updateOrderStatus(
  orderid: number,
  newStatus: OrderStatus
) {
  const updatedOrder = await db.order.update({
    where: { id: orderid },
    data: { status: newStatus },
  });
  await sendOrderNotification(orderid, newStatus);
  if (newStatus === ORDER_STATUS.DISPENSE_COMPLETE) {
    await sendRiderNotification(orderid);
  }
  return updatedOrder;
}

export async function createOrder(data: {
  roadAddress?: string;
  detailAddress?: string;
  phone?: string;
  password?: string;
  requestNotes?: string;
  entrancePassword?: string;
  directions?: string;
  paymentId?: string;
  transactionType?: string;
  txId?: string;
  totalPrice?: number;
  status?: OrderStatus;
  pharmacyId?: number;
  orderItems: { pharmacyProductId: number; quantity: number }[];
}) {
  const { orderItems, ...orderData } = data;
  const created = await db.order.create({
    data: {
      ...orderData,
      orderItems: {
        create: orderItems.map((item) => ({
          pharmacyProductId: item.pharmacyProductId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          pharmacyProduct: {
            select: {
              price: true,
              optionType: true,
              product: {
                select: {
                  name: true,
                  images: true,
                  categories: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  await sendNewOrderNotification(created.id);
  return created;
}

export async function updateOrder(
  orderid: number,
  data: {
    roadAddress?: string;
    detailAddress?: string;
    phone?: string;
    password?: string;
    requestNotes?: string;
    entrancePassword?: string;
    directions?: string;
    pharmacyId?: number;
    paymentId?: string;
    transactionType?: string;
    txId?: string;
    status?: OrderStatus;
    orderItems?: { productId: number; quantity: number }[];
    totalPrice?: number;
  }
) {
  const { orderItems, ...orderData } = data;
  const updatedOrder = await db.order.update({
    where: { id: orderid },
    data: {
      ...orderData,
    },
    select: {
      pharmacy: true,
      orderItems: {
        select: {
          pharmacyProduct: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });
  if (orderItems && orderItems.length > 0) {
    await db.orderItem.deleteMany({ where: { orderId: orderid } });
    await db.orderItem.createMany({
      data: orderItems.map((item) => ({
        orderId: orderid,
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
  }

  return updatedOrder;
}

export async function deleteOrder(orderid: number) {
  await db.orderItem.deleteMany({ where: { orderId: orderid } });
  return await db.order.delete({ where: { id: orderid } });
}
