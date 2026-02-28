export type ClientCartItem = {
  productId: number;
  productName: string;
  optionType: string;
  quantity: number;
};

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveInteger(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(1, Math.floor(parsed));
}

function normalizeCartItem(value: unknown): ClientCartItem | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const parsedProductId = Number(raw.productId);
  if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
    return null;
  }

  const optionType = toTrimmedString(raw.optionType);
  if (!optionType) return null;

  return {
    productId: Math.floor(parsedProductId),
    productName: toTrimmedString(raw.productName),
    optionType,
    quantity: toPositiveInteger(raw.quantity),
  };
}

function mergeIntoMap(map: Map<string, ClientCartItem>, item: ClientCartItem) {
  const key = `${item.productId}:${item.optionType}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { ...item });
    return;
  }

  existing.quantity = Math.max(1, existing.quantity + item.quantity);
  if (!existing.productName && item.productName) {
    existing.productName = item.productName;
  }
}

export function parseClientCartItems(value: unknown): ClientCartItem[] {
  if (!Array.isArray(value)) return [];

  const merged = new Map<string, ClientCartItem>();
  for (const entry of value) {
    const normalized = normalizeCartItem(entry);
    if (!normalized) continue;
    mergeIntoMap(merged, normalized);
  }
  return Array.from(merged.values());
}

export function buildClientCartSignature(items: unknown): string {
  const normalized = parseClientCartItems(items);
  if (normalized.length === 0) return "";

  return normalized
    .map((item) => `${item.productId}:${item.optionType}:${item.quantity}`)
    .sort()
    .join("|");
}

function getStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function readClientCartItems(storage?: Storage | null): ClientCartItem[] {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem("cartItems");
    if (!raw) return [];
    return parseClientCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeClientCartItems(
  items: unknown,
  storage?: Storage | null
): ClientCartItem[] {
  const normalized = parseClientCartItems(items);
  const targetStorage = getStorage(storage);
  if (targetStorage) {
    targetStorage.setItem("cartItems", JSON.stringify(normalized));
  }
  return normalized;
}

export function mergeClientCartItems(
  currentItems: unknown,
  additions: unknown
): ClientCartItem[] {
  const merged = new Map<string, ClientCartItem>();

  for (const item of parseClientCartItems(currentItems)) {
    mergeIntoMap(merged, item);
  }
  for (const item of parseClientCartItems(additions)) {
    mergeIntoMap(merged, item);
  }

  return Array.from(merged.values());
}
