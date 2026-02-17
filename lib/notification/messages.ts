import db from "@/lib/db";
import { ORDER_STATUS } from "../order/orderStatus";
import { elapsedPushMs, pushLog, startPushTimer } from "@/lib/push/logging";
import {
  fetchActiveSubscriptions,
  getOrderPushSummary,
  sendPushFanout,
} from "./core";

export async function sendOrderNotification(
  orderId: number,
  status: string,
  image?: string
) {
  const startedAt = startPushTimer();
  const [subs, orderSummary] = await Promise.all([
    fetchActiveSubscriptions({ role: "customer", orderId }, "customer.order_status"),
    getOrderPushSummary(orderId),
  ]);
  if (subs.length === 0) return;

  const firstName = orderSummary?.firstProductName || "상품";
  const restCount = (orderSummary?.itemCount || 1) - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;
  const imageUrl = image || orderSummary?.firstProductImage || undefined;

  let message = "";
  switch (status) {
    case ORDER_STATUS.PAYMENT_COMPLETE:
      message = `'${productText}' 상품의 주문이 완료되었어요. '내 주문 조회'에서 상담을 진행하고 있어요.`;
      break;
    case ORDER_STATUS.COUNSEL_COMPLETE:
      message = `주문하신 '${productText}'의 조제가 시작되었어요. 안전하게 조제해드릴게요.`;
      break;
    case ORDER_STATUS.DISPENSE_COMPLETE:
      message = `주문하신 '${productText}'의 조제가 완료되었어요. 배송이 시작되면 알려드릴게요.`;
      break;
    case ORDER_STATUS.PICKUP_COMPLETE:
      message = `주문하신 '${productText}' 상품이 출발했어요. 안전하게 배송해드릴게요.`;
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

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/my-orders",
    image: imageUrl,
  });

  await sendPushFanout({
    label: "customer.order_status",
    role: "customer",
    eventKey: `order:${orderId}:customer:status:${status}`,
    target: { orderId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "customer.order_status",
    orderId,
    status,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendNewOrderNotification(orderId: number) {
  const startedAt = startPushTimer();
  const orderSummary = await getOrderPushSummary(orderId);

  const pharmacyId = orderSummary?.pharmacyId;
  if (!orderSummary || !pharmacyId) return;
  const subs = await fetchActiveSubscriptions(
    { pharmacyId, role: "pharm" },
    "pharm.new_order"
  );
  if (subs.length === 0) return;

  const firstName = orderSummary.firstProductName || "상품";
  const restCount = orderSummary.itemCount - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;

  const phone = orderSummary.phone ? `\n전화번호: ${orderSummary.phone}` : "";
  const address = orderSummary.roadAddress
    ? `\n주소: ${orderSummary.roadAddress} ${orderSummary.detailAddress || ""}`
    : "";

  const imageUrl = orderSummary.firstProductImage || undefined;
  const message = `'${productText}' 주문이 들어왔어요.${phone}${address}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/pharm",
    icon: "/logo.png",
    image: imageUrl,
    actions: [{ action: "open", title: "주문 확인" }],
  });

  await sendPushFanout({
    label: "pharm.new_order",
    role: "pharm",
    eventKey: `order:${orderId}:pharm:new_order`,
    target: { pharmacyId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "pharm.new_order",
    orderId,
    pharmacyId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendRiderNotification(orderId: number) {
  const startedAt = startPushTimer();
  const orderSummary = await getOrderPushSummary(orderId);

  const riderId = orderSummary?.riderId;
  if (!orderSummary || !riderId) return;

  const subs = await fetchActiveSubscriptions(
    { role: "rider", riderId },
    "rider.dispatch"
  );
  if (subs.length === 0) return;

  const firstName = orderSummary.firstProductName || "상품";
  const restCount = orderSummary.itemCount - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;

  const phone = orderSummary.phone ? `\n전화번호: ${orderSummary.phone}` : "";
  const address = orderSummary.roadAddress
    ? `\n주소: ${orderSummary.roadAddress} ${orderSummary.detailAddress || ""}`
    : "";

  const imageUrl = orderSummary.firstProductImage || undefined;
  const message = `'${productText}' 주문이 픽업 대기 중이에요.${phone}${address}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/rider",
    icon: "/logo.png",
    image: imageUrl,
    actions: [{ action: "open", title: "주문 확인" }],
  });

  await sendPushFanout({
    label: "rider.dispatch",
    role: "rider",
    eventKey: `order:${orderId}:rider:dispatch`,
    target: { riderId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "rider.dispatch",
    orderId,
    riderId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendPharmacyMessageNotification(
  orderId: number,
  content: string,
  eventKey?: string
) {
  const startedAt = startPushTimer();
  const orderSummary = await getOrderPushSummary(orderId);

  const pharmacyId = orderSummary?.pharmacyId;
  if (!orderSummary || !pharmacyId) return;

  const subs = await fetchActiveSubscriptions(
    { pharmacyId, role: "pharm" },
    "pharm.message"
  );
  if (subs.length === 0) return;

  const firstName = orderSummary.firstProductName || "상품";
  const restCount = orderSummary.itemCount - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;

  const phoneText = orderSummary.phone ? `${orderSummary.phone} ` : "";
  const message = `${phoneText}주문건 '${productText}' 주문에 대한 메시지를 보냈어요: ${content}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/pharm",
    icon: "/logo.png",
  });

  await sendPushFanout({
    label: "pharm.message",
    role: "pharm",
    eventKey: eventKey ?? `order:${orderId}:pharm:message:${content.slice(0, 32)}`,
    target: { pharmacyId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "pharm.message",
    orderId,
    pharmacyId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendCustomerMessageNotification(
  orderId: number,
  content: string,
  eventKey?: string
) {
  const startedAt = startPushTimer();
  const [order, subs] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      select: {
        pharmacy: {
          select: {
            name: true,
          },
        },
      },
    }),
    fetchActiveSubscriptions({ role: "customer", orderId }, "customer.message"),
  ]);

  if (!order) return;
  if (subs.length === 0) return;

  const pharmacyName = order.pharmacy?.name || "약국";
  const message = `${pharmacyName}에서 약사님이 메시지를 보냈어요: ${content}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/my-orders",
    icon: "/logo.png",
  });

  await sendPushFanout({
    label: "customer.message",
    role: "customer",
    eventKey:
      eventKey ??
      `order:${orderId}:customer:message:${content.slice(0, 32)}`,
    target: { orderId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "customer.message",
    orderId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}
