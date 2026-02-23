import { formatAssessCat } from "../utils";
import { CHECK_AI_RESULT_STORAGE_KEY } from "@/lib/checkai-client";

type DateLike = string | number | Date | null;
type JsonRecord = Record<string, unknown>;

export type NormalizedAnswer = {
  question: string;
  answer: string | number;
};

export type NormalizedAssessResult = {
  createdAt: DateLike;
  summary: string[];
  answers: NormalizedAnswer[];
};

export type NormalizedCheckAiResult = {
  createdAt: DateLike;
  labels: string[];
  answers: NormalizedAnswer[];
};

export type NormalizedOrderSummary = {
  id: number | string | null;
  status: string;
  createdAt: DateLike;
  updatedAt: DateLike;
  items: Array<{
    name: string;
    quantity?: number;
  }>;
};

export type NormalizedAllResults = {
  actor: {
    loggedIn: boolean;
    appUserId: string | null;
    phoneLinked: boolean;
  } | null;
  assessResult: NormalizedAssessResult | null;
  checkAiResult: NormalizedCheckAiResult | null;
  orders: NormalizedOrderSummary[];
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asDateLike(value: unknown): DateLike {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return value;
  return null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asString(entry)).filter(Boolean);
}

function parseAnswers(value: unknown): NormalizedAnswer[] {
  if (!Array.isArray(value)) return [];

  const out: NormalizedAnswer[] = [];

  for (const entry of value) {
    const answer = asRecord(entry);
    if (!answer) continue;

    const question = asString(answer.question);
    if (!question) continue;

    const answerLabel = asString(answer.answerLabel);
    if (answerLabel) {
      out.push({
        question,
        answer: answerLabel,
      });
      continue;
    }

    const answerNumber = asNumber(answer.answer);
    if (answerNumber != null) {
      out.push({
        question,
        answer: answerNumber,
      });
      continue;
    }

    out.push({
      question,
      answer: asString(answer.answer),
    });
  }

  return out;
}

function parseOrderItems(value: unknown): NormalizedOrderSummary["items"] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const item = asRecord(entry);
    const pharmacyProduct = asRecord(item?.pharmacyProduct);
    const product = asRecord(pharmacyProduct?.product);

    return {
      name: asString(product?.name) || "상품",
      quantity: asNumber(item?.quantity),
    };
  });
}

export function readLocalCheckAiTopLabels() {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(CHECK_AI_RESULT_STORAGE_KEY)
        : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const labels = Array.isArray(parsed?.topLabels)
      ? parsed.topLabels.slice(0, 3)
      : [];
    return labels;
  } catch {
    return [];
  }
}

export function readLocalAssessCats() {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("assess-state")
        : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const cats = Array.isArray(parsed?.cResult?.catsOrdered)
      ? parsed.cResult.catsOrdered.slice(0, 3)
      : [];
    return cats;
  } catch {
    return [];
  }
}

export function normalizeAllResultsPayload(data: unknown): NormalizedAllResults {
  const root = asRecord(data);
  const actorRaw = asRecord(root?.actor);

  const actor = actorRaw
    ? {
        loggedIn: !!actorRaw.loggedIn,
        appUserId:
          typeof actorRaw.appUserId === "string" ? actorRaw.appUserId : null,
        phoneLinked: !!actorRaw.phoneLinked,
      }
    : null;

  const assess = asRecord(root?.assess);
  const assessNormalized = asRecord(assess?.normalized);
  const assessTopLabels = asStringArray(assessNormalized?.topLabels);
  const assessResult: NormalizedAssessResult | null =
    assessTopLabels.length > 0
      ? {
          createdAt: asDateLike(assess?.createdAt),
          summary: assessTopLabels.map((category) => formatAssessCat(category)),
          answers: parseAnswers(assess?.answersDetailed),
        }
      : null;

  const checkAi = asRecord(root?.checkAi);
  const checkAiNormalized = asRecord(checkAi?.normalized);
  const checkAiTopLabels = asStringArray(checkAiNormalized?.topLabels).slice(0, 3);
  const checkAiResult: NormalizedCheckAiResult | null =
    checkAiTopLabels.length > 0
      ? {
          createdAt: asDateLike(checkAi?.createdAt),
          labels: checkAiTopLabels,
          answers: parseAnswers(checkAi?.answersDetailed),
        }
      : null;

  const orders = Array.isArray(root?.orders)
    ? root.orders
        .map((entry) => {
          const order = asRecord(entry);
          if (!order) return null;

          const idRaw = order.id;
          const id =
            typeof idRaw === "number" || typeof idRaw === "string" ? idRaw : null;

          return {
            id,
            status: asString(order.status),
            createdAt: asDateLike(order.createdAt),
            updatedAt: asDateLike(order.updatedAt),
            items: parseOrderItems(order.orderItems),
          };
        })
        .filter((entry): entry is NormalizedOrderSummary => !!entry)
    : [];

  return { actor, assessResult, checkAiResult, orders };
}
