import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import { validateSurveyQuestionAnswer } from "@/lib/b2b/public-survey";
import SurveyQuestionField from "./SurveyQuestionField";
import type {
  CompletionStats,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "../_lib/client-types";
import { formatDateTime } from "../_lib/client-utils";
import {
  hasAnswer,
  isQuestionVisible,
  isSkippableSelectionQuestion,
} from "../_lib/survey-progress";

type B2bSurveyEditorPanelProps = {
  completionStats: CompletionStats;
  surveySubmittedAt: string | null;
  surveyUpdatedAt: string | null;
  surveyTemplate: SurveyTemplateSchema | null;
  selectedSectionSet: Set<string>;
  selectedSectionObjects: SurveyTemplateSchema["sections"];
  surveyAnswers: Record<string, unknown>;
  maxSelectedSections: number;
  busy: boolean;
  onToggleSection: (sectionKey: string) => void;
  onSetAnswerValue: (question: SurveyQuestion, value: unknown) => void;
  onSaveSurvey: () => void;
};

type SurveySectionGroup = {
  key: string;
  title: string;
  questions: SurveyQuestion[];
};

function buildEditorSections(
  template: SurveyTemplateSchema | null,
  selectedSectionObjects: SurveyTemplateSchema["sections"],
  answers: Record<string, unknown>
) {
  if (!template) return [] as SurveySectionGroup[];

  const groups: SurveySectionGroup[] = [];
  const common = template.common.filter((question) => isQuestionVisible(question, answers));
  if (common.length > 0) {
    groups.push({
      key: "common",
      title: "공통 문항",
      questions: common,
    });
  }

  for (const section of selectedSectionObjects) {
    const questions = section.questions.filter((question) => isQuestionVisible(question, answers));
    groups.push({
      key: section.key,
      title: section.displayName || `${section.key} ${section.title}`,
      questions,
    });
  }

  return groups;
}

function getFocusedIndex(
  section: SurveySectionGroup | null,
  focusedKey: string | undefined,
  answers: Record<string, unknown>
) {
  if (!section || section.questions.length === 0) return -1;
  if (focusedKey) {
    const index = section.questions.findIndex((item) => item.key === focusedKey);
    if (index >= 0) return index;
  }
  const firstUnanswered = section.questions.findIndex((item) => !hasAnswer(item, answers[item.key]));
  return firstUnanswered >= 0 ? firstUnanswered : 0;
}

export default function B2bSurveyEditorPanel({
  completionStats,
  surveySubmittedAt,
  surveyUpdatedAt,
  surveyTemplate,
  selectedSectionSet,
  selectedSectionObjects,
  surveyAnswers,
  maxSelectedSections,
  busy,
  onToggleSection,
  onSetAnswerValue,
  onSaveSurvey,
}: B2bSurveyEditorPanelProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [focusedQuestionBySection, setFocusedQuestionBySection] = useState<Record<string, string>>(
    {}
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorQuestionKey, setErrorQuestionKey] = useState<string | null>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedSectionCount = selectedSectionSet.size;
  const sectionCatalog = surveyTemplate?.sectionCatalog ?? [];
  const recommendedRange = surveyTemplate?.rules?.recommendedSelectionsRange;
  const recommendedText =
    recommendedRange && recommendedRange.length === 2
      ? `${recommendedRange[0]}~${recommendedRange[1]}개`
      : "4~5개";

  const surveySections = useMemo(
    () => buildEditorSections(surveyTemplate, selectedSectionObjects, surveyAnswers),
    [selectedSectionObjects, surveyAnswers, surveyTemplate]
  );
  const allVisibleQuestions = useMemo(
    () => surveySections.flatMap((section) => section.questions),
    [surveySections]
  );

  const currentSection = surveySections[currentSectionIndex] ?? null;
  const focusedIndex = getFocusedIndex(
    currentSection,
    focusedQuestionBySection[currentSection?.key ?? ""],
    surveyAnswers
  );
  const focusedQuestionKey =
    currentSection && focusedIndex >= 0 ? currentSection.questions[focusedIndex]?.key ?? null : null;
  const focusedQuestion = useMemo(
    () => allVisibleQuestions.find((question) => question.key === focusedQuestionKey) ?? null,
    [allVisibleQuestions, focusedQuestionKey]
  );
  const displayTotal = completionStats.total;
  const hasRequiredCompletion =
    completionStats.requiredTotal === 0 ||
    completionStats.requiredAnswered >= completionStats.requiredTotal;
  const effectiveProgressPercent = useMemo(() => {
    if (completionStats.total <= 0) return 0;
    if (surveySubmittedAt && hasRequiredCompletion) return 100;
    return completionStats.percent;
  }, [
    completionStats.percent,
    completionStats.total,
    hasRequiredCompletion,
    surveySubmittedAt,
  ]);
  const progressDoneCount = useMemo(() => {
    if (completionStats.total <= 0) return 0;
    if (effectiveProgressPercent >= 100) return completionStats.total;
    return completionStats.answered;
  }, [completionStats.answered, completionStats.total, effectiveProgressPercent]);

  useEffect(() => {
    setCurrentSectionIndex((prev) => {
      if (surveySections.length === 0) return 0;
      return Math.max(0, Math.min(prev, surveySections.length - 1));
    });
  }, [surveySections.length]);

  useEffect(() => {
    if (!currentSection || currentSection.questions.length === 0) return;
    const currentFocused = focusedQuestionBySection[currentSection.key];
    if (currentFocused && currentSection.questions.some((question) => question.key === currentFocused)) return;
    const defaultQuestion =
      currentSection.questions.find((question) => !hasAnswer(question, surveyAnswers[question.key])) ??
      currentSection.questions[0];
    if (!defaultQuestion) return;
    setFocusedQuestionBySection((prev) => ({
      ...prev,
      [currentSection.key]: defaultQuestion.key,
    }));
  }, [currentSection, focusedQuestionBySection, surveyAnswers]);

  function scrollToQuestion(questionKey: string) {
    window.requestAnimationFrame(() => {
      const node = questionRefs.current[questionKey];
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      const focusable = node.querySelector<HTMLElement>("input,button,select,textarea");
      focusable?.focus({ preventScroll: true });
    });
  }

  function moveToSection(nextIndex: number) {
    if (surveySections.length === 0) return;
    const index = Math.max(0, Math.min(nextIndex, surveySections.length - 1));
    const target = surveySections[index];
    if (!target) return;
    const currentFocused = focusedQuestionBySection[target.key];
    const firstUnanswered =
      target.questions.find((question) => !hasAnswer(question, surveyAnswers[question.key])) ??
      target.questions[0];
    const nextFocused =
      currentFocused && target.questions.some((question) => question.key === currentFocused)
        ? currentFocused
        : firstUnanswered?.key;
    setCurrentSectionIndex(index);
    if (nextFocused) {
      setFocusedQuestionBySection((prev) => ({
        ...prev,
        [target.key]: nextFocused,
      }));
      scrollToQuestion(nextFocused);
    }
    setErrorQuestionKey(null);
    setErrorText(null);
  }

  function handleAdvance(fromQuestionKey?: string) {
    if (!currentSection || currentSection.questions.length === 0) return;

    const currentIndex =
      fromQuestionKey != null
        ? currentSection.questions.findIndex((question) => question.key === fromQuestionKey)
        : getFocusedIndex(currentSection, focusedQuestionBySection[currentSection.key], surveyAnswers);
    if (currentIndex < 0) return;

    const currentQuestion = currentSection.questions[currentIndex];
    const currentError = validateSurveyQuestionAnswer(
      currentQuestion as Parameters<typeof validateSurveyQuestionAnswer>[0],
      surveyAnswers[currentQuestion.key],
      {
        treatSelectionAsOptional: isSkippableSelectionQuestion(currentQuestion),
      }
    );
    if (currentError) {
      setErrorQuestionKey(currentQuestion.key);
      setErrorText(currentError);
      scrollToQuestion(currentQuestion.key);
      return;
    }
    setErrorQuestionKey(null);
    setErrorText(null);

    if (currentIndex < currentSection.questions.length - 1) {
      const nextQuestion = currentSection.questions[currentIndex + 1];
      if (!nextQuestion) return;
      setFocusedQuestionBySection((prev) => ({
        ...prev,
        [currentSection.key]: nextQuestion.key,
      }));
      scrollToQuestion(nextQuestion.key);
      return;
    }

    if (currentSectionIndex < surveySections.length - 1) {
      const nextSection = surveySections[currentSectionIndex + 1];
      const nextQuestion = nextSection?.questions[0];
      if (!nextSection || !nextQuestion) return;
      setCurrentSectionIndex((prev) => Math.min(prev + 1, surveySections.length - 1));
      setFocusedQuestionBySection((prev) => ({
        ...prev,
        [nextSection.key]: nextQuestion.key,
      }));
      scrollToQuestion(nextQuestion.key);
    }
  }

  function handlePrevious() {
    if (!currentSection || currentSection.questions.length === 0) return;
    const currentIndex = getFocusedIndex(
      currentSection,
      focusedQuestionBySection[currentSection.key],
      surveyAnswers
    );
    if (currentIndex > 0) {
      const prevQuestion = currentSection.questions[currentIndex - 1];
      if (!prevQuestion) return;
      setFocusedQuestionBySection((prev) => ({
        ...prev,
        [currentSection.key]: prevQuestion.key,
      }));
      scrollToQuestion(prevQuestion.key);
      setErrorQuestionKey(null);
      setErrorText(null);
      return;
    }

    if (currentSectionIndex <= 0) return;
    const prevSection = surveySections[currentSectionIndex - 1];
    const prevQuestion = prevSection?.questions[prevSection.questions.length - 1];
    if (!prevSection || !prevQuestion) return;
    setCurrentSectionIndex(currentSectionIndex - 1);
    setFocusedQuestionBySection((prev) => ({
      ...prev,
      [prevSection.key]: prevQuestion.key,
    }));
    scrollToQuestion(prevQuestion.key);
    setErrorQuestionKey(null);
    setErrorText(null);
  }

  const activeQuestionIndex =
    currentSection && currentSection.questions.length > 0
      ? getFocusedIndex(currentSection, focusedQuestionBySection[currentSection.key], surveyAnswers)
      : -1;
  const hasPreviousStep = currentSectionIndex > 0 || activeQuestionIndex > 0;
  const atLastSection = currentSectionIndex >= surveySections.length - 1;
  const atLastQuestionInSection =
    !!currentSection &&
    activeQuestionIndex >= 0 &&
    activeQuestionIndex >= currentSection.questions.length - 1;
  const nextButtonLabel = atLastSection
    ? atLastQuestionInSection
      ? "입력 완료"
      : "다음 문항"
    : atLastQuestionInSection
    ? "다음 섹션"
    : "다음 문항";

  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`} open>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>설문 입력</span>
        <span className={styles.editorPanelSummaryMeta}>
          {progressDoneCount}/{completionStats.total} 문항 완료 · {effectiveProgressPercent}%
        </span>
      </summary>
      <div className={styles.editorPanelMotion}>
        <div className={styles.editorPanelBody}>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/55 p-4">
            <p className="text-[13px] font-semibold text-sky-800">관리자 입력 가이드</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">
              <li>임직원 설문을 실제 `/survey` 진행 방식과 유사하게 바로 입력/수정할 수 있습니다.</li>
              <li>단일 선택 문항은 클릭 즉시 다음 문항으로 자동 이동합니다.</li>
              <li>필수 문항은 입력하지 않으면 다음으로 넘어갈 수 없습니다.</li>
            </ul>
          </div>

          <header className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div>
              <p className="text-sm font-semibold text-sky-700">임직원 설문 입력</p>
              <p className="mt-1 text-4xl font-extrabold leading-none text-slate-900 sm:text-5xl">
                {progressDoneCount}/{displayTotal}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                마지막 저장: {formatDateTime(surveyUpdatedAt)}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>진행률</span>
                <span>{effectiveProgressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-sky-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-300"
                  style={{ width: `${effectiveProgressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                필수 완료 {completionStats.requiredAnswered}/{completionStats.requiredTotal}
              </p>
            </div>
          </header>

          <section className={styles.editorSection}>
            <div className={styles.editorSectionHead}>
              <h3 className={styles.editorSectionTitle}>세부 영역 선택</h3>
              <p className={styles.editorSectionHint}>
                선택 {selectedSectionCount}/{Math.max(1, maxSelectedSections)} · 권장 {recommendedText}
              </p>
            </div>
            <div className={`${styles.actionRow} ${styles.editorChipRow}`}>
              {sectionCatalog.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => onToggleSection(section.key)}
                  className={selectedSectionSet.has(section.key) ? styles.chipActive : styles.chip}
                  disabled={busy}
                >
                  {section.displayName || `${section.key} ${section.title}`}
                </button>
              ))}
            </div>
          </section>

          {surveySections.length > 1 ? (
            <nav className="flex flex-wrap gap-2">
              {surveySections.map((section, index) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => moveToSection(index)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    index === currentSectionIndex
                      ? "bg-sky-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          ) : null}

          <section className="space-y-3">
            {currentSection && currentSection.questions.length > 0 ? (
              currentSection.questions.map((question) => {
                const isFocused = focusedQuestionKey === question.key;
                return (
                  <div
                    key={question.key}
                    ref={(nodeRef) => {
                      questionRefs.current[question.key] = nodeRef;
                    }}
                    className={`rounded-2xl border p-0 transition ${
                      isFocused
                        ? "border-sky-300 bg-sky-50/30 shadow-[0_12px_30px_-20px_rgba(56,189,248,0.85)]"
                        : "border-slate-200 bg-white"
                    }`}
                    onClick={() =>
                      setFocusedQuestionBySection((prev) => ({
                        ...prev,
                        [currentSection.key]: question.key,
                      }))
                    }
                  >
                    <SurveyQuestionField
                      question={question}
                      value={surveyAnswers[question.key]}
                      maxSelectedSections={maxSelectedSections}
                      busy={busy}
                      onChangeValue={(nextQuestion, nextValue) => {
                        onSetAnswerValue(nextQuestion, nextValue);
                        if (errorQuestionKey === nextQuestion.key) {
                          setErrorQuestionKey(null);
                          setErrorText(null);
                        }
                      }}
                      onRequestAdvance={(questionKey) => handleAdvance(questionKey)}
                    />
                    {errorQuestionKey === question.key && errorText ? (
                      <p className="px-5 pb-4 text-sm font-medium text-rose-600">{errorText}</p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                선택한 섹션에 현재 표시할 문항이 없습니다. 세부 영역 선택이나 조건 문항(C27)을 먼저 확인해 주세요.
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!hasPreviousStep || busy}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              이전 문항
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdvance()}
                disabled={busy || !focusedQuestion}
                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {nextButtonLabel}
              </button>
              <button
                type="button"
                onClick={onSaveSurvey}
                disabled={busy}
                className={`${styles.buttonPrimary} ${styles.editorPrimaryButton}`}
              >
                {busy ? "설문 저장 중..." : "설문 저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
