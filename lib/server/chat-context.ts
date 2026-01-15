import db from "@/lib/db";
import { CODE_TO_LABEL } from "@/lib/categories";
import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";
import type { RequestActor } from "@/lib/server/actor";

type AssessmentRecord = Awaited<
  ReturnType<typeof db.assessmentResult.findFirst>
>;
type CheckAiRecord = Awaited<ReturnType<typeof db.checkAiResult.findFirst>>;

type ChatAssessResult = {
  createdAt?: Date | null;
  summary: string[];
  answers: Array<{ question: string; answer: string }>;
};

type ChatCheckAiResult = {
  createdAt?: Date | null;
  labels: string[];
  answers: Array<{ question: string; answer: string }>;
};

type ChatOrderItem = { name: string; quantity: number | null };
type ChatOrder = {
  id: number;
  status: string;
  updatedAt?: Date | null;
  items: ChatOrderItem[];
};

export type ChatContextPayload = {
  profile?: any;
  assessResult?: ChatAssessResult | null;
  checkAiResult?: ChatCheckAiResult | null;
  orders: ChatOrder[];
};

type UserData = {
  profileRecord: Awaited<ReturnType<typeof db.userProfile.findUnique>> | null;
  assess: AssessmentRecord | null;
  checkAi: CheckAiRecord | null;
  orders: Array<{
    id: number;
    status: string;
    updatedAt?: Date | null;
    orderItems?: Array<{
      quantity: number;
      pharmacyProduct?: { product?: { name?: string | null } | null } | null;
    }>;
  }>;
};

function formatAssessLabel(code: string) {
  return CODE_TO_LABEL[code] || code;
}

function buildAssessChatResult(
  assess: AssessmentRecord | null
): ChatAssessResult | null {
  if (!assess) return null;
  const normalized = normalizeAssessmentResult(assess);
  if (!Array.isArray(normalized.topLabels) || normalized.topLabels.length === 0)
    return null;
  const scores = Array.isArray(normalized.scores)
    ? normalized.scores.map((score) => (score?.value ?? 0) as number)
    : [];
  const summary = normalized.topLabels.map(
    (label, i) => `${formatAssessLabel(label)} ${(scores[i] * 100).toFixed(1)}%`
  );
  const answers = Object.entries(assess.answers || {}).map(([id, val]) => {
    const q = normalized.questions.find((qq) => qq.id === id);
    let answerLabel = String(val);
    if (q?.type === "choice" && q.options) {
      const opt = q.options.find((o) => o.value === val);
      answerLabel = opt?.label ?? String(val);
    } else if (q?.type === "multi" && Array.isArray(val) && q.options) {
      answerLabel = val
        .map(
          (v: any) =>
            q.options?.find((o) => o.value === v)?.label ?? String(v)
        )
        .join(", ");
    }
    return {
      question: q?.text ?? id,
      answer: answerLabel,
    };
  });
  return {
    createdAt: assess.createdAt,
    summary,
    answers,
  };
}

function buildCheckAiChatResult(
  checkAi: CheckAiRecord | null
): ChatCheckAiResult | null {
  if (!checkAi) return null;
  const normalized = normalizeCheckAiResult(checkAi);
  if (!Array.isArray(normalized.topLabels) || normalized.topLabels.length === 0)
    return null;
  const labels = normalized.topLabels.slice(0, 3);
  const answers = Array.isArray(checkAi.answers)
    ? checkAi.answers.map((val: any, idx: number) => {
        const q = normalized.questions[idx];
        const opt = normalized.options.find((o) => o.value === val);
        return {
          question: q?.text ?? String(idx + 1),
          answer: opt?.label ?? String(val),
        };
      })
    : [];
  return {
    createdAt: checkAi.createdAt,
    labels,
    answers,
  };
}

function buildChatOrders(
  orders: UserData["orders"]
): ChatOrder[] {
  if (!Array.isArray(orders)) return [];
  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    updatedAt: order.updatedAt ?? null,
    items: Array.isArray(order.orderItems)
      ? order.orderItems.map((item) => ({
          name: item.pharmacyProduct?.product?.name || "상품",
          quantity: item.quantity ?? null,
        }))
      : [],
  }));
}

export async function getUserDataForActor(
  actor: RequestActor
): Promise<UserData> {
  const deviceClientId = actor.deviceClientId;
  const appUserId = actor.appUserId;
  const isKakaoLoggedIn = actor.loggedIn;

  const profileRecord = deviceClientId
    ? await db.userProfile.findUnique({ where: { clientId: deviceClientId } })
    : null;

  const resultScope = isKakaoLoggedIn
    ? appUserId
      ? { appUserId }
      : { id: "missing" }
    : deviceClientId
    ? { clientId: deviceClientId }
    : { id: "missing" };

  const orderScope = isKakaoLoggedIn
    ? actor.phoneLinked && appUserId
      ? { appUserId }
      : { id: -1 }
    : deviceClientId
    ? { endpoint: deviceClientId }
    : { id: -1 };

  const [assess, checkAi, orders] = await Promise.all([
    db.assessmentResult.findFirst({
      where: resultScope,
      orderBy: { createdAt: "desc" },
    }),
    db.checkAiResult.findFirst({
      where: resultScope,
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      where: orderScope,
      orderBy: { updatedAt: "desc" },
      include: {
        orderItems: {
          include: { pharmacyProduct: { include: { product: true } } },
        },
      },
    }),
  ]);

  return {
    profileRecord,
    assess,
    checkAi,
    orders,
  };
}

export function buildChatContextPayload(data: UserData): ChatContextPayload {
  return {
    profile: data.profileRecord?.data,
    assessResult: buildAssessChatResult(data.assess),
    checkAiResult: buildCheckAiChatResult(data.checkAi),
    orders: buildChatOrders(data.orders),
  };
}
