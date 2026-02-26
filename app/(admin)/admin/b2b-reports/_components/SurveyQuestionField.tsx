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

function normalizeVariantKey(question: SurveyQuestion, raw: unknown) {
  if (!question.variants || Object.keys(question.variants).length === 0) return null;
  if (typeof raw === "object" && raw) {
    const row = raw as Record<string, unknown>;
    if (typeof row.variantId === "string" && row.variantId.trim().length > 0) {
      return row.variantId;
    }
  }
  return "base";
}

function listVariantKeys(question: SurveyQuestion) {
  if (!question.variants || Object.keys(question.variants).length === 0) return [];
  const keys = ["base", ...Object.keys(question.variants)];
  return [...new Set(keys)];
}

function variantLabel(variantKey: string) {
  if (variantKey === "base") return "기본 옵션(답지 기준)";
  if (variantKey.includes("paperPdf")) return "종이 설문지 옵션";
  return variantKey;
}

function resolveVariantOptions(question: SurveyQuestion, variantKey: string | null) {
  if (variantKey && variantKey !== "base" && question.variants?.[variantKey]?.options) {
    return {
      options: question.variants[variantKey].options ?? [],
      optionsPrefix:
        question.variants[variantKey].optionsPrefix ?? question.optionsPrefix ?? undefined,
    };
  }
  return {
    options: question.options ?? [],
    optionsPrefix: question.optionsPrefix ?? undefined,
  };
}

function clampByVariantOptions(
  values: string[],
  options: Array<{ value: string; label: string; score?: number }>
) {
  if (values.length === 0) return [];
  const optionSet = new Set(options.map((option) => option.value));
  return values.filter((item) => optionSet.has(item));
}

function withVariantAnswer(
  variantKey: string | null,
  selectedValues: string[],
  options: Array<{ value: string; label: string; score?: number }>,
  fallbackAnswerText = ""
) {
  const firstValue = selectedValues[0] ?? "";
  const matched = options.find((option) => option.value === firstValue);
  const labels = selectedValues
    .map((value) => options.find((option) => option.value === value)?.label || value)
    .filter(Boolean);
  return {
    answerValue: firstValue || undefined,
    answerText: labels.join(", ") || fallbackAnswerText || undefined,
    selectedValues,
    variantId: variantKey ?? undefined,
  };
}

export default function SurveyQuestionField({
  question,
  value,
  maxSelectedSections,
  busy = false,
  onChangeValue,
}: SurveyQuestionFieldProps) {
  const variantKeys = listVariantKeys(question);
  const currentVariantKey = normalizeVariantKey(question, value);
  const { options, optionsPrefix } = resolveVariantOptions(question, currentVariantKey);

  const renderVariantSelector = variantKeys.length > 0 ? (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>문항 옵션 세트</label>
      <select
        className={styles.select}
        disabled={busy}
        value={currentVariantKey ?? "base"}
        onChange={(event) => {
          const nextVariantKey = event.target.value;
          const nextOptions = resolveVariantOptions(question, nextVariantKey).options;
          if (question.type === "multi") {
            const selectedValues = clampByVariantOptions(toMultiValues(value), nextOptions);
            onChangeValue(
              question,
              withVariantAnswer(nextVariantKey, selectedValues, nextOptions)
            );
            return;
          }
          const currentValue = toInputValue(value).trim();
          const validValue = nextOptions.some((option) => option.value === currentValue)
            ? currentValue
            : "";
          onChangeValue(
            question,
            withVariantAnswer(
              nextVariantKey,
              validValue ? [validValue] : [],
              nextOptions,
              validValue
            )
          );
        }}
      >
        {variantKeys.map((variantKey) => (
          <option key={`variant-${question.key}-${variantKey}`} value={variantKey}>
            {variantLabel(variantKey)}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  if (question.type === "multi") {
    const selected = new Set(clampByVariantOptions(toMultiValues(value), options));
    const maxSelect =
      question.maxSelect ||
      question.constraints?.maxSelections ||
      maxSelectedSections;
    return (
      <div className={styles.questionCard}>
        <QuestionHeader question={question} />
        {renderVariantSelector}
        <p className={styles.questionCardHint}>
          {optionsPrefix ? `${optionsPrefix} ` : ""}최대 {maxSelect}개까지 선택할 수 있어요.
        </p>
        <div className={`${styles.actionRow} ${styles.editorChipRow}`}>
          {options.map((option) => (
            <button
              key={`${question.key}-${option.value}`}
              type="button"
              className={selected.has(option.value) ? styles.chipActive : styles.chip}
              disabled={busy}
              onClick={() => {
                const next = new Set(selected);
                if (next.has(option.value)) {
                  next.delete(option.value);
                } else if (next.size < maxSelect) {
                  next.add(option.value);
                }
                const nextValues = [...next].slice(0, maxSelect);
                if (variantKeys.length > 0) {
                  onChangeValue(
                    question,
                    withVariantAnswer(currentVariantKey, nextValues, options)
                  );
                  return;
                }
                onChangeValue(question, nextValues);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "single" && options.length > 0) {
    const currentValue = toInputValue(value);
    return (
      <div className={styles.questionCard}>
        <QuestionHeader question={question} />
        {renderVariantSelector}
        <p className={styles.questionCardHint}>
          {optionsPrefix ? `${optionsPrefix} ` : ""}아래 목록에서 가장 가까운 항목을 선택해 주세요.
        </p>
        <select
          className={styles.select}
          value={currentValue}
          disabled={busy}
          onChange={(event) => {
            const nextValue = event.target.value;
            const selectedLabel =
              options.find((option) => option.value === nextValue)?.label ?? nextValue;
            if (variantKeys.length > 0) {
              onChangeValue(
                question,
                withVariantAnswer(
                  currentVariantKey,
                  nextValue ? [nextValue] : [],
                  options,
                  selectedLabel
                )
              );
              return;
            }
            onChangeValue(question, nextValue);
          }}
        >
          <option value="">항목을 선택해 주세요</option>
          {options.map((option) => (
            <option key={`${question.key}-${option.value}`} value={option.value}>
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
