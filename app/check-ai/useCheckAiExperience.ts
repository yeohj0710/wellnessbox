"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePersonalizedTrustSummary } from "@/components/common/usePersonalizedTrustSummary";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import { refreshClientIdCookieIfNeeded } from "@/lib/client-id";
import { fetchCategories, type CategoryLite } from "@/lib/client/categories";
import {
  CHECK_AI_QUESTIONS as QUESTIONS,
  CHECK_AI_OPTIONS as OPTIONS,
} from "@/lib/checkai";
import {
  type CheckAiClientScore,
  ensureMinimumDelay,
  persistCheckAiResult,
  requestCheckAiPredictScores,
  resolveRecommendedCategoryIds,
} from "@/lib/checkai-client";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";
import { resolveGuestMemberBridge } from "@/lib/member-bridge/engine";
import { getTzOffsetMinutes } from "@/lib/timezone";
import { getLoginStatus } from "@/lib/useLoginStatus";
import { resolvePersonalizedValueProposition } from "@/lib/value-proposition/engine";
import type { NormalizedCheckAiResult } from "@/app/chat/hooks/useChat.results";

const CHECK_AI_PROGRESS_STORAGE_KEY = "wb_check_ai_progress_v1";
const CHECK_AI_MIN_PREVIEW_ANSWERS = 4;

type CheckAiDraft = {
  answers: number[];
  savedAt: number;
};

function getApiUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}

function loadCheckAiDraft(): CheckAiDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CHECK_AI_PROGRESS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.answers)) return null;

    const answers = parsed.answers
      .map((value: unknown) =>
        typeof value === "number" && value >= 0 && value <= 5 ? value : 0
      )
      .slice(0, QUESTIONS.length);

    if (answers.length !== QUESTIONS.length) return null;

    return {
      answers,
      savedAt:
        typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function saveCheckAiDraft(answers: number[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CHECK_AI_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        answers,
        savedAt: Date.now(),
      })
    );
  } catch {}
}

function clearCheckAiDraft() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CHECK_AI_PROGRESS_STORAGE_KEY);
  } catch {}
}

function buildLocalCheckAiResult(
  answers: number[],
  results: CheckAiClientScore[]
): NormalizedCheckAiResult {
  const detailedAnswers: NormalizedCheckAiResult["answers"] = [];

  for (const [index, question] of QUESTIONS.entries()) {
    const value = answers[index];
    if (!value) continue;
    detailedAnswers.push({
      question,
      answer: OPTIONS.find((option) => option.value === value)?.label || value,
    });
  }

  return {
    createdAt: Date.now(),
    labels: results.map((item) => item.label),
    answers: detailedAnswers,
  };
}

type UseCheckAiExperienceParams = {
  showLoading: () => void;
};

export function useCheckAiExperience({
  showLoading,
}: UseCheckAiExperienceParams) {
  const [answers, setAnswers] = useState<number[]>(
    Array(QUESTIONS.length).fill(0)
  );
  const [results, setResults] = useState<CheckAiClientScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [animateBars, setAnimateBars] = useState(false);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [previewScores, setPreviewScores] = useState<CheckAiClientScore[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);
  const previewRequestIdRef = useRef(0);
  const previewScoresRef = useRef<CheckAiClientScore[]>([]);
  const resultModalDrag = useDraggableModal(modalOpen, { resetOnOpen: true });
  const deferredAnswers = useDeferredValue(answers);

  const answeredCount = useMemo(
    () => answers.filter((value) => value > 0).length,
    [answers]
  );
  const deferredAnsweredCount = useMemo(
    () => deferredAnswers.filter((value) => value > 0).length,
    [deferredAnswers]
  );
  const remainingCount = QUESTIONS.length - answeredCount;
  const isComplete = remainingCount === 0;
  const completion = useMemo(
    () => Math.round((answeredCount / QUESTIONS.length) * 100),
    [answeredCount]
  );
  const previewLabels = useMemo(
    () => previewScores.slice(0, 2).map((score) => score.label),
    [previewScores]
  );

  useEffect(() => {
    refreshClientIdCookieIfNeeded();
    const draft = loadCheckAiDraft();
    if (!draft) return;

    if (draft.answers.some((value) => value > 0)) {
      setAnswers(draft.answers);
      setDraftRestored(true);
    }
  }, []);

  useChatPageActionListener((detail) => {
    if (detail.action !== "focus_check_ai_form") return;

    document
      .getElementById("check-ai-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, []);

  const recommendedIds = useMemo(
    () => resolveRecommendedCategoryIds(results, categories),
    [results, categories]
  );
  const trustCheckAiResult = useMemo(
    () => (results ? buildLocalCheckAiResult(answers, results) : null),
    [answers, results]
  );
  const trustSummary = usePersonalizedTrustSummary({
    enabled: answeredCount > 0 || modalOpen,
    checkAiResult: trustCheckAiResult,
  });
  const valueProposition = useMemo(
    () =>
      resolvePersonalizedValueProposition({
        summary: trustSummary,
        surface: "check-ai",
        matchedCategoryNames: results?.map((item) => item.label) ?? [],
        preferredPackage:
          trustSummary.journeySegment.id === "drifting_returner" ? "7" : "all",
      }),
    [results, trustSummary]
  );
  const guestBridgeModel = useMemo(() => {
    if (isUserLoggedIn !== false) return null;
    if (!results?.length) return null;

    return resolveGuestMemberBridge({
      surface: "check-ai-result",
      summary: trustSummary,
    });
  }, [isUserLoggedIn, results, trustSummary]);

  useEffect(() => {
    previewScoresRef.current = previewScores;
  }, [previewScores]);

  useEffect(() => {
    if (answeredCount === 0) {
      clearCheckAiDraft();
      return;
    }

    saveCheckAiDraft(answers);
  }, [answeredCount, answers]);

  useEffect(() => {
    if (modalOpen) {
      setAnimateBars(false);
      const timeoutId = window.setTimeout(() => setAnimateBars(true), 120);
      return () => window.clearTimeout(timeoutId);
    }

    setAnimateBars(false);
  }, [modalOpen]);

  useEffect(() => {
    let alive = true;

    getLoginStatus()
      .then((status) => {
        if (!alive) return;
        setIsUserLoggedIn(status.isUserLoggedIn);
      })
      .catch(() => {
        if (!alive) return;
        setIsUserLoggedIn(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (deferredAnsweredCount < CHECK_AI_MIN_PREVIEW_ANSWERS || isComplete) {
      setPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    const hasStablePreview = previewScoresRef.current.length > 0;
    const timeoutId = window.setTimeout(() => {
      const loadingStartedAt = Date.now();
      setPreviewLoading(true);

      const filled = deferredAnswers.map((value) => (value > 0 ? value : 3));

      requestCheckAiPredictScores(
        filled,
        getApiUrl("/api/predict"),
        3,
        controller.signal
      )
        .then((scores) => {
          if (previewRequestIdRef.current !== requestId) return;
          setPreviewScores(scores.slice(0, 3));
        })
        .catch((error) => {
          if (previewRequestIdRef.current !== requestId) return;
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setPreviewScores([]);
        })
        .finally(() => {
          void ensureMinimumDelay(loadingStartedAt, 180).then(() => {
            if (previewRequestIdRef.current !== requestId) return;
            setPreviewLoading(false);
          });
        });
    }, hasStablePreview ? 420 : 260);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredAnswers, deferredAnsweredCount, isComplete]);

  const handleChange = useCallback((index: number, value: number) => {
    setAnswers((current) => {
      if (current[index] === value) return current;
      const next = [...current];
      next[index] = value;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    const filled = answers.map((value) => (value > 0 ? value : 3));
    const normalized = await requestCheckAiPredictScores(
      filled,
      getApiUrl("/api/predict")
    ).catch(() => []);

    if (!normalized.length) {
      setLoading(false);
      return;
    }

    await ensureMinimumDelay(start, 3000);
    setResults(normalized);

    void persistCheckAiResult({
      scores: normalized,
      answers: filled,
      tzOffsetMinutes: getTzOffsetMinutes(),
      saveUrl: getApiUrl("/api/check-ai/save"),
    });

    clearCheckAiDraft();
    setLoading(false);
    setModalOpen(true);
  }, [answers]);

  const openValueAction = useCallback(
    (
      target: "chat" | "explore" | "trial" | "check-ai" | "assess" | "my-data"
    ) => {
      const baseExploreHref = `/explore${
        recommendedIds.length ? `?categories=${recommendedIds.join(",")}` : ""
      }#home-products`;

      showLoading();

      switch (target) {
        case "chat":
          window.location.href = `/chat?from=/check-ai&draft=${encodeURIComponent(
            valueProposition.chatPrompt
          )}`;
          return;
        case "my-data":
          window.location.href = "/my-data";
          return;
        case "assess":
          window.location.href = "/assess";
          return;
        case "trial":
          window.location.href = `/explore${
            recommendedIds.length
              ? `?categories=${recommendedIds.join(",")}&package=7`
              : "?package=7"
          }#home-products`;
          return;
        case "check-ai":
          document
            .getElementById("check-ai-form")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        case "explore":
        default:
          window.location.href = baseExploreHref;
      }
    },
    [recommendedIds, showLoading, valueProposition.chatPrompt]
  );

  return {
    answers,
    results,
    loading,
    modalOpen,
    animateBars,
    draftRestored,
    previewLoading,
    resultModalDrag,
    answeredCount,
    remainingCount,
    canSubmit: isComplete,
    completion,
    previewLabels,
    recommendedIds,
    minPreviewAnswers: CHECK_AI_MIN_PREVIEW_ANSWERS,
    trustSummary,
    valueProposition,
    guestBridgeModel,
    QUESTIONS,
    OPTIONS,
    handleChange,
    handleSubmit,
    openValueAction,
    setModalOpen,
  };
}
