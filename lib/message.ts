"use server";

import db from "@/lib/db";
import {
  sendCustomerMessageNotification,
  sendPharmacyMessageNotification,
} from "@/lib/notification";
import { messageEvents } from "@/lib/events";

export async function createMessage(data: {
  orderId: number;
  content: string;
  pharmacyId?: number | null;
}) {
  if (!data.orderId || !data.content) {
    throw new Error("orderId와 content가 입력되지 않았습니다.");
  }
  const created = await db.message.create({
    data: {
      orderId: data.orderId,
      content: data.content,
      pharmacyId: data.pharmacyId || null,
      timestamp: new Date(),
    },
  });
  try {
    if (data.pharmacyId) {
      await sendCustomerMessageNotification(data.orderId, data.content);
    } else {
      await sendPharmacyMessageNotification(data.orderId, data.content);
    }
  } catch (e) {
    console.error(e);
  }
  messageEvents.emit(`message:${data.orderId}`, created);
  return created;
}

export async function getMessagesByOrder(orderId: number) {
  return await db.message.findMany({
    where: { orderId },
    orderBy: {
      timestamp: "asc",
    },
  });
}

export async function deleteMessage(messageId: number) {
  return await db.message.delete({
    where: { id: messageId },
  });
}
