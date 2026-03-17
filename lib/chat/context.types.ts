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

export type HealthLinkLike = {
  fetchedAt?: DateLike;
  riskLevel?: unknown;
  headline?: unknown;
  summary?: unknown;
  highlights?: unknown;
  nextSteps?: unknown;
  topMedicines?: unknown;
  topConditions?: unknown;
  recentMedications?: unknown;
  metricInsights?: unknown;
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
  healthLink?: HealthLinkLike | null;
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
  healthLink: {
    fetchedAt: string;
    riskLevel: "low" | "medium" | "high" | "unknown";
    headline: string;
    summary: string;
    highlights: string[];
    nextSteps: string[];
    topMedicines: string[];
    topConditions: string[];
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
  explainability: {
    confidenceLabel: string;
    confidenceNote: string;
    fitReasons: string[];
    uncertaintyNotes: string[];
    pharmacistReviewPoints: string[];
  };
  safetyEscalation: {
    level: "routine" | "watch" | "escalate";
    badgeLabel: string;
    headline: string;
    reasonLines: string[];
    needsMoreInfo: string[];
    cautiousExpressionGuide: string[];
    requiresPharmacistReview: boolean;
  };
  consultationImpact: {
    stage:
      | "early_exploration"
      | "ready_to_buy"
      | "stalled_in_consult"
      | "needs_narrowing"
      | "retention_ready";
    headline: string;
    insight: string;
    evidence: string[];
    learnedPattern: string;
    recommendedActionLabel: string;
    recommendedActionHref: string;
    draftPrompt: string;
  };
  dataAsset: {
    stage: "light" | "forming" | "compounding" | "follow_through";
    strengthLabel: string;
    headline: string;
    summary: string;
    sourceLabels: string[];
    repeatedThemes: string[];
    adoptedThemes: string[];
    opportunityThemes: string[];
    reasonLines: string[];
    recommendedActionHint: string;
  };
  journeySegment: {
    id:
      | "starter_explorer"
      | "goal_driven_builder"
      | "guided_decider"
      | "steady_maintainer"
      | "drifting_returner"
      | "safety_first_manager";
    label: string;
    headline: string;
    summary: string;
    helper: string;
    reasonLines: string[];
    homeOrder: Array<"segment" | "focus" | "personalized" | "comeback">;
    exploreOrder: Array<
      "router" | "segment" | "focus" | "education" | "comeback" | "nextBest"
    >;
    chatPrompt: string;
  };
  contextCardLines: string[];
  promptSummaryText: string;
};

export const SUMMARY_VERSION = "chat-context-v1" as const;
