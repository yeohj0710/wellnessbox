"use client";

import { useCallback, useEffect, useState } from "react";
import { getClientIdLocal } from "@/app/chat/utils";
import { createOrder } from "@/lib/order/mutations";
import { getOrderByPaymentId } from "@/lib/order/queries";
import { ORDER_STATUS } from "@/lib/order/orderStatus";
import {
  clearCheckoutProgressStorage,
  clearPaymentStorage,
  isOrderCompleteCancelled,
  prepareOrderDraftFromStorage,
  readPaymentContext,
  resolvePaymentOutcome,
  validatePreparedOrderDraft,
} from "./orderCompleteFlow";
import {
  clearOrderCompleteCartStorage,
  restoreOrderCompleteCartBackup,
  syncOrderCompleteCustomerAccountKey,
} from "./orderComplete.client";
import { ORDER_COMPLETE_ALERT_COPY } from "./orderComplete.copy";
import type { OrderRecord } from "./orderComplete.types";

async function readPaymentInfoJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function readApiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error.trim() : null;
}

type UseOrderCompleteBootstrapOptions = {
  pushHome: () => void;
  openNotifyModal: () => void;
};

type UseOrderCompleteBootstrapResult = {
  order: OrderRecord | null;
  loading: boolean;
  cancelled: boolean;
  returnToCart: () => void;
};

export function useOrderCompleteBootstrap({
  pushHome,
  openNotifyModal,
}: UseOrderCompleteBootstrapOptions): UseOrderCompleteBootstrapResult {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);

  const returnToCart = useCallback(() => {
    restoreOrderCompleteCartBackup();
    pushHome();
  }, [pushHome]);

  const createOrderFromPaymentOutcome = useCallback(
    async (input: { paymentId: string; txId: string; totalPrice: number }) => {
      const draft = prepareOrderDraftFromStorage();
      const validation = validatePreparedOrderDraft(draft);

      if (validation === "empty_cart") {
        alert(ORDER_COMPLETE_ALERT_COPY.emptyCart);
        returnToCart();
        return;
      }

      if (validation === "missing_order_items") {
        alert(ORDER_COMPLETE_ALERT_COPY.missingSelectedOption);
        returnToCart();
        return;
      }

      const endpoint = getClientIdLocal();
      await createOrder({
        endpoint,
        roadAddress: draft.roadAddress,
        detailAddress: draft.detailAddress,
        phone: draft.phone,
        password: draft.password,
        requestNotes: draft.requestNotes,
        entrancePassword: draft.entrancePassword,
        directions: draft.directions,
        paymentId: input.paymentId,
        transactionType: "PAYMENT",
        txId: input.txId,
        totalPrice: input.totalPrice,
        status: ORDER_STATUS.PAYMENT_COMPLETE,
        pharmacyId: draft.pharmacyId,
        orderItems: draft.orderItems,
      });

      const fullOrder = await getOrderByPaymentId(input.paymentId);
      setOrder(fullOrder);
      openNotifyModal();
      clearOrderCompleteCartStorage();
      clearCheckoutProgressStorage();
      clearPaymentStorage();
    },
    [openNotifyModal, returnToCart]
  );

  useEffect(() => {
    if (!order) return;
    syncOrderCompleteCustomerAccountKey(order);
  }, [order]);

  useEffect(() => {
    if (!cancelled) return;
    clearPaymentStorage();
  }, [cancelled]);

  useEffect(() => {
    let active = true;

    const fetchOrder = async () => {
      let lockKey = "";
      let lockAcquired = false;
      try {
        const params = new URLSearchParams(window.location.search);
        if (isOrderCompleteCancelled(params)) {
          if (!active) return;
          setCancelled(true);
          localStorage.setItem("restoreCartFromBackup", "1");
          return;
        }

        const { paymentId, paymentMethod, impUid } = readPaymentContext(params);
        if (!paymentId) {
          alert(ORDER_COMPLETE_ALERT_COPY.missingPaymentInfo);
          localStorage.removeItem("impUid");
          returnToCart();
          return;
        }
        if (!paymentMethod) {
          alert(ORDER_COMPLETE_ALERT_COPY.missingPaymentMethod);
          clearPaymentStorage();
          returnToCart();
          return;
        }

        lockKey = `oc:lock:${paymentId}`;
        if (sessionStorage.getItem(lockKey)) {
          return;
        }

        sessionStorage.setItem(lockKey, "1");
        lockAcquired = true;

        const existingOrder = await getOrderByPaymentId(paymentId);
        if (!active) return;
        if (existingOrder) {
          setOrder(existingOrder);
          openNotifyModal();
          clearPaymentStorage();
          if (existingOrder.status === ORDER_STATUS.PAYMENT_COMPLETE) {
            clearOrderCompleteCartStorage();
          }
          return;
        }

        if (paymentMethod === "inicis" && !impUid) {
          alert(ORDER_COMPLETE_ALERT_COPY.missingPaymentInfo);
          returnToCart();
          return;
        }

        const response = await fetch("/api/get-payment-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: paymentMethod === "inicis" ? impUid : paymentId,
            paymentMethod,
          }),
        });
        const paymentInfo = await readPaymentInfoJson(response);
        if (!response.ok || !paymentInfo) {
          alert(
            readApiErrorMessage(paymentInfo) ??
              ORDER_COMPLETE_ALERT_COPY.paymentVerificationFailed
          );
          clearPaymentStorage();
          returnToCart();
          return;
        }

        const paymentOutcome = resolvePaymentOutcome(
          paymentMethod,
          paymentInfo,
          paymentId,
          impUid
        );
        if (!paymentOutcome) {
          alert(ORDER_COMPLETE_ALERT_COPY.paymentFailed);
          clearPaymentStorage();
          returnToCart();
          return;
        }

        await createOrderFromPaymentOutcome({
          paymentId,
          txId: paymentOutcome.txId,
          totalPrice: paymentOutcome.totalPrice,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        alert(`${ORDER_COMPLETE_ALERT_COPY.loadOrderFailedPrefix}${message}`);
      } finally {
        if (lockAcquired && lockKey) {
          sessionStorage.removeItem(lockKey);
        }
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchOrder();
    window.scrollTo(0, 0);

    return () => {
      active = false;
    };
  }, [createOrderFromPaymentOutcome, openNotifyModal, returnToCart]);

  return {
    order,
    loading,
    cancelled,
    returnToCart,
  };
}
