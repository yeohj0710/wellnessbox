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
import { verifyOrderPayment } from "@/lib/payment/verified-order-payment";
import { Prisma } from "@prisma/client";
import { validateOwnedWbRndPlanBinding } from "@/lib/server/wb-rnd-order-plan-context";

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
  paymentId: string;
  paymentMethod: string;
  paymentLookupId: string;
  endpoint?: string;
  pharmacyId?: number;
  rndExecutionId?: string;
  rndPlanId?: string;
  orderItems: { pharmacyProductId: number; quantity: number }[];
}) {
  const {
    orderItems,
    endpoint,
    paymentMethod,
    paymentLookupId,
    rndExecutionId,
    rndPlanId,
    ...orderData
  } = data;
  const normalizedItems = normalizeOrderItems(orderItems);
  if (!normalizedItems.length) {
    throw new Error("Order items are required");
  }

  const appUserId = await resolveAppUserIdForOrderPhone(orderData.phone);
  if (Boolean(rndExecutionId) !== Boolean(rndPlanId)) {
    throw new Error("R&D execution and plan IDs must be provided together");
  }
  if (rndExecutionId && rndPlanId) {
    if (!appUserId) {
      throw new Error("Authenticated user required for R&D plan binding");
    }
    await validateOwnedWbRndPlanBinding({
      appUserId,
      executionId: rndExecutionId,
      planId: rndPlanId,
    });
  }
  const verifiedPayment = await verifyOrderPayment({
    paymentId: orderData.paymentId,
    paymentMethod,
    paymentLookupId,
  });
  const paymentId = verifiedPayment.paymentId;

  let txResult;
  try {
    txResult = await db.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { paymentId },
      include: orderWithItemsInclude,
    });
    if (existing) return { order: existing, created: false };

    let pricedTotal = 0;
    for (const item of normalizedItems) {
      const offer = await tx.pharmacyProduct.findUnique({
        where: { id: item.pharmacyProductId },
        select: { price: true, pharmacyId: true },
      });
      if (
        !offer ||
        !Number.isInteger(offer.price) ||
        Number(offer.price) <= 0 ||
        (orderData.pharmacyId != null && offer.pharmacyId !== orderData.pharmacyId)
      ) {
        throw new Error("Invalid pharmacy product offer");
      }
      pricedTotal += Number(offer.price) * item.quantity;
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
    if (pricedTotal !== verifiedPayment.totalPrice) {
      throw new Error("Verified payment amount does not match order total");
    }

    const createdOrder = await tx.order.create({
      data: {
        ...orderData,
        ...verifiedPayment,
        status: ORDER_STATUS.PAYMENT_COMPLETE,
        endpoint,
        appUserId: appUserId ?? undefined,
        rndExecutionId: rndExecutionId || undefined,
        rndPlanId: rndPlanId || undefined,
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await db.order.findUnique({
        where: { paymentId },
        include: orderWithItemsInclude,
      });
      if (existing) return existing;
    }
    throw error;
  }

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
