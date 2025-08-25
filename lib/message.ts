"use server";

import db from "@/lib/db";
import {
  sendCustomerMessageNotification,
  sendPharmacyMessageNotification,
} from "@/lib/notification";
import { messageEvents } from "@/lib/events";

export async function normalizeMessage(msg: any) {
  const created = msg.createdAt || msg.timestamp || new Date();
  return {
    id: msg.id,
    orderId: msg.orderId,
    pharmacyId: msg.pharmacyId ?? null,
    content: msg.content ?? "",
    createdAt: new Date(created).toISOString(),
    timestamp: msg.timestamp
      ? new Date(msg.timestamp).getTime()
      : new Date(created).getTime(),
  };
}

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
  const payload = await normalizeMessage(created);
  messageEvents.emit(`order:${data.orderId}`, payload);
  return payload;
}

export async function getMessagesByOrder(orderId: number) {
  const msgs = await db.message.findMany({
    where: { orderId },
    orderBy: { id: "asc" },
  });
  return Promise.all(msgs.map(normalizeMessage));
}

export async function deleteMessage(messageId: number) {
  return await db.message.delete({
    where: { id: messageId },
  });
}
