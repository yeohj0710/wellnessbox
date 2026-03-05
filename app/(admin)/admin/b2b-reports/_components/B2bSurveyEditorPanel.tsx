import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import {
  isSurveyQuestionAnswered,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import SurveyQuestionField from "./SurveyQuestionField";
import type {
  CompletionStats,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "../_lib/client-types";
import { formatDateTime } from "../_lib/client-utils";
import {
  buildEditorSections,
  getFocusedQuestionIndex,
  isOptionalSelectionQuestion,
} from "../_lib/survey-editor-sections";

type B2bSurveyEditorPanelProps = {
  completionStats: CompletionStats;
  surveySubmittedAt: string | null;
  surveyUpdatedAt: string | null;
  surveyTemplate: SurveyTemplateSchema | null;
  selectedSections: string[];
  selectedSectionSet: Set<string>;
  surveyAnswers: Record<string, unknown>;
  maxSelectedSections: number;
  busy: boolean;
  onToggleSection: (sectionKey: string) => void;
  onSetAnswerValue: (question: SurveyQuestion, value: unknown) => void;
  onSaveSurvey: () => void;
};

export default function B2bSurveyEditorPanel({
  completionStats,
  surveySubmittedAt,
  surveyUpdatedAt,
  surveyTemplate,
  selectedSections,
  selectedSectionSet,
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
  const template = (surveyTemplate ?? null) as WellnessSurveyTemplate | null;
  const answers = surveyAnswers as PublicSurveyAnswers;

  const surveySections = useMemo(
    () => buildEditorSections(template, answers, selectedSections),
    [answers, selectedSections, template]
  );

  const currentSection = surveySections[currentSectionIndex] ?? null;
  const focusedIndex = getFocusedQuestionIndex(
    currentSection,
    focusedQuestionBySection[currentSection?.key ?? ""],
    answers
  );
  const focusedQuestionKey =
    currentSection && focusedIndex >= 0 ? currentSection.questions[focusedIndex]?.key ?? null : null;

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
    if (
      currentFocused &&
      currentSection.questions.some((question) => question.key === currentFocused)
    ) {
      return;
    }
    const defaultQuestion =
      currentSection.questions.find((question) => !isSurveyQuestionAnswered(question, answers[question.key])) ??
      currentSection.questions[0];
    if (!defaultQuestion) return;
    setFocusedQuestionBySection((prev) => ({
      ...prev,
      [currentSection.key]: defaultQuestion.key,
    }));
  }, [answers, currentSection, focusedQuestionBySection]);

  function scrollToQuestion(questionKey: string) {
    window.requestAnimationFrame(() => {
      const node = questionRefs.current[questionKey];
      if (!node) return;
      const fixedTopInset = 80;
      const fixedBottomInset = 16;
      const viewportHeight = Math.max(
        1,
        window.innerHeight - fixedTopInset - fixedBottomInset
      );
      const nodeRect = node.getBoundingClientRect();
      const nodeHeight = Math.max(1, nodeRect.height);
      const centerOffset = Math.max(0, (viewportHeight - nodeHeight) / 2);
      const targetTop =
        window.scrollY + nodeRect.top - fixedTopInset - centerOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
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
      target.questions.find((question) => !isSurveyQuestionAnswered(question, answers[question.key])) ??
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

  function handleAdvance(fromQuestionKey?: string, pendingValue?: unknown) {
    if (!currentSection || currentSection.questions.length === 0) return;

    const currentIndex =
      fromQuestionKey != null
        ? currentSection.questions.findIndex((question) => question.key === fromQuestionKey)
        : getFocusedQuestionIndex(
            currentSection,
            focusedQuestionBySection[currentSection.key],
            answers
          );
    if (currentIndex < 0) return;

    const currentQuestion = currentSection.questions[currentIndex];
    const currentValueForValidation =
      fromQuestionKey && currentQuestion.key === fromQuestionKey && pendingValue !== undefined
        ? pendingValue
        : answers[currentQuestion.key];
    const currentError = validateSurveyQuestionAnswer(currentQuestion, currentValueForValidation, {
      treatSelectionAsOptional: isOptionalSelectionQuestion(currentQuestion),
    });
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
      moveToSection(currentSectionIndex + 1);
    }
  }

  function handleMovePreviousSection() {
    if (currentSectionIndex <= 0) return;
    moveToSection(currentSectionIndex - 1);
  }

  function handleMoveNextSection() {
    if (!currentSection || currentSection.questions.length === 0) return;
    for (const question of currentSection.questions) {
      const validationError = validateSurveyQuestionAnswer(question, answers[question.key], {
        treatSelectionAsOptional: isOptionalSelectionQuestion(question),
      });
      if (validationError) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [currentSection.key]: question.key }));
        setErrorQuestionKey(question.key);
        setErrorText(validationError);
        scrollToQuestion(question.key);
        return;
      }
    }

    setErrorQuestionKey(null);
    setErrorText(null);
    if (currentSectionIndex < surveySections.length - 1) {
      moveToSection(currentSectionIndex + 1);
    }
  }

  const isCommonSurveySection = currentSection?.key === "common";
  const hasPreviousSection = currentSectionIndex > 0;
  const atLastSection = currentSectionIndex >= surveySections.length - 1;

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
              <li>설문 문항 처리 로직은 `/survey`와 동일한 공통 로직을 사용합니다.</li>
              <li>단일 선택 문항은 클릭 즉시 다음 문항으로 자동 이동합니다.</li>
              <li>이전/다음 버튼은 섹션 이동 기준으로 동작합니다.</li>
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
                      question={question as SurveyQuestion}
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
                      onRequestAdvance={(questionKey, pendingValue) =>
                        handleAdvance(questionKey, pendingValue)
                      }
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
            <div className="flex flex-wrap items-center gap-2">
              {!isCommonSurveySection && hasPreviousSection ? (
                <button
                  type="button"
                  onClick={handleMovePreviousSection}
                  disabled={busy}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전 섹션
                </button>
              ) : null}
              {!atLastSection ? (
                <button
                  type="button"
                  onClick={handleMoveNextSection}
                  disabled={busy}
                  className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  다음 섹션
                </button>
              ) : null}
            </div>
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
    </details>
  );
}
