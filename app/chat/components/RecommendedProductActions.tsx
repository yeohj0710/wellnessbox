"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RecommendationLine = {
  category: string;
  productName: string;
  sourcePrice: number | null;
};

type ProductNameItem = {
  id: number;
  name: string;
};

type CartProductItem = {
  id: number;
  name: string;
  images: string[];
  pharmacyProducts: Array<{
    price: number | null;
    optionType: string | null;
    capacity: string | null;
    stock: number | null;
  }>;
};

type ActionableRecommendation = {
  category: string;
  productId: number;
  productName: string;
  optionType: string;
  capacity: string | null;
  packagePrice: number;
  sevenDayPrice: number;
  sourcePrice: number | null;
};

let productNameCatalogPromise: Promise<ProductNameItem[]> | null = null;
const recommendationResolveCache = new Map<
  string,
  Promise<ActionableRecommendation[]>
>();

function normalizeKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .trim();
}

function toKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function extractDayCount(value: string | null | undefined) {
  if (!value) return null;
  const direct = value.match(/(\d+(?:\.\d+)?)\s*일/);
  if (direct) {
    const parsed = Number.parseFloat(direct[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const packageLike = value.match(/(\d+(?:\.\d+)?)\s*(정|캡슐|포|회|개)/);
  if (packageLike) {
    const parsed = Number.parseFloat(packageLike[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 365) return parsed;
  }
  return null;
}

function isExact7DayOption(optionType: string | null, capacity: string | null) {
  const option = optionType || "";
  const cap = capacity || "";
  if (/7\s*일/.test(option) || /7\s*일/.test(cap)) return true;
  if (extractDayCount(option) === 7) return true;
  if (extractDayCount(cap) === 7) return true;
  return false;
}

function toSevenDayPrice(option: {
  price: number;
  optionType: string | null;
  capacity: string | null;
}) {
  const days =
    extractDayCount(option.optionType) ?? extractDayCount(option.capacity) ?? null;
  if (!days) return option.price;
  return Math.max(1, Math.round((option.price / days) * 7));
}

function parseRecommendationLines(content: string): RecommendationLine[] {
  if (!content) return [];
  const start = content.search(/추천 제품\s*\(7일 기준 가격\)/i);
  if (start < 0) return [];

  const section = content.slice(start).split(/\r?\n/).slice(1);
  const out: RecommendationLine[] = [];

  for (const rawLine of section) {
    const cleaned = rawLine
      .replace(/^\s*[-*]\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    if (!cleaned) continue;

    if (
      out.length > 0 &&
      /^(이렇게|추가 질문|추가로|원하시면|궁금한 점|참고|다음)/.test(cleaned)
    ) {
      break;
    }

    const row = cleaned.match(/^([^:：]{1,40})\s*[:：]\s*(.+)$/);
    if (!row) continue;

    const category = row[1].trim();
    const detail = row[2].trim();
    const sourcePriceMatch = detail.match(/([\d,]+)\s*원/);
    const sourcePrice = sourcePriceMatch
      ? Number.parseInt(sourcePriceMatch[1].replace(/,/g, ""), 10)
      : null;

    const productName = detail
      .replace(/\([\d,\s]*원[^)]*\)\s*$/g, "")
      .trim()
      .replace(/\s{2,}/g, " ");

    if (!productName) continue;
    out.push({ category, productName, sourcePrice });
  }

  const deduped: RecommendationLine[] = [];
  const seen = new Set<string>();
  for (const item of out) {
    const key = `${normalizeKey(item.category)}:${normalizeKey(item.productName)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 6);
}

async function fetchProductNameCatalog() {
  if (productNameCatalogPromise) return productNameCatalogPromise;
  productNameCatalogPromise = fetch("/api/product/names", {
    method: "GET",
    cache: "no-store",
  })
    .then((response) => response.json().catch(() => ({})))
    .then((json) =>
      Array.isArray(json?.products)
        ? json.products
            .map((item: any) => ({
              id: Number(item?.id),
              name: typeof item?.name === "string" ? item.name.trim() : "",
            }))
            .filter((item: ProductNameItem) => Number.isFinite(item.id) && item.name)
        : []
    )
    .catch(() => []);
  return productNameCatalogPromise;
}

function scoreNameMatch(targetNorm: string, candidateNorm: string) {
  if (!targetNorm || !candidateNorm) return -1;
  if (targetNorm === candidateNorm) return 10_000;

  let score = 0;
  if (candidateNorm.includes(targetNorm)) {
    score += 6_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }
  if (targetNorm.includes(candidateNorm)) {
    score += 4_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }

  const maxPrefix = Math.min(targetNorm.length, candidateNorm.length, 12);
  let prefix = 0;
  while (prefix < maxPrefix && targetNorm[prefix] === candidateNorm[prefix]) {
    prefix += 1;
  }
  score += prefix * 50;
  return score;
}

function findBestProductIdByName(
  productName: string,
  catalog: ProductNameItem[]
) {
  const targetNorm = normalizeKey(productName);
  if (!targetNorm) return null;

  let best: { id: number; score: number } | null = null;
  for (const item of catalog) {
    const score = scoreNameMatch(targetNorm, normalizeKey(item.name));
    if (score < 0) continue;
    if (!best || score > best.score) {
      best = { id: item.id, score };
    }
  }
  if (!best || best.score < 1_000) return null;
  return best.id;
}

async function fetchCartProducts(ids: number[]) {
  const response = await fetch("/api/cart-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.products) ? (json.products as CartProductItem[]) : [];
}

function pickBestCartOption(product: CartProductItem) {
  const options = Array.isArray(product?.pharmacyProducts)
    ? product.pharmacyProducts
        .map((item) => ({
          price: typeof item?.price === "number" ? item.price : null,
          optionType:
            typeof item?.optionType === "string" ? item.optionType.trim() : null,
          capacity: typeof item?.capacity === "string" ? item.capacity.trim() : null,
          stock: typeof item?.stock === "number" ? item.stock : 0,
        }))
        .filter((item) => item.price != null && item.price > 0 && item.stock > 0)
        .filter((item) => Boolean(item.optionType))
    : [];

  if (!options.length) return null;

  const exact7 = options
    .filter((item) => isExact7DayOption(item.optionType, item.capacity))
    .sort((left, right) => (left.price as number) - (right.price as number))[0];

  if (exact7) {
    return {
      optionType: exact7.optionType as string,
      capacity: exact7.capacity,
      packagePrice: exact7.price as number,
      sevenDayPrice: exact7.price as number,
    };
  }

  const cheapest = [...options].sort(
    (left, right) => (left.price as number) - (right.price as number)
  )[0];

  return {
    optionType: cheapest.optionType as string,
    capacity: cheapest.capacity,
    packagePrice: cheapest.price as number,
    sevenDayPrice: toSevenDayPrice({
      price: cheapest.price as number,
      optionType: cheapest.optionType,
      capacity: cheapest.capacity,
    }),
  };
}

async function resolveRecommendations(lines: RecommendationLine[]) {
  if (!lines.length) return [];

  const key = lines
    .map((item) => `${normalizeKey(item.category)}:${normalizeKey(item.productName)}`)
    .join("|");
  if (!key) return [];

  const cached = recommendationResolveCache.get(key);
  if (cached) return cached;

  const pending = (async () => {
    const catalog = await fetchProductNameCatalog();
    if (!catalog.length) return [];

    const lineMatches = lines
      .map((line) => ({
        line,
        productId: findBestProductIdByName(line.productName, catalog),
      }))
      .filter(
        (
          item
        ): item is { line: RecommendationLine; productId: number } =>
          typeof item.productId === "number"
      );

    if (!lineMatches.length) return [];

    const ids = Array.from(new Set(lineMatches.map((item) => item.productId)));
    const products = await fetchCartProducts(ids);
    const productById = new Map(products.map((item) => [item.id, item]));

    const out: ActionableRecommendation[] = [];
    for (const { line, productId } of lineMatches) {
      const product = productById.get(productId);
      if (!product || !product.name) continue;
      const option = pickBestCartOption(product);
      if (!option) continue;

      out.push({
        category: line.category,
        productId: product.id,
        productName: product.name,
        optionType: option.optionType,
        capacity: option.capacity,
        packagePrice: option.packagePrice,
        sevenDayPrice: option.sevenDayPrice,
        sourcePrice: line.sourcePrice,
      });
    }

    const deduped: ActionableRecommendation[] = [];
    const seen = new Set<string>();
    for (const item of out) {
      const k = `${item.productId}:${normalizeKey(item.optionType)}`;
      if (!k || seen.has(k)) continue;
      seen.add(k);
      deduped.push(item);
    }

    return deduped.slice(0, 6);
  })();

  recommendationResolveCache.set(key, pending);
  return pending;
}

function updateCartItems(items: ActionableRecommendation[]) {
  if (typeof window === "undefined") return;
  let cart: any[] = [];
  try {
    const raw = localStorage.getItem("cartItems");
    const parsed = raw ? JSON.parse(raw) : [];
    cart = Array.isArray(parsed) ? parsed : [];
  } catch {
    cart = [];
  }

  for (const item of items) {
    const existing = cart.find(
      (cartItem) =>
        cartItem?.productId === item.productId &&
        cartItem?.optionType === item.optionType
    );

    if (existing) {
      const prevQty = Number(existing.quantity) || 0;
      existing.quantity = Math.max(1, prevQty + 1);
    } else {
      cart.push({
        productId: item.productId,
        productName: item.productName,
        optionType: item.optionType,
        quantity: 1,
      });
    }
  }

  localStorage.setItem("cartItems", JSON.stringify(cart));
  window.dispatchEvent(new Event("cartUpdated"));
}

export default function RecommendedProductActions({ content }: { content: string }) {
  const router = useRouter();
  const parsed = useMemo(() => parseRecommendationLines(content || ""), [content]);
  const [items, setItems] = useState<ActionableRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    let alive = true;

    if (!parsed.length) {
      setItems([]);
      return;
    }

    setLoading(true);
    resolveRecommendations(parsed)
      .then((resolved) => {
        if (!alive) return;
        setItems(resolved);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [parsed]);

  if (!parsed.length) return null;
  if (!loading && items.length === 0) return null;

  const addSingle = (item: ActionableRecommendation) => {
    const ok = window.confirm(`'${item.productName}'을 장바구니에 담을까요?`);
    if (!ok) return;
    updateCartItems([item]);
    setFeedback(`장바구니에 담았어요: ${item.productName}`);
  };

  const addAll = () => {
    if (!items.length) return;
    const ok = window.confirm(`추천 제품 ${items.length}개를 장바구니에 담을까요?`);
    if (!ok) return;
    updateCartItems(items);
    setFeedback(`추천 제품 ${items.length}개를 장바구니에 담았어요.`);
  };

  const buyNow = (targets: ActionableRecommendation[]) => {
    if (!targets.length) return;
    updateCartItems(targets);
    router.push("/?cart=open#home-products");
  };

  return (
    <div className="mt-2 ms-2 w-full max-w-[86%] sm:max-w-[74%] md:max-w-[70%] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-700">
          추천 제품 빠른 실행
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={addAll}
            disabled={loading || items.length === 0}
            className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            전체 담기
          </button>
          <button
            type="button"
            onClick={() => buyNow(items)}
            disabled={loading || items.length === 0}
            className="rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            전체 바로 구매
          </button>
        </div>
      </div>

      {feedback ? (
        <p className="mt-1 text-[11px] text-emerald-600">{feedback}</p>
      ) : null}

      <div className="mt-2 space-y-1.5">
        {loading
          ? parsed.map((item, index) => (
              <div
                key={`${normalizeKey(item.category)}-${normalizeKey(
                  item.productName
                )}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <p className="text-[11px] font-medium text-slate-500">
                  {item.category}
                </p>
                <p className="line-clamp-1 text-[12px] font-semibold text-slate-900">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {typeof item.sourcePrice === "number"
                    ? `7일 기준 ${toKrw(item.sourcePrice)}`
                    : "7일 기준 가격 확인"}
                </p>
                <div className="mt-1.5 h-6 w-28 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))
          : items.map((item, index) => (
              <div
                key={`${normalizeKey(item.category)}-${normalizeKey(
                  item.productName
                )}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <p className="text-[11px] font-medium text-slate-500">
                  {item.category}
                </p>
                <p className="line-clamp-1 text-[12px] font-semibold text-slate-900">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {typeof item.sourcePrice === "number"
                    ? `7일 기준 ${toKrw(item.sourcePrice)}`
                    : `7일 기준 ${toKrw(item.sevenDayPrice)}`}
                  {` · 패키지 ${toKrw(item.packagePrice)}`}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  옵션: {item.optionType}
                  {item.capacity ? ` (${item.capacity})` : ""}
                </p>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addSingle(item)}
                    className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-white"
                  >
                    확인 후 담기
                  </button>
                  <button
                    type="button"
                    onClick={() => buyNow([item])}
                    className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-black"
                  >
                    바로 구매
                  </button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
