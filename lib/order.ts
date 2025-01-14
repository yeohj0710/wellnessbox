"use server";

import db from "@/lib/db";

export async function getOrdersByPhoneAndPassword(
  phone: string,
  password: string
) {
  const orders = await db.order_.findMany({
    where: { phone, password },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          product: {
            include: {
              categories: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (orders.length === 0) {
    throw new Error("해당 전화번호로 조회된 주문이 없습니다.");
  }
  if (password !== orders[0].password) {
    throw new Error("비밀번호가 일치하지 않습니다.");
  }
  return orders;
}

export async function getOrdersByPharmacy(pharmacyIdx: number) {
  return await db.order_.findMany({
    where: { pharmacyIdx },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          product: {
            include: {
              categories: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      messages: {
        orderBy: {
          timestamp: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateOrderStatus(orderIdx: number, newStatus: string) {
  const updatedOrder = await db.order_.update({
    where: { idx: orderIdx },
    data: { status: newStatus },
  });
  return updatedOrder;
}

export async function getOrders() {
  return await db.order_.findMany({
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getOrderById(orderIdx: number) {
  return await db.order_.findUnique({
    where: { idx: orderIdx },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getOrderByPaymentId(paymentId: string) {
  return await db.order_.findFirst({
    where: { paymentId },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function createOrder(data: {
  roadAddress?: string;
  detailAddress?: string;
  phone?: string;
  password?: string;
  requestNotes?: string;
  entrancePassword?: string;
  directions?: string;
  pharmacyIdx?: number;
  paymentId?: string;
  transactionType?: string;
  txId?: string;
  status?: string;
  orderItems: { productId: number; quantity: number }[];
  totalPrice: number;
}) {
  const { orderItems, ...orderData } = data;
  return await db.order_.create({
    data: {
      ...orderData,
      orderItems: {
        create: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          product: {
            include: {
              categories: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function updateOrder(
  orderIdx: number,
  data: {
    roadAddress?: string;
    detailAddress?: string;
    phone?: string;
    password?: string;
    requestNotes?: string;
    entrancePassword?: string;
    directions?: string;
    pharmacyIdx?: number;
    paymentId?: string;
    transactionType?: string;
    txId?: string;
    status?: string;
    orderItems?: { productId: number; quantity: number }[];
    totalPrice?: number;
  }
) {
  const { orderItems, ...orderData } = data;
  const updatedOrder = await db.order_.update({
    where: { idx: orderIdx },
    data: {
      ...orderData,
    },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
  if (orderItems && orderItems.length > 0) {
    await db.orderItem_.deleteMany({
      where: { orderId: orderIdx },
    });
    await db.orderItem_.createMany({
      data: orderItems.map((item) => ({
        orderId: orderIdx,
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
  }

  return updatedOrder;
}

export async function deleteOrder(orderIdx: number) {
  await db.orderItem_.deleteMany({
    where: { orderId: orderIdx },
  });

  return await db.order_.delete({
    where: { idx: orderIdx },
  });
}
