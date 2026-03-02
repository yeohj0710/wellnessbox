"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPublicSurveyQuestionList,
  buildWellnessAnalysisInputFromSurvey,
  computeSurveyProgress,
  isSurveyQuestionAnswered,
  normalizeSurveyAnswersByTemplate,
  resolveGroupFieldValues,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  toAnswerRecord,
  toInputValue,
  toMultiValues,
  toggleSurveyMultiValue,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import { computeWellnessResult, type WellnessComputedResult } from "@/lib/wellness/analysis";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";

const STORAGE_KEY = "b2b-public-survey-state.v2";
const CALCULATING_MESSAGES = [
  "응답 데이터를 정리하고 있어요.",
  "생활습관 위험도를 계산하고 있어요.",
  "건강관리 필요도를 분석하고 있어요.",
  "결과 리포트를 준비하고 있어요.",
];

type SurveyPhase = "intro" | "survey" | "calculating" | "result";
type PersistedSurveyPhase = Exclude<SurveyPhase, "calculating">;

type PersistedSurveyState = {
  phase: PersistedSurveyPhase;
  currentIndex: number;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
};

function resolveProgressMessage(percent: number) {
  if (percent <= 0) return "설문을 시작해 주세요.";
  if (percent < 25) return "좋은 출발입니다.";
  if (percent < 50) return "절반을 향해 가는 중입니다.";
  if (percent < 75) return "꾸준히 진행되고 있습니다.";
  if (percent < 100) return "거의 다 왔습니다.";
  return "설문이 완료되었습니다.";
}

function optionGridClass(optionCount: number) {
  if (optionCount <= 1) return "grid-cols-1";
  if (optionCount === 2) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

function scoreBadgeClass(score: number | null) {
  if (score == null) return "bg-gray-100 text-gray-600";
  if (score >= 80) return "bg-rose-100 text-rose-700";
  if (score >= 60) return "bg-amber-100 text-amber-700";
  if (score >= 40) return "bg-sky-100 text-sky-700";
  return "bg-emerald-100 text-emerald-700";
}

function isSelectionQuestion(question: WellnessSurveyQuestionForTemplate) {
  return question.type === "single" || question.type === "multi";
}

function toWebFriendlyCopy(text: string | undefined) {
  if (!text) return "";
  return text
    .replace(/체크하고\s*모두\s*동그라미\s*표시해\s*주십시오\.?/g, "해당되는 항목을 모두 선택해 주세요.")
    .replace(/모두\s*동그라미\s*표시해\s*주십시오\.?/g, "해당되는 항목을 모두 선택해 주세요.")
    .replace(/선택해주십시오/g, "선택해 주세요")
    .replace(/선택해 주십시오/g, "선택해 주세요")
    .replace(/기재해주십시오/g, "입력해 주세요")
    .replace(/기재해 주십시오/g, "입력해 주세요")
    .replace(/‘/g, "'")
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toDisplayErrorText(error: string | null | undefined) {
  if (!error) return null;
  const hasHangul = /[가-힣]/.test(error);
  const hasReplacementChar = /\uFFFD/.test(error);
  if (!hasHangul || hasReplacementChar) {
    return "응답값을 다시 확인해 주세요.";
  }
  return error;
}

function computeEffectiveRequiredProgress(
  questionList: Array<{ question: WellnessSurveyQuestionForTemplate }>,
  answers: PublicSurveyAnswers
) {
  const requiredNodes = questionList.filter(
    (node) => node.question.required && !isSelectionQuestion(node.question)
  );
  const requiredAnswered = requiredNodes.filter((node) =>
    isSurveyQuestionAnswered(node.question, answers[node.question.key])
  ).length;
  return {
    requiredTotal: requiredNodes.length,
    requiredAnswered,
  };
}

export default function SurveyPageClient() {
  const template = useMemo(() => loadWellnessTemplateForB2b(), []);
  const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
  const sectionTitleMap = useMemo(
    () =>
      new Map(
        template.sectionCatalog.map((section) => [
          section.key,
          section.displayName || section.title,
        ])
      ),
    [template]
  );
  const sectionQuestionKeyMap = useMemo(
    () =>
      new Map(
        template.sections.map((section) => [
          section.key,
          section.questions.map((question) => question.key),
        ])
      ),
    [template]
  );
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);

  const [phase, setPhase] = useState<SurveyPhase>("intro");
  const [answers, setAnswers] = useState<PublicSurveyAnswers>({});
  const [selectedSectionsCommitted, setSelectedSectionsCommitted] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [result, setResult] = useState<WellnessComputedResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [calcPercent, setCalcPercent] = useState(8);
  const [calcMessageIndex, setCalcMessageIndex] = useState(0);
  const restoredRef = useRef(false);
  const calcTickerRef = useRef<number | null>(null);
  const calcTimeoutRef = useRef<number | null>(null);

  const pruneAnswersByVisibility = useCallback(
    (inputAnswers: PublicSurveyAnswers, selectedSections: string[]) => {
      const visibleKeys = new Set(
        buildPublicSurveyQuestionList(template, inputAnswers, selectedSections, {
          deriveSelectedSections: false,
        }).map((item) => item.question.key)
      );
      const pruned: PublicSurveyAnswers = {};
      for (const [questionKey, rawValue] of Object.entries(inputAnswers)) {
        if (!visibleKeys.has(questionKey)) continue;
        pruned[questionKey] = rawValue;
      }
      return pruned;
    },
    [template]
  );

  const draftSelectedSections = useMemo(
    () => resolveSelectedSectionsFromC27(template, answers, []),
    [template, answers]
  );
  const questionList = useMemo(
    () =>
      buildPublicSurveyQuestionList(template, answers, selectedSectionsCommitted, {
        deriveSelectedSections: false,
      }),
    [template, answers, selectedSectionsCommitted]
  );
  const progress = useMemo(
    () => computeSurveyProgress(questionList, answers),
    [questionList, answers]
  );
  const effectiveRequired = useMemo(
    () => computeEffectiveRequiredProgress(questionList, answers),
    [questionList, answers]
  );
  const selectedSectionTitles = useMemo(
    () =>
      selectedSectionsCommitted
        .map((sectionKey) => sectionTitleMap.get(sectionKey) || sectionKey)
        .filter(Boolean),
    [sectionTitleMap, selectedSectionsCommitted]
  );
  const draftSectionTitles = useMemo(
    () =>
      draftSelectedSections
        .map((sectionKey) => sectionTitleMap.get(sectionKey) || sectionKey)
        .filter(Boolean),
    [sectionTitleMap, draftSelectedSections]
  );
  const stableQuestionKeys = useMemo(() => {
    const keys: string[] = template.common.map((question) => question.key);
    for (const section of template.sectionCatalog) {
      if (!selectedSectionsCommitted.includes(section.key)) continue;
      keys.push(...(sectionQuestionKeyMap.get(section.key) ?? []));
    }
    return keys;
  }, [template, selectedSectionsCommitted, sectionQuestionKeyMap]);
  const current = questionList[currentIndex] ?? null;
  const displayStep = useMemo(() => {
    if (!current) return 0;
    const stableIndex = stableQuestionKeys.indexOf(current.question.key);
    return stableIndex >= 0 ? stableIndex + 1 : currentIndex + 1;
  }, [current, currentIndex, stableQuestionKeys]);
  const displayTotal = Math.max(stableQuestionKeys.length, questionList.length, 1);
  const visibleSectionTitles =
    current?.question.key === c27Key ? draftSectionTitles : selectedSectionTitles;
  const currentSectionTitle = current?.sectionKey
    ? sectionTitleMap.get(current.sectionKey) || current.sectionTitle || current.sectionKey
    : "공통 설문";

  useEffect(() => {
    setCurrentIndex((prev) => {
      if (questionList.length === 0) return 0;
      return Math.max(0, Math.min(prev, questionList.length - 1));
    });
  }, [questionList.length]);

  useEffect(() => {
    return () => {
      if (calcTickerRef.current != null) {
        window.clearInterval(calcTickerRef.current);
      }
      if (calcTimeoutRef.current != null) {
        window.clearTimeout(calcTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedSurveyState>;
      if (!parsed || typeof parsed !== "object") {
        setHydrated(true);
        return;
      }
      const loadedAnswers =
        parsed.answers && typeof parsed.answers === "object"
          ? normalizeSurveyAnswersByTemplate(template, parsed.answers as PublicSurveyAnswers)
          : {};
      const seededSections = Array.isArray(parsed.selectedSections)
        ? parsed.selectedSections.filter(
            (sectionKey): sectionKey is string => typeof sectionKey === "string"
          )
        : [];
      const nextSelectedSections =
        seededSections.length > 0
          ? resolveSelectedSectionsFromC27(template, {}, seededSections)
          : resolveSelectedSectionsFromC27(template, loadedAnswers, []);
      const prunedAnswers = pruneAnswersByVisibility(loadedAnswers, nextSelectedSections);
      const restoredList = buildPublicSurveyQuestionList(
        template,
        prunedAnswers,
        nextSelectedSections,
        { deriveSelectedSections: false }
      );
      setAnswers(prunedAnswers);
      setSelectedSectionsCommitted(nextSelectedSections);
      if (typeof parsed.currentIndex === "number" && Number.isFinite(parsed.currentIndex)) {
        const clamped =
          restoredList.length > 0
            ? Math.max(0, Math.min(Math.floor(parsed.currentIndex), restoredList.length - 1))
            : 0;
        setCurrentIndex(clamped);
      }

      if (parsed.phase === "result") {
        const analysisInput = buildWellnessAnalysisInputFromSurvey({
          template,
          answers: prunedAnswers,
          selectedSections: nextSelectedSections,
        });
        setResult(computeWellnessResult(analysisInput));
        setPhase("result");
      } else if (parsed.phase === "survey") {
        setPhase("survey");
      }
    } catch {
      setPhase("intro");
    } finally {
      setHydrated(true);
    }
  }, [pruneAnswersByVisibility, template]);

  useEffect(() => {
    if (!hydrated) return;
    if (
      phase === "intro" &&
      Object.keys(answers).length === 0 &&
      selectedSectionsCommitted.length === 0
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const persistedPhase: PersistedSurveyPhase = phase === "calculating" ? "survey" : phase;
    const snapshot: PersistedSurveyState = {
      phase: persistedPhase,
      currentIndex,
      answers,
      selectedSections: selectedSectionsCommitted,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [answers, currentIndex, hydrated, phase, selectedSectionsCommitted]);

  function applyAnswer(question: WellnessSurveyQuestionForTemplate, rawValue: unknown) {
    setAnswers((prev) => {
      const sanitized = sanitizeSurveyAnswerValue(question, rawValue, maxSelectedSections);
      const next = { ...prev, [question.key]: sanitized };
      return pruneAnswersByVisibility(next, selectedSectionsCommitted);
    });
    setErrorText(null);
    if (phase === "result") {
      setPhase("survey");
      setResult(null);
    }
  }

  function handleStart() {
    setPhase("survey");
    setCurrentIndex(0);
    setErrorText(null);
  }

  function handleReset() {
    setAnswers({});
    setSelectedSectionsCommitted([]);
    setCurrentIndex(0);
    setErrorText(null);
    setResult(null);
    setPhase("intro");
    setCalcPercent(8);
    setCalcMessageIndex(0);
    if (calcTickerRef.current != null) {
      window.clearInterval(calcTickerRef.current);
      calcTickerRef.current = null;
    }
    if (calcTimeoutRef.current != null) {
      window.clearTimeout(calcTimeoutRef.current);
      calcTimeoutRef.current = null;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function startCalculation(finalAnswers: PublicSurveyAnswers, finalSelectedSections: string[]) {
    if (calcTickerRef.current != null) {
      window.clearInterval(calcTickerRef.current);
    }
    if (calcTimeoutRef.current != null) {
      window.clearTimeout(calcTimeoutRef.current);
    }

    setPhase("calculating");
    setResult(null);
    setErrorText(null);
    setCalcPercent(8);
    setCalcMessageIndex(0);

    calcTickerRef.current = window.setInterval(() => {
      setCalcPercent((prev) => {
        if (prev >= 92) return prev;
        if (prev < 40) return Math.min(92, prev + 14);
        if (prev < 70) return Math.min(92, prev + 8);
        return Math.min(92, prev + 4);
      });
      setCalcMessageIndex((prev) => (prev + 1) % CALCULATING_MESSAGES.length);
    }, 420);

    calcTimeoutRef.current = window.setTimeout(() => {
      try {
        const analysisInput = buildWellnessAnalysisInputFromSurvey({
          template,
          answers: finalAnswers,
          selectedSections: finalSelectedSections,
        });
        setResult(computeWellnessResult(analysisInput));
        setCalcPercent(100);
        setPhase("result");
      } catch {
        setPhase("survey");
        setErrorText("결과를 계산하는 중 오류가 발생했습니다. 입력값을 다시 확인해 주세요.");
      } finally {
        if (calcTickerRef.current != null) {
          window.clearInterval(calcTickerRef.current);
          calcTickerRef.current = null;
        }
        if (calcTimeoutRef.current != null) {
          window.clearTimeout(calcTimeoutRef.current);
          calcTimeoutRef.current = null;
        }
      }
    }, 1700);
  }

  function handleNext() {
    if (!current) return;
    const currentError = validateSurveyQuestionAnswer(current.question, answers[current.question.key], {
      treatSelectionAsOptional: true,
    });
    if (currentError) {
      setErrorText(toDisplayErrorText(currentError));
      return;
    }

    let nextAnswers = answers;
    let nextSelectedSections = selectedSectionsCommitted;
    if (current.question.key === c27Key) {
      nextSelectedSections = resolveSelectedSectionsFromC27(template, answers, []);
      setSelectedSectionsCommitted(nextSelectedSections);
      nextAnswers = pruneAnswersByVisibility(answers, nextSelectedSections);
      setAnswers(nextAnswers);
    }

    const effectiveList = buildPublicSurveyQuestionList(
      template,
      nextAnswers,
      nextSelectedSections,
      { deriveSelectedSections: false }
    );
    if (currentIndex < effectiveList.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, effectiveList.length - 1));
      setErrorText(null);
      return;
    }

    const invalidIndex = effectiveList.findIndex((node) => {
      const error = validateSurveyQuestionAnswer(node.question, nextAnswers[node.question.key], {
        treatSelectionAsOptional: true,
      });
      return Boolean(error);
    });
    if (invalidIndex >= 0) {
      const invalid = effectiveList[invalidIndex];
      setCurrentIndex(invalidIndex);
      setErrorText(
        toDisplayErrorText(
          validateSurveyQuestionAnswer(invalid.question, nextAnswers[invalid.question.key], {
            treatSelectionAsOptional: true,
          })
        ) || "응답값을 다시 확인해 주세요."
      );
      return;
    }
    startCalculation(nextAnswers, nextSelectedSections);
  }

  function renderQuestionInput(question: WellnessSurveyQuestionForTemplate) {
    if (question.type === "single") {
      const currentValue = toInputValue(answers[question.key]).trim();
      return (
        <div className={`grid gap-2.5 ${optionGridClass((question.options ?? []).length)}`}>
          {(question.options ?? []).map((option) => {
            const active = currentValue === option.value;
            return (
              <button
                key={`${question.key}-${option.value}`}
                type="button"
                data-testid="survey-option"
                aria-pressed={active}
                onClick={() => applyAnswer(question, active ? "" : option.value)}
                className={[
                  "min-h-[52px] rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors",
                  active
                    ? "border-sky-400 bg-sky-50 text-sky-900 ring-1 ring-sky-300"
                    : "border-gray-200 bg-white text-gray-700 hover:border-sky-200 hover:bg-sky-50",
                ].join(" ")}
              >
                {toWebFriendlyCopy(option.label)}
              </button>
            );
          })}
        </div>
      );
    }

    if (question.type === "multi") {
      const selectedValues = new Set(toMultiValues(answers[question.key]));
      const maxSelect =
        question.maxSelect ||
        question.constraints?.maxSelections ||
        Math.max(1, maxSelectedSections);
      const noneOptionLabel =
        question.options?.find((option) => option.isNoneOption)?.label ||
        question.options?.find((option) => option.value === question.noneOptionValue)?.label ||
        "";
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            최대 {maxSelect}개까지 선택할 수 있습니다. 현재 {selectedValues.size}개 선택됨
            {noneOptionLabel ? ` (${toWebFriendlyCopy(noneOptionLabel)} 항목은 단독 선택)` : ""}
          </p>
          <div className={`grid gap-2.5 ${optionGridClass((question.options ?? []).length)}`}>
            {(question.options ?? []).map((option) => {
              const active = selectedValues.has(option.value);
              return (
                <button
                  key={`${question.key}-${option.value}`}
                  type="button"
                  data-testid="survey-multi-option"
                  aria-pressed={active}
                  onClick={() =>
                    applyAnswer(
                      question,
                      toggleSurveyMultiValue(
                        question,
                        answers[question.key],
                        option.value,
                        maxSelectedSections
                      )
                    )
                  }
                  className={[
                    "min-h-[52px] rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors",
                    active
                      ? "border-sky-400 bg-sky-50 text-sky-900 ring-1 ring-sky-300"
                      : "border-gray-200 bg-white text-gray-700 hover:border-sky-200 hover:bg-sky-50",
                  ].join(" ")}
                >
                  {toWebFriendlyCopy(option.label)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === "number") {
      const value = toInputValue(answers[question.key]).trim();
      return (
        <div className="space-y-2">
          <input
            data-testid="survey-number-input"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            type="number"
            inputMode="decimal"
            min={question.constraints?.min}
            max={question.constraints?.max}
            step={question.constraints?.integer ? 1 : "any"}
            value={value}
            onChange={(event) => applyAnswer(question, event.target.value)}
            placeholder={toWebFriendlyCopy(question.placeholder) || "숫자를 입력해 주세요."}
          />
        </div>
      );
    }

    if (question.type === "group") {
      const fieldValues = resolveGroupFieldValues(question, answers[question.key]);
      return (
        <div className="space-y-3">
          {(question.fields ?? []).map((field) => (
            <label key={`${question.key}-${field.id}`} className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {toWebFriendlyCopy(field.label)}
                {field.unit ? ` (${field.unit})` : ""}
              </span>
              <input
                data-testid={`survey-group-input-${field.id}`}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                type={field.type === "number" ? "number" : "text"}
                inputMode={field.type === "number" ? "decimal" : undefined}
                min={field.constraints?.min}
                max={field.constraints?.max}
                step={field.constraints?.integer ? 1 : "any"}
                value={fieldValues[field.id] ?? ""}
                onChange={(event) => {
                  const nextFieldValues = {
                    ...fieldValues,
                    [field.id]: event.target.value,
                  };
                  const baseRecord = toAnswerRecord(answers[question.key]) ?? {};
                  applyAnswer(question, { ...baseRecord, fieldValues: nextFieldValues });
                }}
                placeholder={`${toWebFriendlyCopy(field.label)} 입력`}
              />
            </label>
          ))}
        </div>
      );
    }

    const value = toInputValue(answers[question.key]);
    return (
      <input
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
        value={value}
        onChange={(event) => applyAnswer(question, event.target.value)}
        placeholder={toWebFriendlyCopy(question.placeholder) || "응답을 입력해 주세요."}
      />
    );
  }

  if (phase === "intro") {
    return (
      <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_0%,rgba(186,230,253,0.75),transparent_42%),radial-gradient(circle_at_90%_8%,rgba(199,210,254,0.55),transparent_35%),linear-gradient(180deg,#f5f9ff_0%,#e9f0fa_100%)]">
        <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
          <section className="relative overflow-hidden rounded-3xl border border-sky-100/80 bg-white/80 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-10">
            <div className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-gradient-to-br from-sky-200/80 to-indigo-200/60 blur-3xl" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                <span>B2B 건강 설문</span>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span>공통 + 맞춤 상세 문항</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  건강 설문을 웹에서 바로 진행하세요
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                  공통 문항을 완료한 뒤 27번 문항에서 선택한 분야(최대 {maxSelectedSections}개)에 따라
                  상세 문항이 이어집니다. 진행 중인 응답은 자동 저장됩니다.
                </p>
              </div>
              <button
                type="button"
                data-testid="survey-start-button"
                onClick={handleStart}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(59,130,246,0.35)] transition hover:brightness-110"
              >
                설문 시작하기
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "calculating") {
    return (
      <div
        className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_0%,rgba(186,230,253,0.75),transparent_42%),radial-gradient(circle_at_90%_8%,rgba(199,210,254,0.55),transparent_35%),linear-gradient(180deg,#f5f9ff_0%,#e9f0fa_100%)]"
        data-testid="survey-calculating"
      >
        <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
          <section className="relative overflow-hidden rounded-3xl border border-sky-100/80 bg-white/85 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.12),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.12),transparent_38%)]" />
            <div className="relative space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                <span>연산 진행 중</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                건강 설문 결과를 계산하고 있습니다
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11">
                  <span className="absolute inset-0 rounded-full border-2 border-sky-200" />
                  <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500" />
                </div>
                <p className="text-sm text-gray-600">{CALCULATING_MESSAGES[calcMessageIndex]}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>진행률</span>
                  <span>{calcPercent}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-sky-100/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-[width] duration-300"
                    style={{ width: `${calcPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div
        className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_0%,rgba(186,230,253,0.75),transparent_42%),radial-gradient(circle_at_90%_8%,rgba(199,210,254,0.55),transparent_35%),linear-gradient(180deg,#f5f9ff_0%,#e9f0fa_100%)]"
        data-testid="survey-result"
      >
        <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
          <section className="relative overflow-hidden rounded-3xl border border-sky-100/80 bg-white/85 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-9">
            <div className="pointer-events-none absolute -top-24 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-sky-200/70 to-indigo-200/60 blur-3xl" />
            <div className="relative space-y-6">
              <header className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-sky-700">설문 결과 요약</p>
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-[40px] sm:leading-[1.15]">
                  건강 설문 결과가 계산되었습니다
                </h2>
              </header>
              {result ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-500">건강점수</p>
                      <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
                        {Math.round(result.overallHealthScore)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-500">생활습관 위험도</p>
                      <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
                        {Math.round(result.lifestyleRisk.overallPercent)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-500">건강관리 필요도 평균</p>
                      <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
                        {Math.round(result.healthManagementNeed.averagePercent)}
                      </p>
                    </div>
                  </div>
                  <section className="rounded-2xl border border-gray-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-900">고위험 하이라이트</h3>
                    <ul className="mt-3 space-y-2">
                      {result.highRiskHighlights.map((item, index) => (
                        <li
                          key={`${item.category}-${item.title}-${index}`}
                          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{item.title}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${scoreBadgeClass(
                                item.score
                              )}`}
                            >
                              {item.score}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600">{item.action}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : (
                <p className="text-sm text-gray-600">결과를 불러오지 못했습니다.</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="survey-result-edit-button"
                  onClick={() => {
                    setPhase("survey");
                    setResult(null);
                    setErrorText(null);
                    setCurrentIndex(0);
                  }}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  설문 수정하기
                </button>
                <button
                  type="button"
                  data-testid="survey-result-reset-button"
                  onClick={handleReset}
                  className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
                >
                  새로 시작하기
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_0%,rgba(186,230,253,0.75),transparent_42%),radial-gradient(circle_at_90%_8%,rgba(199,210,254,0.55),transparent_35%),linear-gradient(180deg,#f5f9ff_0%,#e9f0fa_100%)]">
      <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <section className="relative overflow-hidden rounded-3xl border border-sky-100/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-10">
          <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-sky-100/90 to-indigo-100/80 blur-3xl" />
          <button
            type="button"
            data-testid="survey-reset-button"
            onClick={handleReset}
            className="absolute right-6 top-6 z-10 rounded-full px-2 py-1 text-[12px] text-gray-500 underline underline-offset-2 transition hover:text-gray-700"
          >
            처음부터 다시 시작
          </button>

          <div className="relative space-y-5">
            <header className="grid gap-3 pr-28 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-end sm:gap-6">
              <div>
                <p className="text-xs font-semibold tracking-wide text-sky-700">B2B 설문 진행</p>
                <h2 className="mt-1 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-[46px] sm:leading-[1.1]">
                  {current ? `${displayStep}/${displayTotal} 문항` : "문항 준비 중"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">{resolveProgressMessage(progress.percent)}</p>
              </div>
              <div className="min-w-[180px]">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>진행률</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-sky-100/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  필수 {effectiveRequired.requiredAnswered}/{effectiveRequired.requiredTotal}
                </p>
              </div>
            </header>

            {visibleSectionTitles.length > 0 ? (
              <div className="rounded-2xl bg-sky-50/75 p-3 ring-1 ring-sky-100">
                <p className="text-xs font-medium text-sky-700">
                  선택 섹션: {visibleSectionTitles.join(", ")}
                </p>
              </div>
            ) : null}

            {current ? (
              <article
                className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"
                data-testid="survey-question"
                data-question-key={current.question.key}
                data-question-type={current.question.type}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                    {currentSectionTitle}
                  </span>
                  {current.question.required && !isSelectionQuestion(current.question) ? (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      필수
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-2xl font-semibold leading-snug text-gray-900 sm:text-[38px] sm:leading-[1.25]">
                  {current.question.index}. {toWebFriendlyCopy(current.question.text)}
                </h3>
                {current.question.helpText ? (
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {toWebFriendlyCopy(current.question.helpText)}
                  </p>
                ) : null}
                <div className="mt-4">{renderQuestionInput(current.question)}</div>
                {errorText ? (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {errorText}
                  </p>
                ) : null}
              </article>
            ) : null}

            <footer className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="survey-prev-button"
                  onClick={() => {
                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                    setErrorText(null);
                  }}
                  disabled={currentIndex <= 0}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
              </div>
              <button
                type="button"
                data-testid="survey-next-button"
                onClick={handleNext}
                disabled={!current}
                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentIndex >= questionList.length - 1 ? "결과 확인" : "다음 문항"}
              </button>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

