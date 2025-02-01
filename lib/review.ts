"use server";

import db from "@/lib/db";

export async function getReviewsByProductId(productId: number) {
  return await db.review_.findMany({
    where: { productId },
    select: {
      rate: true,
      content: true,
      images: true,
      createdAt: true,
      orderItem: {
        select: {
          quantity: true,
          pharmacyProduct: {
            select: {
              optionType: true,
              pharmacy: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      order: {
        select: {
          phone: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReviewExistsByOrderItemId(orderItemId: number) {
  return await db.review_.findFirst({
    where: { orderItemId },
    select: {
      rate: true,
    },
  });
}

export async function upsertReview(data: any) {
  return await db.review_.upsert({
    where: { orderItemId: data.orderItemId },
    update: { ...data, images: data.images || [] },
    create: { ...data, images: data.images || [] },
  });
}
