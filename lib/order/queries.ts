"use server";

import db from "@/lib/db";
import { normalizePhone } from "@/lib/otp";
import { ORDER_STATUS } from "./orderStatus";
import type { Prisma } from "@prisma/client";

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
        select: { rate: true },
      },
    },
  },
};

const basicOperatorOrderSelection = {
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
} satisfies Prisma.OrderSelect;

type BasicOperatorOrder = Prisma.OrderGetPayload<{
  select: typeof basicOperatorOrderSelection;
}>;

type BasicOperatorOrderPage = {
  orders: BasicOperatorOrder[];
  totalPages: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_TAKE = 10;
const MAX_TAKE = 100;

function normalizePagination(page = DEFAULT_PAGE, take = DEFAULT_TAKE) {
  const safePage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const safeTakeRaw =
    Number.isFinite(take) && take > 0 ? Math.floor(take) : DEFAULT_TAKE;
  const safeTake = Math.min(safeTakeRaw, MAX_TAKE);
  return { page: safePage, take: safeTake };
}

function formatPhoneWithHyphens(digitsOnly: string) {
  if (digitsOnly.length === 10) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(
      3,
      6
    )}-${digitsOnly.slice(6)}`;
  }
  if (digitsOnly.length === 11) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(
      3,
      7
    )}-${digitsOnly.slice(7)}`;
  }
  return "";
}

function buildPhoneCandidates(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const digitsOnly = normalizedPhone.replace(/\D/g, "");
  const formattedWithHyphens = formatPhoneWithHyphens(digitsOnly);

  return Array.from(
    new Set(
      [phone, normalizedPhone, formattedWithHyphens].filter(
        (value): value is string => !!value && value.trim().length > 0
      )
    )
  );
}

async function getPaginatedOrders(
  where: Prisma.OrderWhereInput,
  page = DEFAULT_PAGE,
  take = DEFAULT_TAKE
) {
  const pagination = normalizePagination(page, take);
  const safePage = pagination.page;
  const safeTake = pagination.take;
  const skip = (safePage - 1) * safeTake;

  if (safePage === 1) {
    const rows = await db.order.findMany({
      where,
      select: basicOrderSelection,
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: safeTake + 1,
    });

    const hasNextPage = rows.length > safeTake;
    const orders = hasNextPage ? rows.slice(0, safeTake) : rows;

    if (!hasNextPage) {
      return { orders, totalPages: orders.length > 0 ? 1 : 0 };
    }

    const totalCount = await db.order.count({ where });
    return {
      orders,
      totalPages: Math.ceil(totalCount / safeTake),
    };
  }

  const [totalCount, orders] = await db.$transaction([
    db.order.count({ where }),
    db.order.findMany({
      where,
      select: basicOrderSelection,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeTake,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / safeTake);
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
  page = DEFAULT_PAGE,
  take = DEFAULT_TAKE
) {
  const result = await getPaginatedOrders({ phone, password }, page, take);
  if (result.totalPages === 0) {
    throw new Error("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
  }
  return result;
}

export async function getOrdersWithItemsByPhone(phone: string) {
  const phoneCandidates = buildPhoneCandidates(phone);

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
  page = DEFAULT_PAGE,
  take = DEFAULT_TAKE
) {
  const phoneCandidates = buildPhoneCandidates(phone);

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
                  categories: { select: { name: true } },
                },
              },
            },
          },
          review: { select: { rate: true, content: true } },
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
          review: { select: { rate: true, content: true } },
          pharmacyProduct: {
            select: {
              productId: true,
              optionType: true,
              product: { select: { name: true, images: true } },
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
  page = DEFAULT_PAGE,
  take = DEFAULT_TAKE
): Promise<BasicOperatorOrderPage> {
  const pagination = normalizePagination(page, take);
  const safePage = pagination.page;
  const safeTake = pagination.take;
  const [totalCount, orders] = await db.$transaction([
    db.order.count({ where: { pharmacyId } }),
    db.order.findMany({
      where: { pharmacyId },
      select: basicOperatorOrderSelection,
      orderBy: { id: "desc" },
      skip: (safePage - 1) * safeTake,
      take: safeTake,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / safeTake);
  return { orders, totalPages };
}

export async function getBasicOrdersByRider(
  page = DEFAULT_PAGE,
  take = DEFAULT_TAKE
): Promise<BasicOperatorOrderPage> {
  const pagination = normalizePagination(page, take);
  const safePage = pagination.page;
  const safeTake = pagination.take;
  const where: Prisma.OrderWhereInput = {
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
      select: basicOperatorOrderSelection,
      orderBy: { id: "desc" },
      skip: (safePage - 1) * safeTake,
      take: safeTake,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / safeTake);
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
