"use server";

import db from "@/lib/db";

export async function checkOrderExists(phone: string, password: string) {
  const exists = await db.order_.findFirst({
    where: { phone, password },
    select: { idx: true },
  });
  if (!exists) {
    throw new Error("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
  }
  return true;
}

export async function getOrdersWithItemsAndStatus(
  phone: string,
  password: string
) {
  const orders = await db.order_.findMany({
    where: { phone, password },
    select: {
      idx: true,
      status: true,
      createdAt: true,
      orderItems: {
        select: {
          quantity: true,
          product: {
            select: {
              name: true,
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
    throw new Error("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
  }
  return orders;
}

export async function getOrderById(orderIdx: number) {
  return await db.order_.findUnique({
    where: { idx: orderIdx },
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

export async function getOrderStatusById(orderIdx: number) {
  return await db.order_.findUnique({
    where: { idx: orderIdx },
    select: {
      status: true,
    },
  });
}

export async function getBasicOrdersByPharmacy(pharmacyIdx: number) {
  return await db.order_.findMany({
    where: { pharmacyIdx },
    select: {
      idx: true,
      status: true,
      createdAt: true,
      orderItems: {
        select: {
          quantity: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getBasicOrdersByRider() {
  return await db.order_.findMany({
    where: {
      NOT: [{ status: "결제 완료" }, { status: "상담 완료" }],
    },
    select: {
      idx: true,
      status: true,
      createdAt: true,
      orderItems: {
        select: {
          quantity: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
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
