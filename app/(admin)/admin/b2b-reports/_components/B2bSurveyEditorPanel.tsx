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
  const selectedSectionCount = selectedSectionSet.size;
  const sectionCatalog = surveyTemplate?.sectionCatalog ?? [];

  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`}>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>설문 입력</span>
        <span className={styles.editorPanelSummaryMeta}>
          {completionStats.answered}/{completionStats.total} 문항 완료 · {completionStats.percent}%
        </span>
      </summary>
      <div className={styles.editorPanelBody}>
        <div className={styles.editorGuide}>
          <p className={styles.editorGuideTitle}>입력 가이드</p>
          <ul className={styles.editorGuideList}>
            <li>공통 문항을 먼저 입력하고, 필요한 세부 영역을 선택해서 추가 문항을 작성해 주세요.</li>
            <li>
              세부 영역은 최대 {maxSelectedSections}개까지 선택 가능하며, 선택된 영역의 문항만 오른쪽에
              표시돼요.
            </li>
            <li>필수 문항을 우선 채운 뒤 저장하면 레포트 품질이 안정적으로 올라가요.</li>
          </ul>
        </div>

        <div className={styles.editorToolbarRow}>
          <p className={styles.inlineHint}>마지막 저장: {formatDateTime(surveyUpdatedAt)}</p>
          <p className={styles.inlineHint}>
            필수 완료: {completionStats.requiredAnswered}/{completionStats.requiredTotal}
          </p>
        </div>

        <section className={styles.editorSection}>
          <div className={styles.editorSectionHead}>
            <h3 className={styles.editorSectionTitle}>세부 영역 선택</h3>
            <p className={styles.editorSectionHint}>
              선택 {selectedSectionCount}/{Math.max(1, maxSelectedSections)} · 전체 {sectionCatalog.length}개
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

        <div className={styles.editorTwoCol}>
          <section className={styles.editorSection}>
            <div className={styles.editorSectionHead}>
              <h3 className={styles.editorSectionTitle}>공통 문항</h3>
              <p className={styles.editorSectionHint}>모든 직원에게 공통 적용</p>
            </div>
            <div className={styles.stack}>
              {(surveyTemplate?.common ?? []).map((question) => (
                  <SurveyQuestionField
                    key={question.key}
                    question={question}
                    value={surveyAnswers[question.key]}
                    maxSelectedSections={maxSelectedSections}
                    busy={busy}
                    onChangeValue={onSetAnswerValue}
                  />
              ))}
            </div>
          </section>

          <section className={styles.editorSection}>
            <div className={styles.editorSectionHead}>
              <h3 className={styles.editorSectionTitle}>선택 섹션 문항</h3>
              <p className={styles.editorSectionHint}>선택한 세부 영역만 표시</p>
            </div>
            {selectedSectionObjects.length === 0 ? (
              <p className={styles.inlineHint}>
                아직 선택한 세부 영역이 없어요. 위에서 필요한 영역을 먼저 선택해 주세요.
              </p>
            ) : null}
            <div className={styles.stack}>
              {selectedSectionObjects.map((section) => (
                <section key={section.key} className={styles.editorSubSection}>
                  <h4 className={styles.editorSectionTitle}>
                    {section.displayName || `${section.key} ${section.title}`}
                  </h4>
                  <div className={styles.stack}>
                    {section.questions.map((question) => (
                      <SurveyQuestionField
                        key={question.key}
                        question={question}
                        value={surveyAnswers[question.key]}
                        maxSelectedSections={maxSelectedSections}
                        busy={busy}
                        onChangeValue={onSetAnswerValue}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.editorActionBar}>
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
    </details>
  );
}
