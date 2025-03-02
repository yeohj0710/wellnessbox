"use server";

import db from "@/lib/db";

export async function checkOrderExists(phone: string, password: string) {
  const exists = await db.order.findFirst({
    where: { phone, password },
    select: { id: true },
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
                select: {
                  name: true,
                },
              },
            },
          },
          review: {
            select: {
              rate: true,
              content: true,
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
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          review: {
            select: {
              rate: true,
              content: true,
            },
          },
        },
      },
      pharmacy: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
        },
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
            select: {
              rate: true,
              content: true,
            },
          },
          pharmacyProduct: {
            select: {
              productId: true,
              optionType: true,
              product: {
                select: {
                  name: true,
                  images: true,
                },
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
    select: {
      status: true,
    },
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
              product: {
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
}

export async function getBasicOrdersByRider() {
  return await db.order.findMany({
    where: {
      NOT: [
        { status: "결제 완료" },
        { status: "상담 완료" },
        { status: "주문 취소" },
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
              product: {
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
}

export async function updateOrderStatus(orderid: number, newStatus: string) {
  const updatedOrder = await db.order.update({
    where: { id: orderid },
    data: { status: newStatus },
  });
  return updatedOrder;
}

export async function getOrderByPaymentId(paymentId: string) {
  return await db.order.findFirst({
    where: { paymentId },
    select: {
      id: true,
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
  paymentId?: string;
  transactionType?: string;
  txId?: string;
  totalPrice?: number;
  status?: string;
  pharmacyId?: number;
  orderItems: { pharmacyProductId: number; quantity: number }[];
}) {
  const { orderItems, ...orderData } = data;
  return await db.order.create({
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
      },
    },
  });
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
    status?: string;
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
    await db.orderItem.deleteMany({
      where: { orderId: orderid },
    });
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
  await db.orderItem.deleteMany({
    where: { orderId: orderid },
  });

  return await db.order.delete({
    where: { id: orderid },
  });
}
