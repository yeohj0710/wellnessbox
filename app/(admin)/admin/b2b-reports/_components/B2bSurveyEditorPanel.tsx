import styles from "@/components/b2b/B2bUx.module.css";
import SurveyQuestionField from "./SurveyQuestionField";
import type {
  CompletionStats,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "../_lib/client-types";
import { formatDateTime } from "../_lib/client-utils";

type B2bSurveyEditorPanelProps = {
  completionStats: CompletionStats;
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

export default function B2bSurveyEditorPanel({
  completionStats,
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
  return (
    <details className={styles.optionalCard}>
      <summary>
        설문 입력 ({completionStats.answered}/{completionStats.total}, {completionStats.percent}%)
      </summary>
      <div className={styles.optionalBody}>
        <p className={styles.optionalText}>
          마지막 저장: {formatDateTime(surveyUpdatedAt)} / 필수{" "}
          {completionStats.requiredAnswered}/{completionStats.requiredTotal}
        </p>
        <div className={styles.actionRow}>
          {(surveyTemplate?.sectionCatalog ?? []).map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => onToggleSection(section.key)}
              className={selectedSectionSet.has(section.key) ? styles.chipActive : styles.chip}
            >
              {section.displayName || `${section.key} ${section.title}`}
            </button>
          ))}
        </div>
        <div className={styles.twoCol}>
          <div className={styles.stack}>
            <h3 className={styles.sectionTitle}>공통 문항</h3>
            {(surveyTemplate?.common ?? []).map((question) => (
              <SurveyQuestionField
                key={question.key}
                question={question}
                value={surveyAnswers[question.key]}
                maxSelectedSections={maxSelectedSections}
                onChangeValue={onSetAnswerValue}
              />
            ))}
          </div>
          <div className={styles.stack}>
            <h3 className={styles.sectionTitle}>선택 섹션 문항</h3>
            {selectedSectionObjects.length === 0 ? (
              <p className={styles.inlineHint}>선택된 섹션이 없습니다.</p>
            ) : null}
            {selectedSectionObjects.map((section) => (
              <section key={section.key} className={styles.sectionCard}>
                <h4 className={styles.sectionTitle}>
                  {section.displayName || `${section.key} ${section.title}`}
                </h4>
                <div className={styles.stack}>
                  {section.questions.map((question) => (
                    <SurveyQuestionField
                      key={question.key}
                      question={question}
                      value={surveyAnswers[question.key]}
                      maxSelectedSections={maxSelectedSections}
                      onChangeValue={onSetAnswerValue}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onSaveSurvey}
          disabled={busy}
          className={styles.buttonPrimary}
        >
          설문 저장
        </button>
      </div>
    </details>
  );
}

