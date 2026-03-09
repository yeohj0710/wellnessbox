import { useMemo } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import B2bSurveyEditorActions from "./B2bSurveyEditorActions";
import B2bSurveyEditorGuidanceCard from "./B2bSurveyEditorGuidanceCard";
import B2bSurveyEditorProgressHeader from "./B2bSurveyEditorProgressHeader";
import B2bSurveyEditorQuestionList from "./B2bSurveyEditorQuestionList";
import B2bSurveyEditorSectionSelector from "./B2bSurveyEditorSectionSelector";
import B2bSurveyEditorSectionTabs from "./B2bSurveyEditorSectionTabs";
import type {
  CompletionStats,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "../_lib/client-types";
import { buildEditorSections } from "../_lib/survey-editor-sections";
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
    () => computeSurveyEditorEffectiveProgressPercent(completionStats, surveySubmittedAt),
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
          <B2bSurveyEditorSectionTabs
            sections={surveySections}
            currentSectionIndex={currentSectionIndex}
            onMoveToSection={moveToSection}
          />
          <B2bSurveyEditorQuestionList
            currentSection={currentSection}
            surveyAnswers={surveyAnswers}
            maxSelectedSections={maxSelectedSections}
            busy={busy}
            focusedQuestionKey={focusedQuestionKey}
            errorQuestionKey={errorQuestionKey}
            errorText={errorText}
            onSetQuestionRef={setQuestionRef}
            onFocusQuestion={focusQuestion}
            onSetAnswerValue={onSetAnswerValue}
            onClearErrorForQuestion={clearErrorForQuestion}
            onRequestAdvance={handleAdvance}
          />
          <B2bSurveyEditorActions
            busy={busy}
            isCommonSurveySection={isCommonSurveySection}
            hasPreviousSection={hasPreviousSection}
            atLastSection={atLastSection}
            onMovePreviousSection={handleMovePreviousSection}
            onMoveNextSection={handleMoveNextSection}
            onSaveSurvey={onSaveSurvey}
          />
        </div>
      </div>
    </details>
  );
}
