import styles from "@/components/b2b/B2bUx.module.css";

type B2bSurveyEditorActionsProps = {
  busy: boolean;
  isCommonSurveySection: boolean;
  hasPreviousSection: boolean;
  atLastSection: boolean;
  onMovePreviousSection: () => void;
  onMoveNextSection: () => void;
  onSaveSurvey: () => void;
};

export default function B2bSurveyEditorActions({
  busy,
  isCommonSurveySection,
  hasPreviousSection,
  atLastSection,
  onMovePreviousSection,
  onMoveNextSection,
  onSaveSurvey,
}: B2bSurveyEditorActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!isCommonSurveySection && hasPreviousSection ? (
          <button
            type="button"
            onClick={onMovePreviousSection}
            disabled={busy}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            이전 섹션
          </button>
        ) : null}
        {!atLastSection ? (
          <button
            type="button"
            onClick={onMoveNextSection}
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
        {busy ? "설문 저장 중.." : "설문 저장"}
      </button>
    </div>
  );
}
