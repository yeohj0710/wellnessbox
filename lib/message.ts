"use server";

import db from "@/lib/db";

export async function createMessage(data: {
  orderId: number;
  content: string;
  pharmacyId?: number | null;
}) {
  if (!data.orderId || !data.content) {
    throw new Error("orderId와 content가 입력되지 않았습니다.");
  }
  return await db.message_.create({
    data: {
      orderId: data.orderId,
      content: data.content,
      pharmacyId: data.pharmacyId || null,
      timestamp: new Date(),
    },
  });
}

export async function getMessagesByOrder(orderId: number) {
  return await db.message_.findMany({
    where: { orderId },
    orderBy: {
      timestamp: "asc",
    },
  });
}

export async function deleteMessage(messageId: number) {
  return await db.message_.delete({
    where: { id: messageId },
  });
}
