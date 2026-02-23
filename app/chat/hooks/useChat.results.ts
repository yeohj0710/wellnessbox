import { formatAssessCat } from "../utils";
import { CHECK_AI_RESULT_STORAGE_KEY } from "@/lib/checkai-client";

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

export type NormalizedAllResults = {
  actor: {
    loggedIn: boolean;
    appUserId: string | null;
    phoneLinked: boolean;
  } | null;
  assessResult: any | null;
  checkAiResult: any | null;
  orders: any[];
};

export function normalizeAllResultsPayload(data: any): NormalizedAllResults {
  const actor = data?.actor
    ? {
        loggedIn: !!data.actor.loggedIn,
        appUserId: data.actor.appUserId ?? null,
        phoneLinked: !!data.actor.phoneLinked,
      }
    : null;

  const assess = data?.assess;
  const assessNormalized = assess?.normalized;
  const assessResult = Array.isArray(assessNormalized?.topLabels)
    ? {
        createdAt: assess.createdAt,
        summary: assessNormalized.topLabels.map((category: string) =>
          formatAssessCat(category)
        ),
        answers: Array.isArray(assess.answersDetailed)
          ? assess.answersDetailed.map((answer: any) => ({
              question: answer.question,
              answer: answer.answerLabel,
            }))
          : [],
      }
    : null;

  const checkAi = data?.checkAi;
  const checkAiNormalized = checkAi?.normalized;
  const checkAiResult = Array.isArray(checkAiNormalized?.topLabels)
    ? {
        createdAt: checkAi.createdAt,
        labels: checkAiNormalized.topLabels.slice(0, 3),
        answers: Array.isArray(checkAi?.answersDetailed)
          ? checkAi.answersDetailed.map((answer: any) => ({
              question: answer.question,
              answer: answer.answerLabel,
            }))
          : [],
      }
    : null;

  const orders = Array.isArray(data?.orders)
    ? data.orders.map((order: any) => ({
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: (order.orderItems || []).map((item: any) => ({
          name: item.pharmacyProduct?.product?.name || "상품",
          quantity: item.quantity,
        })),
      }))
    : [];

  return {
    actor,
    assessResult,
    checkAiResult,
    orders,
  };
}
