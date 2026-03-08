"use client";

import { useMemo } from "react";
import { labelOf } from "@/lib/categories";
import type { CategoryLite } from "@/lib/client/categories";
import type { CSectionResult } from "./components/CSection";
import { sectionA, sectionB } from "./data/questions";
import { resolveProgressMessage } from "./logic/progress-message";
import type { AssessSection } from "./useAssessFlow.types";

type UseAssessFlowDerivedStateParams = {
  section: AssessSection;
  answers: Record<string, any>;
  history: string[];
  current: string;
  cResult: CSectionResult | null;
  categories: CategoryLite[];
  cProgress: { step: number; total: number; pct: number };
};

export function useAssessFlowDerivedState({
  section,
  answers,
  history,
  current,
  cResult,
  categories,
  cProgress,
}: UseAssessFlowDerivedStateParams) {
  const cProgressMsg = resolveProgressMessage(cProgress.step, cProgress.total);

  const recommendedIds = useMemo(() => {
    if (!cResult || categories.length === 0) return [] as number[];
    const ids = cResult.catsOrdered
      .map((code) => categories.find((item) => item.name === labelOf(code))?.id)
      .filter((id): id is number => typeof id === "number");
    return Array.from(new Set(ids)).slice(0, 3);
  }, [cResult, categories]);

  const currentQuestion = useMemo(() => {
    if (section === "A") {
      return sectionA.find((question) => question.id === current);
    }
    if (section === "B") {
      return sectionB.find((question) => question.id === current);
    }
    return undefined;
  }, [current, section]);

  const { completion, answered, total } = useMemo(() => {
    const applicableIds =
      section === "A"
        ? sectionA
            .map((question) => question.id)
            .filter((id) => !(answers.A1 === "M" && id === "A5"))
        : sectionB
            .map((question) => question.id)
            .filter((id) => !(answers.A1 !== "F" && id === "B22"));
    const answeredSet = new Set(
      history.filter((id) => (section === "A" ? id.startsWith("A") : id.startsWith("B")))
    );
    const done = applicableIds.filter((id) => answeredSet.has(id)).length;
    const totalCount = applicableIds.length;
    return {
      completion: totalCount > 0 ? Math.round((done / totalCount) * 100) : 0,
      answered: done,
      total: totalCount,
    };
  }, [answers, history, section]);

  const progressMsg =
    section === "A" || section === "B" ? resolveProgressMessage(answered, total) : "";

  const sectionTitle = section === "A" ? "기초 건강 데이터" : "생활 습관·증상";

  return {
    cProgressMsg,
    recommendedIds,
    currentQuestion,
    completion,
    answered,
    total,
    progressMsg,
    sectionTitle,
  };
}
