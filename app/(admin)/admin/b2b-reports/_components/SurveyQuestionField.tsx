import styles from "@/components/b2b/B2bUx.module.css";
import { toInputValue, toMultiValues } from "../_lib/client-utils";
import type { SurveyQuestion } from "../_lib/client-types";
import {
  buildGroupAnswer,
  clampByVariantOptions,
  listVariantKeys,
  normalizeVariantKey,
  resolveGroupFieldValues,
  resolveVariantOptions,
  variantLabel,
  withVariantAnswer,
} from "./SurveyQuestionField.helpers";

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
  const variantKeys = listVariantKeys(question);
  const currentVariantKey = normalizeVariantKey(question, value);
  const { options, optionsPrefix } = resolveVariantOptions(question, currentVariantKey);
  const groupFieldValues = resolveGroupFieldValues(question, value);

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

  const renderHelpText = question.helpText ? (
    <p className={styles.questionCardHint}>{question.helpText}</p>
  ) : null;

  if (question.type === "multi") {
    const selected = new Set(clampByVariantOptions(toMultiValues(value), options));
    const noneOptionValue =
      question.noneOptionValue ??
      options.find((option) => option.isNoneOption === true)?.value ??
      null;
    const maxSelect =
      question.maxSelect ||
      question.constraints?.maxSelections ||
      options.filter((option) => !option.isNoneOption).length ||
      maxSelectedSections;
    return (
      <div className={styles.questionCard}>
        <QuestionHeader question={question} />
        {renderHelpText}
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
                const clickedIsNone = noneOptionValue === option.value;
                if (next.has(option.value)) {
                  next.delete(option.value);
                } else if (clickedIsNone) {
                  next.clear();
                  next.add(option.value);
                } else {
                  if (noneOptionValue) {
                    next.delete(noneOptionValue);
                  }
                  if (next.size < maxSelect) {
                    next.add(option.value);
                  }
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
        {renderHelpText}
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

  if (question.type === "number") {
    const currentValue = toInputValue(value);
    return (
      <div className={styles.questionCard}>
        <QuestionHeader question={question} />
        {renderHelpText}
        <p className={styles.questionCardHint}>
          {question.unit
            ? `숫자만 입력해 주세요 (${question.unit}).`
            : "숫자만 입력해 주세요."}
        </p>
        <input
          className={styles.input}
          type="number"
          inputMode="decimal"
          min={question.constraints?.min}
          max={question.constraints?.max}
          step={question.constraints?.integer ? 1 : "any"}
          value={currentValue}
          disabled={busy}
          onChange={(event) => onChangeValue(question, event.target.value)}
          placeholder={question.placeholder || "숫자를 입력해 주세요"}
        />
      </div>
    );
  }

  if (question.type === "group" && (question.fields?.length ?? 0) > 0) {
    return (
      <div className={styles.questionCard}>
        <QuestionHeader question={question} />
        {renderHelpText}
        <p className={styles.questionCardHint}>
          각 항목을 입력해 주세요.
        </p>
        <div className={styles.stack}>
          {(question.fields ?? []).map((field) => (
            <div key={`${question.key}-${field.id}`} className={styles.field}>
              <label className={styles.fieldLabel}>
                {field.label}
                {field.unit ? ` (${field.unit})` : ""}
              </label>
              <input
                className={styles.input}
                type={field.type === "number" ? "number" : "text"}
                inputMode={field.type === "number" ? "decimal" : undefined}
                min={field.constraints?.min}
                max={field.constraints?.max}
                step={field.constraints?.integer ? 1 : "any"}
                value={groupFieldValues[field.id] ?? ""}
                disabled={busy}
                onChange={(event) => {
                  const nextFieldValues = {
                    ...groupFieldValues,
                    [field.id]: event.target.value,
                  };
                  onChangeValue(question, buildGroupAnswer(question, nextFieldValues));
                }}
                placeholder={`${field.label} 입력`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.questionCard}>
      <QuestionHeader question={question} />
      {renderHelpText}
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
