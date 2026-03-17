import type { ChatSession, UserProfile } from "@/types/chat";

export type DateLike = string | number | Date | null;

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

export type NormalizedHealthLinkSummary = {
  fetchedAt: DateLike;
  riskLevel: "low" | "medium" | "high" | "unknown";
  headline: string;
  summary: string;
  highlights: string[];
  nextSteps: string[];
  metricInsights: Array<{
    metric: string;
    value: string;
    interpretation: string;
    tip: string;
  }>;
  topMedicines: Array<{ label: string; count: number }>;
  topConditions: Array<{ label: string; count: number }>;
  recentMedications: Array<{
    date: string;
    medicine: string;
    effect: string | null;
  }>;
};

export type NormalizedAllResults = {
  actor: {
    loggedIn: boolean;
    appUserId: string | null;
    phoneLinked: boolean;
  } | null;
  profile: UserProfile | null;
  assessResult: NormalizedAssessResult | null;
  checkAiResult: NormalizedCheckAiResult | null;
  healthLink: NormalizedHealthLinkSummary | null;
  orders: NormalizedOrderSummary[];
  chatSessions: ChatSession[];
};
