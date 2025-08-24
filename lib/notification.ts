import * as webpush from "web-push";
import db from "@/lib/db";
import { ORDER_STATUS } from "./order/orderStatus";

webpush.setVapidDetails(
  "mailto:wellnessbox.me@gmail.com",
  (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim(),
  (process.env.VAPID_PRIVATE_KEY || "").trim()
);

export async function saveSubscription(
  orderId: number,
  sub: any,
  role: string
) {
  const auth = sub.keys?.auth || "";
  const p256dh = sub.keys?.p256dh || "";
  return db.subscription.upsert({
    where: {
      role_orderId_endpoint: { role, orderId, endpoint: sub.endpoint },
    },
    update: { auth, p256dh },
    create: { role, orderId, endpoint: sub.endpoint, auth, p256dh },
  });
}

export async function removeSubscription(
  endpoint: string,
  orderId: number,
  role: string
) {
  return db.subscription.deleteMany({
    where: { endpoint, orderId, role },
  });
}

export async function isSubscribed(
  orderId: number,
  endpoint: string,
  role: string
) {
  const sub = await db.subscription.findFirst({
    where: { orderId, endpoint, role },
  });
  return !!sub;
}

export async function savePharmacySubscription(pharmacyId: number, sub: any) {
  const auth = sub.keys?.auth || "";
  const p256dh = sub.keys?.p256dh || "";
  return db.subscription.upsert({
    where: {
      role_pharmacyId_endpoint: {
        role: "pharm",
        pharmacyId,
        endpoint: sub.endpoint,
      },
    },
    update: { auth, p256dh },
    create: {
      role: "pharm",
      pharmacyId,
      endpoint: sub.endpoint,
      auth,
      p256dh,
    },
  });
}

export async function removePharmacySubscription(
  endpoint: string,
  pharmacyId: number
) {
  return db.subscription.deleteMany({
    where: { endpoint, pharmacyId, role: "pharm" },
  });
}

export async function isPharmacySubscribed(
  pharmacyId: number,
  endpoint: string
) {
  const sub = await db.subscription.findFirst({
    where: { pharmacyId, endpoint, role: "pharm" },
  });
  return !!sub;
}

export async function saveRiderSubscription(riderId: number, sub: any) {
  const auth = sub.keys?.auth || "";
  const p256dh = sub.keys?.p256dh || "";
  return db.subscription.upsert({
    where: {
      role_riderId_endpoint: {
        role: "rider",
        riderId,
        endpoint: sub.endpoint,
      },
    },
    update: { auth, p256dh },
    create: {
      role: "rider",
      riderId,
      endpoint: sub.endpoint,
      auth,
      p256dh,
    },
  });
}

export async function removeRiderSubscription(endpoint: string, riderId: number) {
  return db.subscription.deleteMany({
    where: { endpoint, riderId, role: "rider" },
  });
}

export async function isRiderSubscribed(riderId: number, endpoint: string) {
  const sub = await db.subscription.findFirst({
    where: { riderId, endpoint, role: "rider" },
  });
  return !!sub;
}

export async function sendOrderNotification(
  orderId: number,
  status: string,
  image?: string
) {
  const subs = await db.subscription.findMany({
    where: { role: "customer", orderId },
  });
  if (subs.length === 0) return;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: { pharmacyProduct: { include: { product: true } } },
      },
    },
  });
  const firstItem = order?.orderItems[0]?.pharmacyProduct?.product;
  const firstName = firstItem?.name || "상품";
  const restCount = (order?.orderItems.length || 1) - 1;
  const productText =
    restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;
  const imageUrl = image || firstItem?.images?.[0];
  let message = "";
  switch (status) {
    case ORDER_STATUS.PAYMENT_COMPLETE:
      message = `'${productText}' 상품의 주문이 완료되었어요. '내 주문 조회하기'에서 상담을 진행하실 수 있어요.`;
      break;
    case ORDER_STATUS.COUNSEL_COMPLETE:
      message = `주문하신 '${productText}'의 조제가 시작되었어요. 안전하게 조제해 드릴게요.`;
      break;
    case ORDER_STATUS.DISPENSE_COMPLETE:
      message = `주문하신 '${productText}'의 조제가 완료되었어요. 배송이 시작되면 알려드릴게요.`;
      break;
    case ORDER_STATUS.PICKUP_COMPLETE:
      message = `주문하신 '${productText}' 상품이 출발했어요. 안전하게 배송해 드릴게요.`;
      break;
    case ORDER_STATUS.DELIVERY_COMPLETE:
      message = `주문하신 '${productText}' 상품이 도착했어요. 건강하게 챙겨 드세요!`;
      break;
    case ORDER_STATUS.CANCELED:
      message = `주문하신 '${productText}' 상품이 취소되었어요.`;
      break;
    default:
      message = `주문하신 '${productText}'의 상태가 업데이트되었어요: ${status}`;
  }
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    } as any;
    try {
      const payload = JSON.stringify({
        title: "웰니스박스",
        body: message,
        url: "/my-orders",
        image: imageUrl,
      });
      await webpush.sendNotification(pushSub, payload);
    } catch (err: any) {
      if (
        err?.statusCode === 403 ||
        err?.statusCode === 404 ||
        err?.statusCode === 410
      ) {
        await removeSubscription(sub.endpoint, orderId, "customer");
      }
    }
  }
}

export async function sendNewOrderNotification(orderId: number) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: { pharmacyProduct: { include: { product: true } } },
      },
    },
  });
  const pharmacyId = order?.pharmacyId;
  if (!order || !pharmacyId) return;
  const subs = await db.subscription.findMany({
    where: { pharmacyId, role: "pharm" },
  });
  if (subs.length === 0) return;
  const firstName =
    order.orderItems[0]?.pharmacyProduct?.product?.name || "상품";
  const restCount = order.orderItems.length - 1;
  const productText =
    restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;
  const phone = order.phone ? `\n전화번호: ${order.phone}` : "";
  const address = order.roadAddress
    ? `\n주소: ${order.roadAddress} ${order.detailAddress || ""}`
    : "";
  const imageUrl = order.orderItems[0]?.pharmacyProduct?.product?.images?.[0];
  const message = `'${productText}' 주문이 들어왔어요.${phone}${address}`;
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    } as any;
    try {
      const payload = JSON.stringify({
        title: "웰니스박스",
        body: message,
        url: "/pharm",
        icon: "/logo.png",
        image: imageUrl,
        actions: [{ action: "open", title: "주문 확인" }],
      });
      await webpush.sendNotification(pushSub, payload);
    } catch (err: any) {
      if (
        err?.statusCode === 403 ||
        err?.statusCode === 404 ||
        err?.statusCode === 410
      ) {
        await removePharmacySubscription(sub.endpoint, pharmacyId);
      }
    }
  }
}

export async function sendRiderNotification(orderId: number) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: { pharmacyProduct: { include: { product: true } } },
      },
    },
  });
  const riderId = order?.riderId;
  if (!order || !riderId) return;
  const subs = await db.subscription.findMany({
    where: { role: "rider", riderId },
  });
  if (subs.length === 0) return;
  const firstName =
    order.orderItems[0]?.pharmacyProduct?.product?.name || "상품";
  const restCount = order.orderItems.length - 1;
  const productText =
    restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;
  const phone = order.phone ? `\n전화번호: ${order.phone}` : "";
  const address = order.roadAddress
    ? `\n주소: ${order.roadAddress} ${order.detailAddress || ""}`
    : "";
  const imageUrl = order.orderItems[0]?.pharmacyProduct?.product?.images?.[0];
  const message = `'${productText}' 주문이 픽업 대기 중이에요.${phone}${address}`;
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    } as any;
    try {
      const payload = JSON.stringify({
        title: "웰니스박스",
        body: message,
        url: "/rider",
        icon: "/logo.png",
        image: imageUrl,
        actions: [{ action: "open", title: "주문 확인" }],
      });
      await webpush.sendNotification(pushSub, payload);
    } catch (err: any) {
      if (
        err?.statusCode === 403 ||
        err?.statusCode === 404 ||
        err?.statusCode === 410
      ) {
        await removeRiderSubscription(sub.endpoint, riderId);
      }
    }
  }
}

export async function sendPharmacyMessageNotification(
  orderId: number,
  content: string
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: { pharmacyProduct: { include: { product: true } } },
      },
    },
  });
  const pharmacyId = order?.pharmacyId;
  if (!order || !pharmacyId) return;
  const subs = await db.subscription.findMany({
    where: { pharmacyId, role: "pharm" },
  });
  if (subs.length === 0) return;
  const firstName =
    order.orderItems[0]?.pharmacyProduct?.product?.name || "상품";
  const restCount = order.orderItems.length - 1;
  const productText =
    restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;
  const phoneText = order.phone ? `${order.phone} ` : "";
  const message = `${phoneText}고객이 '${productText}' 주문에 대해 메시지를 보냈어요: ${content}`;
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    } as any;
    try {
      const payload = JSON.stringify({
        title: "웰니스박스",
        body: message,
        url: "/pharm",
        icon: "/logo.png",
      });
      await webpush.sendNotification(pushSub, payload);
    } catch (err: any) {
      if (
        err?.statusCode === 403 ||
        err?.statusCode === 404 ||
        err?.statusCode === 410
      ) {
        await removePharmacySubscription(sub.endpoint, pharmacyId);
      }
    }
  }
}

export async function sendCustomerMessageNotification(
  orderId: number,
  content: string
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      pharmacy: true,
      orderItems: {
        include: { pharmacyProduct: { include: { product: true } } },
      },
    },
  });
  if (!order) return;
  const subs = await db.subscription.findMany({
    where: { role: "customer", orderId },
  });
  if (subs.length === 0) return;
  const pharmacyName = order.pharmacy?.name || "약국";
  const message = `${pharmacyName}에서 약사님이 메시지를 보냈어요: ${content}`;
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    } as any;
    try {
      const payload = JSON.stringify({
        title: "웰니스박스",
        body: message,
        url: "/my-orders",
        icon: "/logo.png",
      });
      await webpush.sendNotification(pushSub, payload);
    } catch (err: any) {
      if (
        err?.statusCode === 403 ||
        err?.statusCode === 404 ||
        err?.statusCode === 410
      ) {
        await removeSubscription(sub.endpoint, orderId, "customer");
      }
    }
  }
}
