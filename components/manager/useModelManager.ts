"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

export type ChatModelOption = {
  id: string;
  label: string;
  family: string;
  description: string;
  inputUsdPer1M: number | null;
  outputUsdPer1M: number | null;
  relativeCostPercent: number | null;
  isLegacy?: boolean;
};

export type PricingReference = {
  baselineModel: string;
  baselineLabel: string;
  sourceUrl: string;
  updatedAt: string;
  note: string;
};

export type GovernanceTaskOption = {
  task: string;
  label: string;
  purpose: string;
  mode: "inherit" | "fixed" | "floor";
  fixedModel: string | null;
  floorModel: string | null;
};

export type GovernancePreviewItem = {
  task: string;
  label: string;
  purpose: string;
  configuredModel: string;
  resolvedModel: string;
  reasoning: string[];
};

export type UpdateModelResult =
  | { ok: true; appliedModel: string }
  | { ok: false; error: string };

type ModelApiResponse = {
  model: string;
  options?: ChatModelOption[];
  pricingReference?: PricingReference;
  governanceTasks?: GovernanceTaskOption[];
  governancePreview?: GovernancePreviewItem[];
};

export const MODEL_FAMILY_LABELS: Record<string, string> = {
  "gpt-5": "GPT-5 계열",
  "o-series": "추론 모델 (o-series)",
  "gpt-4.1": "GPT-4.1 계열",
  "gpt-4o": "GPT-4o 계열",
  legacy: "레거시 호환",
};

export function formatUsd(value: number | null) {
  if (value === null) return "정보 없음";
  return `$${value.toFixed(2)} / 1M tokens`;
}

export function formatRelativePercent(value: number | null) {
  if (value === null) return "가격 정보 없음";
  return `${value}%`;
}

export function describeGovernancePolicy(task: GovernanceTaskOption | undefined) {
  if (!task) return "기본 모델 그대로 사용";
  if (task.mode === "fixed" && task.fixedModel) {
    return `고정: ${task.fixedModel}`;
  }
  if (task.mode === "floor" && task.floorModel) {
    return `최소 기준: ${task.floorModel}`;
  }
  return "기본 모델 상속";
}

export function useModelManager() {
  const [current, setCurrent] = useState(DEFAULT_CHAT_MODEL);
  const [options, setOptions] = useState<ChatModelOption[]>([]);
  const [pricingReference, setPricingReference] = useState<PricingReference | null>(
    null
  );
  const [governanceTasks, setGovernanceTasks] = useState<GovernanceTaskOption[]>([]);
  const [governancePreview, setGovernancePreview] = useState<GovernancePreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/admin/model");
        if (!response.ok) {
          throw new Error("모델 설정을 불러오지 못했습니다.");
        }

        const payload = (await response.json()) as ModelApiResponse;
        if (!active) return;

        if (payload.model) setCurrent(payload.model);
        if (Array.isArray(payload.options)) setOptions(payload.options);
        if (payload.pricingReference) setPricingReference(payload.pricingReference);
        if (Array.isArray(payload.governanceTasks)) {
          setGovernanceTasks(payload.governanceTasks);
        }
        if (Array.isArray(payload.governancePreview)) {
          setGovernancePreview(payload.governancePreview);
        }
      } catch {
        if (!active) return;
        setError("모델 목록을 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const groupedOptions = useMemo(() => {
    const group = new Map<string, ChatModelOption[]>();
    for (const option of options) {
      const familyLabel = MODEL_FAMILY_LABELS[option.family] ?? option.family;
      const list = group.get(familyLabel) ?? [];
      list.push(option);
      group.set(familyLabel, list);
    }
    return Array.from(group.entries());
  }, [options]);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === current) ?? null,
    [current, options]
  );

  const governanceTaskMap = useMemo(
    () => new Map(governanceTasks.map((task) => [task.task, task])),
    [governanceTasks]
  );

  const updateModel = useCallback(async (value: string): Promise<UpdateModelResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: value }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "모델 변경에 실패했습니다.");
      }

      const payload = (await response.json()) as ModelApiResponse;
      const appliedModel = payload.model || value;
      setCurrent(appliedModel);
      if (Array.isArray(payload.governanceTasks)) {
        setGovernanceTasks(payload.governanceTasks);
      }
      if (Array.isArray(payload.governancePreview)) {
        setGovernancePreview(payload.governancePreview);
      }
      return { ok: true, appliedModel };
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "모델 변경에 실패했습니다. 다시 시도해 주세요.";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    current,
    options,
    pricingReference,
    governancePreview,
    governanceTaskMap,
    groupedOptions,
    selectedOption,
    loading,
    error,
    updateModel,
  };
}
