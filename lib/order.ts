"use server";

import db from "@/lib/db";

export async function getOrders() {
  return await db.order_.findMany({
    select: {
      idx: true,
      roadAddress: true,
      detailAddress: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      requestNotes: true,
      entrancePassword: true,
      directions: true,
      pharmacy: {
        select: {
          idx: true,
          name: true,
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
    select: {
      idx: true,
      roadAddress: true,
      detailAddress: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      requestNotes: true,
      entrancePassword: true,
      directions: true,
      pharmacy: {
        select: {
          idx: true,
          name: true,
        },
      },
    },
  });
}

export async function createOrder(data: {
  roadAddress?: string;
  detailAddress?: string;
  phone?: string;
  requestNotes?: string;
  entrancePassword?: string;
  directions?: string;
  pharmacyIdx?: number;
}) {
  return await db.order_.create({
    data: {
      roadAddress: data.roadAddress || null,
      detailAddress: data.detailAddress || null,
      phone: data.phone || null,
      requestNotes: data.requestNotes || null,
      entrancePassword: data.entrancePassword || null,
      directions: data.directions || null,
      pharmacyIdx: data.pharmacyIdx || null,
    },
  });
}

export async function updateOrder(
  orderIdx: number,
  data: {
    roadAddress?: string;
    detailAddress?: string;
    phone?: string;
    requestNotes?: string;
    entrancePassword?: string;
    directions?: string;
    pharmacyIdx?: number;
  }
) {
  return await db.order_.update({
    where: { idx: orderIdx },
    data: {
      roadAddress: data.roadAddress || null,
      detailAddress: data.detailAddress || null,
      phone: data.phone || null,
      requestNotes: data.requestNotes || null,
      entrancePassword: data.entrancePassword || null,
      directions: data.directions || null,
      pharmacyIdx: data.pharmacyIdx || null,
    },
  });
}

export async function deleteOrder(orderIdx: number) {
  return await db.order_.delete({
    where: { idx: orderIdx },
  });
}
