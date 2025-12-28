// Query operations related to orders
"use server";
import db from "@/lib/db";
import { normalizePhone } from "@/lib/otp";
import { ORDER_STATUS, OrderStatus } from "./orderStatus";

export async function checkOrderExists(phone: string, password: string) {
  const exists = await db.order.findFirst({
    where: { phone, password },
    select: { id: true },
  });
  return !!exists;
}

const basicOrderSelection = {
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
};

async function getPaginatedOrders(
  where: Parameters<typeof db.order.findMany>[0]["where"],
  page = 1,
  take = 10
) {
  const [totalCount, orders] = await db.$transaction([
    db.order.count({ where }),
    db.order.findMany({
      where,
      select: basicOrderSelection,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / take);
  return { orders, totalPages };
}

export async function getOrdersWithItemsAndStatus(
  phone: string,
  password: string
) {
  const orders = await db.order.findMany({
    where: { phone, password },
    select: basicOrderSelection,
    orderBy: { createdAt: "desc" },
  });
  if (orders.length === 0) {
    throw new Error("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
  }
  return orders;
}

export async function getOrdersWithItemsAndStatusPaginated(
  phone: string,
  password: string,
  page = 1,
  take = 10
) {
  const result = await getPaginatedOrders({ phone, password }, page, take);
  if (result.totalPages === 0) {
    throw new Error("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
  }
  return result;
}

export async function getOrdersWithItemsByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const digitsOnly = normalizedPhone.replace(/\D/g, "");

  const formattedWithHyphens = (() => {
    if (digitsOnly.length === 10) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
    if (digitsOnly.length === 11) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
    }
    return "";
  })();

  const phoneCandidates = Array.from(
    new Set(
      [phone, normalizedPhone, formattedWithHyphens].filter(
        (value) => value && value.trim().length > 0
      )
    )
  );

  const orders = await db.order.findMany({
    where: {
      OR: phoneCandidates.map((candidate) => ({ phone: candidate })),
    },
    select: basicOrderSelection,
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    throw new Error("연동된 전화번호로 조회된 주문이 없습니다.");
  }

  return orders;
}

export async function getOrdersWithItemsByPhonePaginated(
  phone: string,
  page = 1,
  take = 10
) {
  const normalizedPhone = normalizePhone(phone);
  const digitsOnly = normalizedPhone.replace(/\D/g, "");

  const formattedWithHyphens = (() => {
    if (digitsOnly.length === 10) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
    if (digitsOnly.length === 11) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
    }
    return "";
  })();

  const phoneCandidates = Array.from(
    new Set(
      [phone, normalizedPhone, formattedWithHyphens].filter(
        (value) => value && value.trim().length > 0
      )
    )
  );

  if (phoneCandidates.length === 0) {
    throw new Error("연동된 전화번호로 조회된 주문이 없습니다.");
  }

  const result = await getPaginatedOrders(
    { OR: phoneCandidates.map((candidate) => ({ phone: candidate })) },
    page,
    take
  );

  if (result.totalPages === 0) {
    throw new Error("연동된 전화번호로 조회된 주문이 없습니다.");
  }

  return result;
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

export async function getBasicOrdersByPharmacy(
  pharmacyId: number,
  page = 1,
  take = 10
): Promise<{ orders: any[]; totalPages: number }> {
  const [totalCount, orders] = await db.$transaction([
    db.order.count({ where: { pharmacyId } }),
    db.order.findMany({
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
      orderBy: { id: "desc" },
      skip: (page - 1) * take,
      take,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / take);
  return { orders, totalPages };
}

export async function getBasicOrdersByRider(
  page = 1,
  take = 10
): Promise<{ orders: any[]; totalPages: number }> {
  const where = {
    NOT: [
      { status: ORDER_STATUS.PAYMENT_COMPLETE },
      { status: ORDER_STATUS.COUNSEL_COMPLETE },
      { status: ORDER_STATUS.CANCELED },
    ],
  };

  const [totalCount, orders] = await db.$transaction([
    db.order.count({ where }),
    db.order.findMany({
      where,
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
      orderBy: { id: "desc" },
      skip: (page - 1) * take,
      take,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / take);
  return { orders, totalPages };
}

export async function getOrderByPaymentId(paymentId: string) {
  return await db.order.findFirst({
    where: { paymentId },
    include: {
      pharmacy: true,
      orderItems: {
        include: {
          pharmacyProduct: {
            select: {
              optionType: true,
              price: true,
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
}

export async function getOrdersByEndpoint(endpoint: string) {
  return await db.order.findMany({
    where: { endpoint },
    select: { id: true, status: true, totalPrice: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
