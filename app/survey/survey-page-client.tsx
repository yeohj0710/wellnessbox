"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPublicSurveyQuestionList,
  buildWellnessAnalysisInputFromSurvey,
  computeSurveyProgress,
  normalizeSurveyAnswersByTemplate,
  pruneSurveyAnswersByVisibility,
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

const STORAGE_KEY = "b2b-public-survey-state.v1";

type SurveyPhase = "intro" | "survey" | "result";

type PersistedSurveyState = {
  phase: SurveyPhase;
  currentIndex: number;
  answers: PublicSurveyAnswers;
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
  if (optionCount <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (optionCount <= 4) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

function scoreBadgeClass(score: number | null) {
  if (score == null) return "bg-gray-100 text-gray-600";
  if (score >= 80) return "bg-rose-100 text-rose-700";
  if (score >= 60) return "bg-amber-100 text-amber-700";
  if (score >= 40) return "bg-sky-100 text-sky-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function SurveyPageClient() {
  const template = useMemo(() => loadWellnessTemplateForB2b(), []);
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
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);

  const [phase, setPhase] = useState<SurveyPhase>("intro");
  const [answers, setAnswers] = useState<PublicSurveyAnswers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [result, setResult] = useState<WellnessComputedResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const restoredRef = useRef(false);

  const selectedSections = useMemo(
    () => resolveSelectedSectionsFromC27(template, answers),
    [template, answers]
  );
  const questionList = useMemo(
    () => buildPublicSurveyQuestionList(template, answers, selectedSections),
    [template, answers, selectedSections]
  );
  const progress = useMemo(
    () => computeSurveyProgress(questionList, answers),
    [questionList, answers]
  );
  const selectedSectionTitles = useMemo(
    () =>
      selectedSections
        .map((sectionKey) => sectionTitleMap.get(sectionKey) || sectionKey)
        .filter(Boolean),
    [sectionTitleMap, selectedSections]
  );

  useEffect(() => {
    setCurrentIndex((prev) => {
      if (questionList.length === 0) return 0;
      return Math.max(0, Math.min(prev, questionList.length - 1));
    });
  }, [questionList.length]);

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
      const nextSelectedSections = resolveSelectedSectionsFromC27(template, loadedAnswers);
      const prunedAnswers = pruneSurveyAnswersByVisibility(
        template,
        loadedAnswers,
        nextSelectedSections
      );
      const restoredList = buildPublicSurveyQuestionList(
        template,
        prunedAnswers,
        nextSelectedSections
      );
      setAnswers(prunedAnswers);
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
  }, [template]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "intro" && Object.keys(answers).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const snapshot: PersistedSurveyState = { phase, currentIndex, answers };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [answers, currentIndex, hydrated, phase]);

  const current = questionList[currentIndex] ?? null;

  function applyAnswer(question: WellnessSurveyQuestionForTemplate, rawValue: unknown) {
    setAnswers((prev) => {
      const sanitized = sanitizeSurveyAnswerValue(question, rawValue, maxSelectedSections);
      const next = { ...prev, [question.key]: sanitized };
      const nextSelectedSections = resolveSelectedSectionsFromC27(template, next);
      return pruneSurveyAnswersByVisibility(template, next, nextSelectedSections);
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
    setCurrentIndex(0);
    setErrorText(null);
    setResult(null);
    setPhase("intro");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function handleNext() {
    if (!current) return;
    const currentError = validateSurveyQuestionAnswer(
      current.question,
      answers[current.question.key]
    );
    if (currentError) {
      setErrorText(currentError);
      return;
    }
    if (currentIndex < questionList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setErrorText(null);
      return;
    }

    const invalidIndex = questionList.findIndex((node) => {
      const error = validateSurveyQuestionAnswer(node.question, answers[node.question.key]);
      return Boolean(error);
    });
    if (invalidIndex >= 0) {
      const invalid = questionList[invalidIndex];
      setCurrentIndex(invalidIndex);
      setErrorText(
        validateSurveyQuestionAnswer(invalid.question, answers[invalid.question.key]) ||
          "필수 문항을 확인해 주세요."
      );
      return;
    }

    try {
      const analysisInput = buildWellnessAnalysisInputFromSurvey({
        template,
        answers,
        selectedSections,
      });
      setResult(computeWellnessResult(analysisInput));
      setPhase("result");
      setErrorText(null);
    } catch {
      setErrorText("결과를 계산하는 중 오류가 발생했습니다. 입력값을 다시 확인해 주세요.");
    }
  }

  function renderQuestionInput(question: WellnessSurveyQuestionForTemplate) {
    if (question.type === "single") {
      const currentValue = toInputValue(answers[question.key]).trim();
      return (
        <div className={`grid gap-2 ${optionGridClass((question.options ?? []).length)}`}>
          {(question.options ?? []).map((option) => {
            const active = currentValue === option.value;
            return (
              <button
                key={`${question.key}-${option.value}`}
                type="button"
                data-testid="survey-option"
                onClick={() => applyAnswer(question, option.value)}
                className={[
                  "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  active
                    ? "border-sky-400 bg-sky-50 text-sky-900 ring-1 ring-sky-300"
                    : "border-gray-200 bg-white text-gray-700 hover:border-sky-200 hover:bg-sky-50",
                ].join(" ")}
              >
                {option.label}
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
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            최대 {maxSelect}개까지 선택할 수 있습니다. 현재 {selectedValues.size}개 선택됨
          </p>
          <div className={`grid gap-2 ${optionGridClass((question.options ?? []).length)}`}>
            {(question.options ?? []).map((option) => {
              const active = selectedValues.has(option.value);
              return (
                <button
                  key={`${question.key}-${option.value}`}
                  type="button"
                  data-testid="survey-multi-option"
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
                    "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    active
                      ? "border-sky-400 bg-sky-50 text-sky-900 ring-1 ring-sky-300"
                      : "border-gray-200 bg-white text-gray-700 hover:border-sky-200 hover:bg-sky-50",
                  ].join(" ")}
                >
                  {option.label}
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
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            type="number"
            inputMode="decimal"
            min={question.constraints?.min}
            max={question.constraints?.max}
            step={question.constraints?.integer ? 1 : "any"}
            value={value}
            onChange={(event) => applyAnswer(question, event.target.value)}
            placeholder={question.placeholder || "숫자를 입력해 주세요."}
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
                {field.label}
                {field.unit ? ` (${field.unit})` : ""}
              </span>
              <input
                data-testid={`survey-group-input-${field.id}`}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
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
                placeholder={`${field.label} 입력`}
              />
            </label>
          ))}
        </div>
      );
    }

    const value = toInputValue(answers[question.key]);
    return (
      <input
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
        value={value}
        onChange={(event) => applyAnswer(question, event.target.value)}
        placeholder={question.placeholder || "응답을 입력해 주세요."}
      />
    );
  }

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.45),transparent_45%),radial-gradient(circle_at_top_right,rgba(199,210,254,0.35),transparent_40%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
        <div className="w-full sm:w-[680px] lg:w-[860px] mx-auto px-4 pb-24">
          <section className="relative mt-8 overflow-hidden rounded-3xl bg-white/85 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="pointer-events-none absolute -top-28 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-sky-200 to-indigo-200 opacity-60 blur-3xl" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
                <span>B2B HEALTH SURVEY</span>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span>공통 27문항 + 상세 섹션</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                  B2B 건강 설문
                </h1>
                <p className="text-sm sm:text-base leading-6 text-gray-600">
                  공통 설문을 완료한 뒤 27번 문항에서 선택한 분야(최대 {maxSelectedSections}개)에 따라
                  상세 문항이 자동으로 이어집니다.
                </p>
              </div>
              <button
                type="button"
                data-testid="survey-start-button"
                onClick={handleStart}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:brightness-110"
              >
                설문 시작하기
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div
        className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.45),transparent_45%),radial-gradient(circle_at_top_right,rgba(199,210,254,0.35),transparent_40%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]"
        data-testid="survey-result"
      >
        <div className="w-full sm:w-[720px] lg:w-[920px] mx-auto px-4 pb-24">
          <section className="relative mt-8 overflow-hidden rounded-3xl bg-white/90 p-6 sm:p-8 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="pointer-events-none absolute -top-24 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-sky-200 to-indigo-200 opacity-60 blur-3xl" />
            <div className="relative space-y-6">
              <header className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-sky-700">설문 결과 요약</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  건강 설문 결과가 계산되었습니다
                </h2>
              </header>
              {result ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                      <p className="text-xs text-gray-500">건강점수</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {Math.round(result.overallHealthScore)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                      <p className="text-xs text-gray-500">생활습관 위험도</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {Math.round(result.lifestyleRisk.overallPercent)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                      <p className="text-xs text-gray-500">건강관리 필요도 평균</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
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
                          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.45),transparent_45%),radial-gradient(circle_at_top_right,rgba(199,210,254,0.35),transparent_40%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <div className="w-full sm:w-[680px] lg:w-[860px] mx-auto px-4 pb-24">
        <section className="relative mt-6 sm:mt-8 overflow-hidden rounded-3xl bg-white/85 p-6 sm:p-8 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 opacity-70 blur-3xl" />
          <div className="relative space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-sky-700">B2B 설문 진행</p>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">
                  {current ? `${currentIndex + 1}/${questionList.length} 문항` : "문항 준비 중"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">{resolveProgressMessage(progress.percent)}</p>
              </div>
              <div className="min-w-[180px]">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>진행률</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  필수 {progress.requiredAnswered}/{progress.requiredTotal}
                </p>
              </div>
            </header>

            <div className="rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-100">
              <p className="text-xs text-sky-700">
                선택 섹션:{" "}
                {selectedSectionTitles.length > 0 ? selectedSectionTitles.join(", ") : "아직 선택되지 않음"}
              </p>
            </div>

            {current ? (
              <article
                className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
                data-testid="survey-question"
                data-question-key={current.question.key}
                data-question-type={current.question.type}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                    {current.sectionTitle}
                  </span>
                  {current.question.required ? (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      필수
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg sm:text-xl font-semibold text-gray-900">
                  {current.question.index}. {current.question.text}
                </h3>
                {current.question.helpText ? (
                  <p className="mt-2 text-sm text-gray-500">{current.question.helpText}</p>
                ) : null}
                <div className="mt-4">{renderQuestionInput(current.question)}</div>
                {errorText ? (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {errorText}
                  </p>
                ) : null}
              </article>
            ) : null}

            <footer className="flex flex-wrap items-center justify-between gap-2">
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
                <button
                  type="button"
                  data-testid="survey-reset-button"
                  onClick={handleReset}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  처음부터
                </button>
              </div>
              <button
                type="button"
                data-testid="survey-next-button"
                onClick={handleNext}
                disabled={!current}
                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentIndex >= questionList.length - 1 ? "설문 완료" : "다음 문항"}
              </button>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
