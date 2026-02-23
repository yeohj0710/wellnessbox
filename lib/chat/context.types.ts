import type { ChatSession, UserProfile } from "@/types/chat";

export type DateLike = string | number | Date | null | undefined;

export type MessageLike = {
  role?: string | null;
  content?: unknown;
};

export type OrderLike = {
  id?: string | number | null;
  status?: string | null;
  createdAt?: DateLike;
  updatedAt?: DateLike;
  items?: unknown[];
  orderItems?: unknown[];
};

export type AssessLike = {
  createdAt?: DateLike;
  summary?: unknown;
  answers?: unknown;
  normalized?: {
    topLabels?: unknown;
    scores?: Array<{ label?: unknown; value?: unknown }>;
  };
};

export type CheckAiLike = {
  createdAt?: DateLike;
  labels?: unknown;
  answers?: unknown;
  normalized?: {
    topLabels?: unknown;
  };
};

export type ConsultationLike = {
  id?: string | null;
  title?: string | null;
  updatedAt?: DateLike;
  messages?: MessageLike[];
};

export type UserContextSummaryInput = {
  profile?: UserProfile | null;
  orders?: OrderLike[] | null;
  assessResult?: AssessLike | null;
  checkAiResult?: CheckAiLike | null;
  chatSessions?: ConsultationLike[] | ChatSession[] | null;
  currentSessionId?: string | null;
  localAssessCats?: string[] | null;
  localCheckAiTopLabels?: string[] | null;
  actorContext?: {
    loggedIn?: boolean | null;
    phoneLinked?: boolean | null;
  } | null;
};

export type UserContextSummary = {
  version: "chat-context-v1";
  hasAnyData: boolean;
  evidenceLabels: string[];
  missingData: string[];
  profile: {
    sexAge: string;
    goals: string[];
    constraints: string[];
    conditions: string[];
    medications: string[];
    allergies: string[];
  } | null;
  recentOrders: Array<{
    orderedAt: string;
    status: string;
    items: string[];
  }>;
  latestAssess: {
    testedAt: string;
    findings: string[];
  } | null;
  latestQuick: {
    testedAt: string;
    findings: string[];
  } | null;
  previousConsultations: Array<{
    title: string;
    updatedAt: string;
    userPoint: string;
    assistantPoint: string;
  }>;
  actorContext: {
    loggedIn: boolean;
    phoneLinked: boolean;
  } | null;
  recommendedNutrients: string[];
  notableResponses: Array<{
    source: "정밀 검사" | "빠른 검사";
    question: string;
    answer: string;
    signal: "주의" | "보호" | "생활";
  }>;
  contextCardLines: string[];
  promptSummaryText: string;
};

export const SUMMARY_VERSION = "chat-context-v1" as const;
