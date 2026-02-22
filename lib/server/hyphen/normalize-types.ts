import type { HyphenApiResponse } from "@/lib/server/hyphen/client";

export type JsonRecord = Record<string, unknown>;
export type JsonPrimitive = string | number | boolean | null;
export type NhisRow = Record<string, JsonPrimitive>;

export type NhisListSummary = {
  totalCount: number;
  recentLines: string[];
  peopleCount?: number;
  detailCount?: number;
};

export type NhisHealthAgeSummary = {
  healthAge: string | number | null;
  realAge: string | number | null;
  checkupDate: string | null;
  advice: string | null;
  riskFactorTable: unknown;
};

export type NhisCheckupSummary = {
  listCount: number;
  yearlyCount: number;
  overviewCount: number;
  yearCount: number;
  peopleCount: number;
  recentLines: string[];
};

export type NhisRecommendationSummary = {
  diagnosisTimeline: NhisRow[];
  medicationTimeline: NhisRow[];
  activeIngredients: string[];
  cautions: string[];
  checkupFindings: NhisRow[];
};

export type NormalizedNhisPayload = {
  medical: {
    list: NhisRow[];
    summary: NhisListSummary;
  };
  medication: {
    list: NhisRow[];
    summary: NhisListSummary;
  };
  checkup: {
    list: NhisRow[];
    yearly: NhisRow[];
    overview: NhisRow[];
    summary: NhisCheckupSummary;
  };
  healthAge: NhisHealthAgeSummary;
  recommendation: NhisRecommendationSummary;
};

export type NormalizeNhisPayloadInput = {
  medical: HyphenApiResponse;
  medication: HyphenApiResponse;
  checkupList: HyphenApiResponse[];
  checkupYearly: HyphenApiResponse[];
  checkupOverview: HyphenApiResponse;
  healthAge: HyphenApiResponse;
};
