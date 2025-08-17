import * as webpush from "web-push";
import db from "@/lib/db";
import { ORDER_STATUS } from "./order/orderStatus";

webpush.setVapidDetails(
  "mailto:example@wellnessbox.local",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
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

export async function removeSubscription(endpoint: string) {
  return db.subscription.deleteMany({ where: { endpoint } });
}

export async function sendOrderNotification(orderId: number, status: string) {
  const subs = await db.subscription.findMany({ where: { orderId } });
  if (subs.length === 0) return;
  let message = "";
  switch (status) {
    case ORDER_STATUS.COUNSEL_COMPLETE:
      message = "상담이 완료되었습니다.";
      break;
    case ORDER_STATUS.DISPENSE_COMPLETE:
      message = "조제가 완료되었습니다.";
      break;
    case ORDER_STATUS.PICKUP_COMPLETE:
      message = "배송이 시작되었습니다.";
      break;
    case ORDER_STATUS.DELIVERY_COMPLETE:
      message = "배송이 완료되었습니다.";
      break;
    case ORDER_STATUS.CANCELED:
      message = "주문이 취소되었습니다.";
      break;
    default:
      message = `주문 상태가 업데이트되었습니다: ${status}`;
  }
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    } as any;
    try {
      const payload = JSON.stringify({ title: "웰니스박스", body: message });
      const res = await webpush.sendNotification(pushSub, payload);
      console.log("push ok", sub.endpoint, res);
    } catch (err: any) {
      console.error("push fail", sub.endpoint, err?.statusCode, err?.body);
    }
  }
}
