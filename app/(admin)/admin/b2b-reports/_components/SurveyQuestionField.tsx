import styles from "@/components/b2b/B2bUx.module.css";
import { toInputValue, toMultiValues } from "../_lib/client-utils";
import type { SurveyQuestion } from "../_lib/client-types";

type SurveyQuestionFieldProps = {
  question: SurveyQuestion;
  value: unknown;
  maxSelectedSections: number;
  onChangeValue: (question: SurveyQuestion, value: unknown) => void;
};

export default function SurveyQuestionField({
  question,
  value,
  maxSelectedSections,
  onChangeValue,
}: SurveyQuestionFieldProps) {
  if (question.type === "multi") {
    const selected = new Set(toMultiValues(value));
    return (
      <div className={styles.optionalCard}>
        <p className={styles.fieldLabel}>
          {question.index}. {question.text}
        </p>
        <div className={styles.actionRow}>
          {(question.options || []).map((option) => (
            <button
              key={option.value}
              type="button"
              className={selected.has(option.value) ? styles.chipActive : styles.chip}
              onClick={() => {
                const next = new Set(selected);
                if (next.has(option.value)) next.delete(option.value);
                else next.add(option.value);
                onChangeValue(
                  question,
                  [...next].slice(0, question.maxSelect || maxSelectedSections)
                );
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
      <div className={styles.optionalCard}>
        <label className={styles.fieldLabel}>
          {question.index}. {question.text}
        </label>
        <select
          className={styles.select}
          value={toInputValue(value)}
          onChange={(event) => onChangeValue(question, event.target.value)}
        >
          <option value="">선택하세요</option>
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
    <div className={styles.optionalCard}>
      <label className={styles.fieldLabel}>
        {question.index}. {question.text}
      </label>
      <input
        className={styles.input}
        value={toInputValue(value)}
        onChange={(event) => onChangeValue(question, event.target.value)}
        placeholder={question.placeholder || "응답 입력"}
      />
    </div>
  );
}
