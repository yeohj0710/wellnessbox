import "server-only";

import type { Prisma } from "@prisma/client";

import db from "@/lib/db";
import { normalizePhone } from "@/lib/otp";

export const basicOrderSelection = {
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
} satisfies Prisma.OrderSelect;

export const basicOperatorOrderSelection = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  totalPrice: true,
  phone: true,
  endpoint: true,
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
          stock: true,
          product: { select: { name: true } },
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
  messages: {
    select: {
      id: true,
      orderId: true,
      pharmacyId: true,
      content: true,
      createdAt: true,
      timestamp: true,
    },
    orderBy: { id: "desc" as const },
    take: 4,
  },
  _count: {
    select: {
      messages: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type BasicOperatorOrder = Prisma.OrderGetPayload<{
  select: typeof basicOperatorOrderSelection;
}>;

export type BasicOperatorOrderPage = {
  orders: BasicOperatorOrder[];
  totalPages: number;
};

export const DEFAULT_ORDER_QUERY_PAGE = 1;
export const DEFAULT_ORDER_QUERY_TAKE = 10;
const MAX_ORDER_QUERY_TAKE = 100;

export function normalizeOrderQueryPagination(
  page = DEFAULT_ORDER_QUERY_PAGE,
  take = DEFAULT_ORDER_QUERY_TAKE
) {
  const safePage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_ORDER_QUERY_PAGE;
  const safeTakeRaw =
    Number.isFinite(take) && take > 0 ? Math.floor(take) : DEFAULT_ORDER_QUERY_TAKE;
  const safeTake = Math.min(safeTakeRaw, MAX_ORDER_QUERY_TAKE);
  return { page: safePage, take: safeTake };
}

function formatPhoneWithHyphens(digitsOnly: string) {
  if (digitsOnly.length === 10) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  if (digitsOnly.length === 11) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
  }
  return "";
}

export function buildOrderPhoneCandidates(phone: string) {
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

export async function getPaginatedOrderSummaries(
  where: Prisma.OrderWhereInput,
  page = DEFAULT_ORDER_QUERY_PAGE,
  take = DEFAULT_ORDER_QUERY_TAKE
) {
  const pagination = normalizeOrderQueryPagination(page, take);
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

export async function getBasicOperatorOrdersPage(
  where: Prisma.OrderWhereInput,
  page = DEFAULT_ORDER_QUERY_PAGE,
  take = DEFAULT_ORDER_QUERY_TAKE
): Promise<BasicOperatorOrderPage> {
  const pagination = normalizeOrderQueryPagination(page, take);
  const safePage = pagination.page;
  const safeTake = pagination.take;

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
