import * as webpush from "web-push";
import db from "@/lib/db";
import { ORDER_STATUS } from "./order/orderStatus";

webpush.setVapidDetails(
  "mailto:example@wellnessbox.local",
  (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim(),
  (process.env.VAPID_PRIVATE_KEY || "").trim()
);

export async function saveSubscription(orderId: number, sub: any) {
  return db.subscription.create({
    data: {
      endpoint: sub.endpoint,
      auth: sub.keys?.auth || "",
      p256dh: sub.keys?.p256dh || "",
      orderId,
    },
  });
}

export async function removeSubscription(endpoint: string, orderId?: number) {
  return db.subscription.deleteMany({
    where: { endpoint, ...(orderId ? { orderId } : {}) },
  });
}

export async function isSubscribed(orderId: number, endpoint: string) {
  const sub = await db.subscription.findFirst({
    where: { orderId, endpoint },
  });
  return !!sub;
}

export async function sendOrderNotification(orderId: number, status: string) {
  const subs = await db.subscription.findMany({ where: { orderId } });
  if (subs.length === 0) return;
  let message = "";
  switch (status) {
    case ORDER_STATUS.PAYMENT_COMPLETE:
      message =
        "결제가 완료되었어요. '내 주문 조회하기'에서 상담을 진행하실 수 있어요.";
      break;
    case ORDER_STATUS.COUNSEL_COMPLETE:
      message = "약사님이 영양제를 조제 중이에요. 안전하게 조제해 드릴게요.";
      break;
    case ORDER_STATUS.DISPENSE_COMPLETE:
      message = "영양제 조제가 완료되었어요. 배송이 시작되면 알려드릴게요.";
      break;
    case ORDER_STATUS.PICKUP_COMPLETE:
      message = "영양제가 출발했어요. 안전하게 배송해 드릴게요.";
      break;
    case ORDER_STATUS.DELIVERY_COMPLETE:
      message = "주문하신 영양제가 도착했어요. 건강하게 챙겨 드세요!";
      break;
    case ORDER_STATUS.CANCELED:
      message = "주문이 취소되었어요.";
      break;
    default:
      message = `주문 상태가 업데이트되었어요: ${status}`;
  }
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    } as any;
    try {
      const payload = JSON.stringify({ title: "웰니스박스", body: message });
      await webpush.sendNotification(pushSub, payload);
    } catch (err: any) {
      if (
        err?.statusCode === 403 ||
        err?.statusCode === 404 ||
        err?.statusCode === 410
      ) {
        await removeSubscription(sub.endpoint);
      }
    }
  }
}
