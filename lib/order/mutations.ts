"use server";

import db from "@/lib/db";
import { ORDER_STATUS, OrderStatus } from "./orderStatus";
import {
  sendOrderNotification,
  sendNewOrderNotification,
  sendRiderNotification,
} from "@/lib/notification";
import getSession from "@/lib/session";
import { normalizePhone } from "@/lib/otp";

const orderWithItemsInclude = {
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
} as const;

function normalizeOrderItems(
  items: { pharmacyProductId: number; quantity: number }[]
) {
  const merged = new Map<number, number>();
  for (const item of items) {
    const pharmacyProductId = Number(item?.pharmacyProductId);
    const quantity = Number(item?.quantity);
    if (
      !Number.isInteger(pharmacyProductId) ||
      pharmacyProductId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      continue;
    }
    merged.set(pharmacyProductId, (merged.get(pharmacyProductId) ?? 0) + quantity);
  }
  return Array.from(merged.entries()).map(([pharmacyProductId, quantity]) => ({
    pharmacyProductId,
    quantity,
  }));
}

async function resolveAppUserIdForOrderPhone(orderPhone?: string): Promise<string | undefined> {
  const session = await getSession();
  const kakaoId = session.user?.kakaoId;
  if (!session.user?.loggedIn || typeof kakaoId !== "number") return undefined;

  const appUser = await db.appUser.findUnique({
    where: { kakaoId: String(kakaoId) },
    select: { id: true, phone: true },
  });
  if (!appUser) return undefined;

  const orderDigits = normalizePhone(orderPhone ?? "").replace(/\D/g, "");
  const userDigits = normalizePhone(appUser.phone ?? "").replace(/\D/g, "");
  if (orderDigits && userDigits && orderDigits !== userDigits) return undefined;

  return appUser.id;
}

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
  endpoint?: string;
  totalPrice?: number;
  status?: OrderStatus;
  pharmacyId?: number;
  orderItems: { pharmacyProductId: number; quantity: number }[];
}) {
  const { orderItems, endpoint, ...orderData } = data;
  const normalizedItems = normalizeOrderItems(orderItems);
  if (!normalizedItems.length) {
    throw new Error("Order items are required");
  }

  const appUserId = await resolveAppUserIdForOrderPhone(orderData.phone);
  const paymentId = orderData.paymentId?.trim();

  const txResult = await db.$transaction(async (tx) => {
    if (paymentId) {
      const existing = await tx.order.findFirst({
        where: { paymentId },
        include: orderWithItemsInclude,
      });
      if (existing) return { order: existing, created: false };
    }

    for (const item of normalizedItems) {
      const updated = await tx.pharmacyProduct.updateMany({
        where: {
          id: item.pharmacyProductId,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });
      if (updated.count !== 1) {
        throw new Error("Insufficient stock for one or more items");
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        ...orderData,
        paymentId: paymentId || undefined,
        endpoint,
        appUserId: appUserId ?? undefined,
        orderItems: {
          create: normalizedItems.map((item) => ({
            pharmacyProductId: item.pharmacyProductId,
            quantity: item.quantity,
          })),
        },
      },
      include: orderWithItemsInclude,
    });
    return { order: createdOrder, created: true };
  });

  if (txResult.created) {
    await sendNewOrderNotification(txResult.order.id);
  }
  return txResult.order;
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
    orderItems?: { pharmacyProductId: number; quantity: number }[];
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
    const normalizedItems = normalizeOrderItems(orderItems);
    if (!normalizedItems.length) {
      throw new Error("Order items are invalid");
    }
    await db.orderItem.deleteMany({ where: { orderId: orderid } });
    await db.orderItem.createMany({
      data: normalizedItems.map((item) => ({
        orderId: orderid,
        pharmacyProductId: item.pharmacyProductId,
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
