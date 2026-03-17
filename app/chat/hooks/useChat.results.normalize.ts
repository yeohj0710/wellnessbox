import { formatAssessCat } from "../utils";
import { CHECK_AI_RESULT_STORAGE_KEY } from "@/lib/checkai-client";
import type { ChatSession, UserProfile } from "@/types/chat";
import type {
  DateLike,
  NormalizedAllResults,
  NormalizedAnswer,
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedHealthLinkSummary,
  NormalizedOrderSummary,
} from "./useChat.results.types";

type JsonRecord = Record<string, unknown>;

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

function asRiskLevel(
  value: unknown
): "low" | "medium" | "high" | "unknown" {
  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "unknown"
    ? value
    : "unknown";
}

function asStringOrUndefined(value: unknown) {
  const text = asString(value);
  return text || undefined;
}

function asBooleanOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asSex(value: unknown): UserProfile["sex"] | undefined {
  return value === "male" || value === "female" || value === "other"
    ? value
    : undefined;
}

function parseUserProfile(value: unknown): UserProfile | null {
  const profile = asRecord(value);
  if (!profile) return null;

  const parsed: UserProfile = {
    name: asStringOrUndefined(profile.name),
    age: asNumber(profile.age),
    sex: asSex(profile.sex),
    heightCm: asNumber(profile.heightCm),
    weightKg: asNumber(profile.weightKg),
    conditions: asStringArray(profile.conditions),
    medications: asStringArray(profile.medications),
    allergies: asStringArray(profile.allergies),
    goals: asStringArray(profile.goals),
    dietaryRestrictions: asStringArray(profile.dietaryRestrictions),
    pregnantOrBreastfeeding: asBooleanOrUndefined(
      profile.pregnantOrBreastfeeding
    ),
    caffeineSensitivity: asBooleanOrUndefined(profile.caffeineSensitivity),
  };

  const hasAnyValue = Object.values(parsed).some((entry) => {
    if (Array.isArray(entry)) return entry.length > 0;
    return entry !== undefined;
  });

  return hasAnyValue ? parsed : null;
}

function parseChatSessions(value: unknown): ChatSession[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const session = asRecord(entry);
      if (!session) return null;

      const id = asString(session.id);
      const title = asString(session.title) || "상담";
      if (!id) return null;

      const messages = Array.isArray(session.messages)
        ? session.messages
            .map((messageEntry, messageIndex) => {
              const message = asRecord(messageEntry);
              if (!message) return null;
              const role = message.role;
              const content = asString(message.content);
              if (
                (role !== "user" && role !== "assistant" && role !== "system") ||
                !content
              ) {
                return null;
              }
              return {
                id: `${id}-message-${messageIndex}`,
                role,
                content,
                createdAt: 0,
              };
            })
            .filter(
              (
                item
              ): item is ChatSession["messages"][number] => item !== null
            )
        : [];

      const updatedAt = asDateLike(session.updatedAt);
      const updatedAtNumber =
        updatedAt instanceof Date
          ? updatedAt.getTime()
          : typeof updatedAt === "number"
            ? updatedAt
            : typeof updatedAt === "string"
              ? Date.parse(updatedAt)
              : Date.now();
      const safeUpdatedAt = Number.isFinite(updatedAtNumber)
        ? updatedAtNumber
        : Date.now();

      return {
        id,
        title,
        createdAt: safeUpdatedAt,
        updatedAt: safeUpdatedAt,
        messages,
      };
    })
    .filter((session): session is ChatSession => session !== null);
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

function parseAssessResult(root: JsonRecord): NormalizedAssessResult | null {
  const assess = asRecord(root.assess);
  const assessNormalized = asRecord(assess?.normalized);
  const assessTopLabels = asStringArray(assessNormalized?.topLabels);

  return assessTopLabels.length > 0
    ? {
        createdAt: asDateLike(assess?.createdAt),
        summary: assessTopLabels.map((category) => formatAssessCat(category)),
        answers: parseAnswers(assess?.answersDetailed),
      }
    : null;
}

function parseCheckAiResult(root: JsonRecord): NormalizedCheckAiResult | null {
  const checkAi = asRecord(root.checkAi);
  const checkAiNormalized = asRecord(checkAi?.normalized);
  const checkAiTopLabels = asStringArray(checkAiNormalized?.topLabels).slice(0, 3);

  return checkAiTopLabels.length > 0
    ? {
        createdAt: asDateLike(checkAi?.createdAt),
        labels: checkAiTopLabels,
        answers: parseAnswers(checkAi?.answersDetailed),
      }
    : null;
}

function parseHealthLinkSummary(root: JsonRecord): NormalizedHealthLinkSummary | null {
  const healthLinkRaw = asRecord(root.healthLink);

  return healthLinkRaw &&
    (asString(healthLinkRaw.headline) ||
      asString(healthLinkRaw.summary) ||
      asStringArray(healthLinkRaw.highlights).length > 0 ||
      asStringArray(healthLinkRaw.nextSteps).length > 0 ||
      (Array.isArray(healthLinkRaw.topMedicines) &&
        healthLinkRaw.topMedicines.length > 0) ||
      (Array.isArray(healthLinkRaw.topConditions) &&
        healthLinkRaw.topConditions.length > 0))
    ? {
        fetchedAt: asDateLike(healthLinkRaw.fetchedAt),
        riskLevel: asRiskLevel(healthLinkRaw.riskLevel),
        headline: asString(healthLinkRaw.headline),
        summary: asString(healthLinkRaw.summary),
        highlights: asStringArray(healthLinkRaw.highlights).slice(0, 4),
        nextSteps: asStringArray(healthLinkRaw.nextSteps).slice(0, 4),
        metricInsights: Array.isArray(healthLinkRaw.metricInsights)
          ? healthLinkRaw.metricInsights
              .map((entry) => {
                const item = asRecord(entry);
                if (!item) return null;
                const metric = asString(item.metric);
                const value = asString(item.value);
                if (!metric || !value) return null;
                return {
                  metric,
                  value,
                  interpretation: asString(item.interpretation),
                  tip: asString(item.tip),
                };
              })
              .filter(
                (
                  entry
                ): entry is {
                  metric: string;
                  value: string;
                  interpretation: string;
                  tip: string;
                } => !!entry
              )
              .slice(0, 4)
          : [],
        topMedicines: Array.isArray(healthLinkRaw.topMedicines)
          ? healthLinkRaw.topMedicines
              .map((entry) => {
                const item = asRecord(entry);
                const label = asString(item?.label);
                const count = asNumber(item?.count);
                if (!label || count == null) return null;
                return { label, count };
              })
              .filter((entry): entry is { label: string; count: number } => !!entry)
              .slice(0, 5)
          : [],
        topConditions: Array.isArray(healthLinkRaw.topConditions)
          ? healthLinkRaw.topConditions
              .map((entry) => {
                const item = asRecord(entry);
                const label = asString(item?.label);
                const count = asNumber(item?.count);
                if (!label || count == null) return null;
                return { label, count };
              })
              .filter((entry): entry is { label: string; count: number } => !!entry)
              .slice(0, 5)
          : [],
        recentMedications: Array.isArray(healthLinkRaw.recentMedications)
          ? healthLinkRaw.recentMedications
              .map((entry) => {
                const item = asRecord(entry);
                const date = asString(item?.date);
                const medicine = asString(item?.medicine);
                if (!date || !medicine) return null;
                return {
                  date,
                  medicine,
                  effect: asString(item?.effect) || null,
                };
              })
              .filter(
                (
                  entry
                ): entry is {
                  date: string;
                  medicine: string;
                  effect: string | null;
                } => !!entry
              )
              .slice(0, 3)
          : [],
      }
    : null;
}

function parseOrders(root: JsonRecord): NormalizedOrderSummary[] {
  return Array.isArray(root.orders)
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
  const root = asRecord(data) ?? {};
  const actorRaw = asRecord(root.actor);

  const actor = actorRaw
    ? {
        loggedIn: !!actorRaw.loggedIn,
        appUserId:
          typeof actorRaw.appUserId === "string" ? actorRaw.appUserId : null,
        phoneLinked: !!actorRaw.phoneLinked,
      }
    : null;

  return {
    actor,
    profile: parseUserProfile(root.profile),
    assessResult: parseAssessResult(root),
    checkAiResult: parseCheckAiResult(root),
    healthLink: parseHealthLinkSummary(root),
    orders: parseOrders(root),
    chatSessions: parseChatSessions(root.chatSessions),
  };
}
