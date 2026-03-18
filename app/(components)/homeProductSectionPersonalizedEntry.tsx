"use client";

import { useEffect, useMemo, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { CODE_TO_LABEL } from "@/lib/categories";
import { HOME_PACKAGE_LABELS } from "./homeProductSection.copy";
import type { HomeCategory } from "./homeProductSection.types";

type PersonalizedSource = "assess" | "check-ai";

type PersonalizedEntryProps = {
  categories: HomeCategory[];
  selectedCategories: number[];
  selectedPackage: string;
  onApplyRecommendedCategories: (categoryIds: number[]) => void;
  onApplyRecommendedTrial: (categoryIds: number[]) => void;
};

type PersonalizedSignals = {
  matchedCategories: HomeCategory[];
  source: PersonalizedSource;
  riskLevel: "low" | "medium" | "high" | "unknown";
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function dedupeCategories(categories: HomeCategory[]) {
  const seen = new Set<number>();
  return categories.filter((category) => {
    if (seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  });
}

function resolveMatchedCategories(
  labels: string[],
  categories: HomeCategory[]
): HomeCategory[] {
  if (!labels.length || !categories.length) return [];

  const byName = new Map(
    categories.map((category) => [normalizeLabel(category.name), category])
  );

  return dedupeCategories(
    labels
      .map((label) => {
        const normalizedLabel = normalizeLabel(label);
        const directMatch = byName.get(normalizedLabel);
        if (directMatch) return directMatch;

        const mappedLabel = CODE_TO_LABEL[label] ?? label;
        return byName.get(normalizeLabel(mappedLabel)) ?? null;
      })
      .filter((category): category is HomeCategory => category !== null)
  ).slice(0, 3);
}

function parseSignals(
  payload: unknown,
  categories: HomeCategory[]
): PersonalizedSignals | null {
  const root = asRecord(payload);
  if (!root) return null;

  const assess = asRecord(root.assess);
  const assessNormalized = asRecord(assess?.normalized);
  const assessMatches = resolveMatchedCategories(
    asStringArray(assessNormalized?.topLabels),
    categories
  );

  const checkAi = asRecord(root.checkAi);
  const checkAiNormalized = asRecord(checkAi?.normalized);
  const checkAiMatches = resolveMatchedCategories(
    asStringArray(checkAiNormalized?.topLabels),
    categories
  );

  const healthLink = asRecord(root.healthLink);
  const riskLevel =
    healthLink?.riskLevel === "low" ||
    healthLink?.riskLevel === "medium" ||
    healthLink?.riskLevel === "high" ||
    healthLink?.riskLevel === "unknown"
      ? healthLink.riskLevel
      : "unknown";

  if (assessMatches.length > 0) {
    return {
      matchedCategories: assessMatches,
      source: "assess",
      riskLevel,
    };
  }

  if (checkAiMatches.length > 0) {
    return {
      matchedCategories: checkAiMatches,
      source: "check-ai",
      riskLevel,
    };
  }

  return null;
}

export default function HomeProductSectionPersonalizedEntry({
  categories,
  selectedCategories,
  selectedPackage,
  onApplyRecommendedCategories,
  onApplyRecommendedTrial,
}: PersonalizedEntryProps) {
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categories.length === 0) return;

    const controller = new AbortController();
    setLoading(true);

    fetch("/api/user/all-results", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPayload(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPayload(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [categories.length]);

  const signals = useMemo(
    () => parseSignals(payload, categories),
    [categories, payload]
  );

  if (loading || !signals) return null;
  if (selectedCategories.length > 0) return null;
  if (selectedPackage !== HOME_PACKAGE_LABELS.all) return null;

  const matchedCategoryIds = signals.matchedCategories.map(
    (category) => category.id
  );
  const categoryNames = signals.matchedCategories.map((category) => category.name);
  const headline =
    signals.source === "assess"
      ? "최근 검사 결과를 기준으로 먼저 보여드릴게요"
      : "최근 AI 추천을 기준으로 먼저 보여드릴게요";
  const description =
    signals.source === "assess"
      ? `지금 먼저 볼 만한 성분은 ${categoryNames.join(", ")}예요.`
      : `방금과 가장 잘 맞았던 성분은 ${categoryNames.join(", ")}예요.`;
  const trialDescription =
    signals.riskLevel === "high"
      ? "무리 없이 시작하려면 7일치부터 가볍게 비교해보세요."
      : "처음 구매라면 7일치 패키지로 부담 없이 시작할 수 있어요.";

  return (
    <section className="rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 shadow-[0_16px_36px_-28px_rgba(14,165,233,0.28)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm">
          <SparklesIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{headline}</p>
          <p className="mt-1 text-sm leading-6 text-gray-700">{description}</p>
          <p className="mt-2 text-xs text-gray-500">
            필터를 한 번에 맞춰드릴게요. 나중에 직접 바꿔도 괜찮아요.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {signals.matchedCategories.map((category) => (
          <span
            key={category.id}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100"
          >
            {category.name}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onApplyRecommendedCategories(matchedCategoryIds)}
          className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600"
        >
          맞춤 성분만 바로 보기
        </button>
        <button
          type="button"
          onClick={() => onApplyRecommendedTrial(matchedCategoryIds)}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50"
        >
          7일치부터 가볍게 시작하기
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-500">{trialDescription}</p>
    </section>
  );
}
