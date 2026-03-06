import { useMemo } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import {
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import B2bSurveyEditorGuidanceCard from "./B2bSurveyEditorGuidanceCard";
import B2bSurveyEditorProgressHeader from "./B2bSurveyEditorProgressHeader";
import B2bSurveyEditorSectionSelector from "./B2bSurveyEditorSectionSelector";
import SurveyQuestionField from "./SurveyQuestionField";
import type {
  CompletionStats,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "../_lib/client-types";
import {
  buildEditorSections,
} from "../_lib/survey-editor-sections";
import {
  computeSurveyEditorEffectiveProgressPercent,
  computeSurveyEditorProgressDoneCount,
  resolveRecommendedSectionSelectionText,
} from "../_lib/survey-editor-progress";
import { useSurveyEditorNavigation } from "../_lib/use-survey-editor-navigation";

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
  const selectedSectionCount = selectedSectionSet.size;
  const sectionCatalog = surveyTemplate?.sectionCatalog ?? [];
  const recommendedText = resolveRecommendedSectionSelectionText(
    surveyTemplate?.rules?.recommendedSelectionsRange
  );
  const template = (surveyTemplate ?? null) as WellnessSurveyTemplate | null;
  const answers = surveyAnswers as PublicSurveyAnswers;

  const surveySections = useMemo(
    () => buildEditorSections(template, answers, selectedSections),
    [answers, selectedSections, template]
  );
  const {
    currentSectionIndex,
    currentSection,
    focusedQuestionKey,
    errorText,
    errorQuestionKey,
    moveToSection,
    handleAdvance,
    handleMovePreviousSection,
    handleMoveNextSection,
    setQuestionRef,
    focusQuestion,
    clearErrorForQuestion,
  } = useSurveyEditorNavigation({
    surveySections,
    answers,
  });

  const displayTotal = completionStats.total;
  const effectiveProgressPercent = useMemo(
    () =>
      computeSurveyEditorEffectiveProgressPercent(completionStats, surveySubmittedAt),
    [completionStats, surveySubmittedAt]
  );
  const progressDoneCount = useMemo(
    () => computeSurveyEditorProgressDoneCount(completionStats, effectiveProgressPercent),
    [completionStats, effectiveProgressPercent]
  );


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
          <B2bSurveyEditorGuidanceCard />
          <B2bSurveyEditorProgressHeader
            completionStats={completionStats}
            displayTotal={displayTotal}
            progressDoneCount={progressDoneCount}
            effectiveProgressPercent={effectiveProgressPercent}
            surveyUpdatedAt={surveyUpdatedAt}
          />
          <B2bSurveyEditorSectionSelector
            sectionCatalog={sectionCatalog}
            selectedSectionCount={selectedSectionCount}
            selectedSectionSet={selectedSectionSet}
            maxSelectedSections={maxSelectedSections}
            recommendedText={recommendedText}
            busy={busy}
            onToggleSection={onToggleSection}
          />

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
                      setQuestionRef(question.key, nodeRef);
                    }}
                    className={`rounded-2xl border p-0 transition ${
                      isFocused
                        ? "border-sky-300 bg-sky-50/30 shadow-[0_12px_30px_-20px_rgba(56,189,248,0.85)]"
                        : "border-slate-200 bg-white"
                    }`}
                    onClick={() => focusQuestion(currentSection.key, question.key)}
                  >
                    <SurveyQuestionField
                      question={question as SurveyQuestion}
                      value={surveyAnswers[question.key]}
                      maxSelectedSections={maxSelectedSections}
                      busy={busy}
                      onChangeValue={(nextQuestion, nextValue) => {
                        onSetAnswerValue(nextQuestion, nextValue);
                        clearErrorForQuestion(nextQuestion.key);
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
