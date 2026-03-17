import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import styles from "@/components/b2b/B2bUx.module.css";

type B2bNoteEditorPanelProps = {
  note: string;
  recommendations: string;
  cautions: string;
  busy: boolean;
  onNoteChange: (value: string) => void;
  onRecommendationsChange: (value: string) => void;
  onCautionsChange: (value: string) => void;
  onSave: () => void;
};

export default function B2bNoteEditorPanel({
  note,
  recommendations,
  cautions,
  busy,
  onNoteChange,
  onRecommendationsChange,
  onCautionsChange,
  onSave,
}: B2bNoteEditorPanelProps) {
  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`}>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>약사 코멘트 편집</span>
        <span className={styles.editorPanelSummaryMeta}>환자 안내 문구로 바로 반영</span>
      </summary>
      <div className={styles.editorPanelMotion}>
        <div className={styles.editorPanelBody}>
          <div className={styles.editorGuide}>
            <p className={styles.editorGuideTitle}>입력 가이드</p>
            <ul className={styles.editorGuideList}>
              <li>요약 메모는 현재 상태를 2~4줄로 짧게 정리해 주세요.</li>
              <li>권장 사항은 바로 실행 가능한 행동 중심으로 적어 주세요.</li>
              <li>주의 사항은 복용 시 주의할 점이나 피해야 할 상황 위주로 정리해 주세요.</li>
            </ul>
          </div>

          <section className={styles.editorFieldGroup}>
            <p className={styles.editorFieldLabel}>요약 메모</p>
            <p className={styles.editorFieldHint}>
              현재 상태를 한눈에 이해할 수 있도록 핵심만 정리해 주세요.
            </p>
            <textarea
              className={styles.textarea}
              value={note}
              disabled={busy}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="예: 최근 1개월 복약 이력이 없고, 수면/식사 패턴 변화가 큽니다."
            />
          </section>

          <section className={styles.editorFieldGroup}>
            <p className={styles.editorFieldLabel}>권장 사항</p>
            <p className={styles.editorFieldHint}>
              고객이 바로 따라 할 수 있는 문장으로 적어 주세요.
            </p>
            <textarea
              className={styles.textarea}
              value={recommendations}
              disabled={busy}
              onChange={(event) => onRecommendationsChange(event.target.value)}
              placeholder="예: 아침 식후 30분 이내 복용으로 고정하고, 알림은 하루 2회 설정해 주세요."
            />
          </section>

          <section className={styles.editorFieldGroup}>
            <p className={styles.editorFieldLabel}>주의 사항</p>
            <p className={styles.editorFieldHint}>
              피해야 할 상황이나 주의할 점을 분명하게 적어 주세요.
            </p>
            <textarea
              className={styles.textarea}
              value={cautions}
              disabled={busy}
              onChange={(event) => onCautionsChange(event.target.value)}
              placeholder="예: 공복 복용 시 속쓰림 가능성이 있어 가급적 식후 복용을 권장합니다."
            />
          </section>

          <div className={styles.editorActionBar}>
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className={`${styles.buttonPrimary} ${styles.editorPrimaryButton}`}
            >
              {busy ? <InlineSpinnerLabel label="코멘트 저장 중" /> : "코멘트 저장"}
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}
