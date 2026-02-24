"use client";

export type PreparedOrderItem = {
  pharmacyProductId: number;
  quantity: number;
};

export type PreparedOrderDraft = {
  roadAddress: string;
  detailAddress: string;
  phone: string;
  password: string;
  requestNotes: string;
  entrancePassword: string;
  directions: string;
  pharmacyId?: number;
  rawCartItems: unknown[];
  orderItems: PreparedOrderItem[];
};

type StoredCartItem = {
  pharmacyProductId?: number | string | null;
  productId?: number | string | null;
  optionType?: string | null;
  quantity?: number | string | null;
  count?: number | string | null;
};

type StoredProduct = {
  id?: number | string | null;
  pharmacyProducts?: Array<{
    id?: number | string | null;
    pharmacyId?: number | string | null;
    pharmacy?: { id?: number | string | null } | null;
    optionType?: string | null;
  }>;
};

export type PaymentContext = {
  paymentId: string;
  paymentMethod: string;
  impUid: string;
};

export type PaymentOutcome = {
  txId: string;
  totalPrice: number;
};

function parseStoredJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  if (!Number.isInteger(normalized)) return null;
  return normalized;
}

function resolvePharmacyProductId(
  cartItem: StoredCartItem,
  products: StoredProduct[],
  selectedPharmacyId: number
): number | undefined {
  const product = products.find((item) => Number(item?.id) === Number(cartItem.productId));
  if (!product) return undefined;
  const matched = product.pharmacyProducts?.find(
    (candidate) =>
      Number(candidate?.pharmacyId ?? candidate?.pharmacy?.id) ===
        selectedPharmacyId && candidate?.optionType === cartItem.optionType
  );
  const pharmacyProductId = toInteger(matched?.id);
  return pharmacyProductId != null && pharmacyProductId > 0
    ? pharmacyProductId
    : undefined;
}

function buildOrderItems(
  rawCartItems: StoredCartItem[],
  products: StoredProduct[],
  selectedPharmacyId: number
) {
  return rawCartItems
    .map((cartItem) => {
      const fallbackPharmacyProductId = resolvePharmacyProductId(
        cartItem,
        products,
        selectedPharmacyId
      );
      const pharmacyProductId = toInteger(
        cartItem.pharmacyProductId ?? fallbackPharmacyProductId
      );
      const quantity = toInteger(cartItem.quantity ?? cartItem.count ?? 1);
      return {
        pharmacyProductId:
          pharmacyProductId != null && pharmacyProductId > 0
            ? pharmacyProductId
            : undefined,
        quantity: quantity != null && quantity > 0 ? quantity : 1,
      };
    })
    .filter(
      (item): item is PreparedOrderItem =>
        typeof item.pharmacyProductId === "number"
    );
}

export function clearPaymentStorage() {
  localStorage.removeItem("paymentId");
  localStorage.removeItem("paymentMethod");
  localStorage.removeItem("impUid");
}

export function clearCheckoutProgressStorage() {
  localStorage.removeItem("cartBackup");
  localStorage.removeItem("restoreCartFromBackup");
  localStorage.removeItem("checkoutInProgress");
}

export function readPaymentContext(params: URLSearchParams): PaymentContext {
  let paymentId = localStorage.getItem("paymentId") || "";
  let paymentMethod = localStorage.getItem("paymentMethod") || "";
  let impUid = localStorage.getItem("impUid") || params.get("imp_uid") || "";

  if (impUid) {
    localStorage.setItem("impUid", impUid);
  }

  if (!paymentId) {
    paymentId = params.get("paymentId") || params.get("merchant_uid") || "";
    if (paymentId) {
      localStorage.setItem("paymentId", paymentId);
    }
  }

  if (!paymentMethod) {
    paymentMethod = params.get("method") || "";
    if (paymentMethod) {
      localStorage.setItem("paymentMethod", paymentMethod);
    }
  }

  return { paymentId, paymentMethod, impUid };
}

export function prepareOrderDraftFromStorage(): PreparedOrderDraft {
  const roadAddress = localStorage.getItem("roadAddress") || "";
  const detailAddress = localStorage.getItem("detailAddress") || "";
  const phone = `${localStorage.getItem("phonePart1") || ""}-${
    localStorage.getItem("phonePart2") || ""
  }-${localStorage.getItem("phonePart3") || ""}`;
  const password = localStorage.getItem("password") || "";
  const requestNotes = localStorage.getItem("requestNotes") || "";
  const entrancePassword = localStorage.getItem("entrancePassword") || "";
  const directions = localStorage.getItem("directions") || "";
  const selectedPharmacyId = Number(localStorage.getItem("selectedPharmacyId") || "0");
  const pharmacyId = selectedPharmacyId || undefined;

  const rawCartItems = parseStoredJson<StoredCartItem[]>(
    localStorage.getItem("cartItems"),
    []
  );
  const products = parseStoredJson<StoredProduct[]>(
    localStorage.getItem("products"),
    []
  );
  const orderItems = buildOrderItems(rawCartItems, products, selectedPharmacyId);

  return {
    roadAddress,
    detailAddress,
    phone,
    password,
    requestNotes,
    entrancePassword,
    directions,
    pharmacyId,
    rawCartItems,
    orderItems,
  };
}

export function resolvePaymentOutcome(
  paymentMethod: string,
  paymentInfo: any,
  paymentId: string,
  impUid: string
): PaymentOutcome | null {
  if (paymentMethod === "inicis") {
    const paymentResponse = paymentInfo?.response;
    if (!paymentResponse || paymentResponse.status !== "paid") {
      return null;
    }
    return {
      txId: impUid || paymentResponse.imp_uid || "",
      totalPrice: Number(paymentResponse.amount ?? 0),
    };
  }

  const transaction = paymentInfo?.response?.payment?.transactions?.[0];
  if (!transaction || transaction.status !== "PAID") {
    return null;
  }

  return {
    txId:
      paymentInfo?.response?.payment?.id ||
      transaction?.paymentId ||
      paymentId ||
      "",
    totalPrice: Number(
      transaction?.amount?.total ?? paymentInfo?.response?.payment?.amount?.total ?? 0
    ),
  };
}
