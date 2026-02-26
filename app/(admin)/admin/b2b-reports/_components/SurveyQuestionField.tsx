import styles from "@/components/b2b/B2bUx.module.css";
import { toInputValue, toMultiValues } from "../_lib/client-utils";
import type { SurveyQuestion } from "../_lib/client-types";

type SurveyQuestionFieldProps = {
  question: SurveyQuestion;
  value: unknown;
  maxSelectedSections: number;
  busy?: boolean;
  onChangeValue: (question: SurveyQuestion, value: unknown) => void;
};

function QuestionHeader({ question }: { question: SurveyQuestion }) {
  return (
    <div className={styles.questionCardHead}>
      <p className={styles.questionCardTitle}>
        {question.index}. {question.text}
      </p>
      {question.required ? (
        <span className={styles.requiredBadge}>필수</span>
      ) : (
        <span className={styles.optionalBadge}>선택</span>
      )}
    </div>
  );
}

export default function SurveyQuestionField({
  question,
  value,
  maxSelectedSections,
  busy = false,
  onChangeValue,
}: SurveyQuestionFieldProps) {
  if (question.type === "multi") {
    const selected = new Set(toMultiValues(value));
    const maxSelect = question.maxSelect || maxSelectedSections;
    return (
      <div className={styles.questionCard}>
        <QuestionHeader question={question} />
        <p className={styles.questionCardHint}>최대 {maxSelect}개까지 선택할 수 있어요.</p>
        <div className={`${styles.actionRow} ${styles.editorChipRow}`}>
          {(question.options || []).map((option) => (
            <button
              key={option.value}
              type="button"
              className={selected.has(option.value) ? styles.chipActive : styles.chip}
              disabled={busy}
              onClick={() => {
                const next = new Set(selected);
                if (next.has(option.value)) next.delete(option.value);
                else next.add(option.value);
                onChangeValue(question, [...next].slice(0, maxSelect));
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "single" && (question.options?.length ?? 0) > 0) {
    return (
      <div className={styles.questionCard}>
        <QuestionHeader question={question} />
        <p className={styles.questionCardHint}>아래 목록에서 가장 가까운 항목을 선택해 주세요.</p>
        <select
          className={styles.select}
          value={toInputValue(value)}
          disabled={busy}
          onChange={(event) => onChangeValue(question, event.target.value)}
        >
          <option value="">항목을 선택해 주세요</option>
          {(question.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={styles.questionCard}>
      <QuestionHeader question={question} />
      <p className={styles.questionCardHint}>짧은 문장으로 핵심 내용만 입력해 주세요.</p>
      <input
        className={styles.input}
        value={toInputValue(value)}
        disabled={busy}
        onChange={(event) => onChangeValue(question, event.target.value)}
        placeholder={question.placeholder || "응답을 입력해 주세요"}
      />
    </div>
  );
}
