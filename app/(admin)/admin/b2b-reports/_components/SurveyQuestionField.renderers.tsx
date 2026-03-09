import styles from "@/components/b2b/B2bUx.module.css";
import {
  isNoneLikeOption,
  resolveOptionLayout,
} from "@/app/survey/_lib/survey-page-helpers";
import { toInputValue, toMultiValues } from "../_lib/client-utils";
import type { SurveyQuestion } from "../_lib/client-types";
import {
  buildGroupAnswer,
  clampByVariantOptions,
  listVariantKeys,
  resolveGroupFieldValues,
  resolveVariantOptions,
  withVariantAnswer,
  type ResolvedOption,
} from "./SurveyQuestionField.helpers";
import {
  optionButtonClass,
  QuestionCard,
  type SharedRendererProps,
  VariantSelector,
} from "./SurveyQuestionField.shared";

function toAnswerRecord(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function toMultiOtherTextByValue(raw: unknown) {
  const record = toAnswerRecord(raw);
  const source = record?.otherTextByValue;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  return Object.fromEntries(
    Object.entries(source as Record<string, unknown>)
      .map(([value, text]) => [String(value), String(text ?? "").trim()] as const)
      .filter(([value, text]) => value.trim().length > 0 && text.length > 0)
  );
}

function sanitizeOtherTextByValue(
  options: ResolvedOption[],
  selectedValues: string[],
  otherTextByValue: Record<string, string>
) {
  const selectedSet = new Set(selectedValues);
  const customSet = new Set(
    options.filter((option) => option.allowsCustomInput).map((option) => option.value)
  );
  const sanitized: Record<string, string> = {};
  for (const [value, text] of Object.entries(otherTextByValue)) {
    if (!selectedSet.has(value)) continue;
    if (!customSet.has(value)) continue;
    if (!text.trim()) continue;
    sanitized[value] = text.trim();
  }
  return sanitized;
}

function buildMultiAnswerText(
  selectedValues: string[],
  options: ResolvedOption[],
  otherTextByValue: Record<string, string>
) {
  return selectedValues
    .map((optionValue) => {
      const option = options.find((row) => row.value === optionValue);
      const label = option?.label ?? optionValue;
      const customText = otherTextByValue[optionValue];
      if (option?.allowsCustomInput && customText) return `${label}: ${customText}`;
      return label;
    })
    .join(", ");
}

function buildMultiPayload(input: {
  question: SurveyQuestion;
  selectedValues: string[];
  options: ResolvedOption[];
  variantKey: string | null;
  otherTextByValue: Record<string, string>;
}) {
  const sanitizedOther = sanitizeOtherTextByValue(
    input.options,
    input.selectedValues,
    input.otherTextByValue
  );
  const answerText = buildMultiAnswerText(input.selectedValues, input.options, sanitizedOther);
  if (listVariantKeys(input.question).length > 0) {
    return withVariantAnswer(
      input.variantKey,
      input.selectedValues,
      input.options,
      answerText,
      sanitizedOther
    );
  }
  if (Object.keys(sanitizedOther).length > 0) {
    return {
      selectedValues: input.selectedValues,
      values: input.selectedValues,
      answerValue: input.selectedValues[0] ?? undefined,
      answerText: answerText || undefined,
      otherTextByValue: sanitizedOther,
    };
  }
  return input.selectedValues;
}

export function MultiChoiceQuestionField({
  question,
  value,
  busy,
  maxSelectedSections,
  onChangeValue,
  onRequestAdvance,
  variantKeys,
  currentVariantKey,
  options,
  optionsPrefix,
}: SharedRendererProps) {
  const visibleOptions = options.filter((option) => !isNoneLikeOption(option));
  const selected = new Set(clampByVariantOptions(toMultiValues(value), visibleOptions));
  const maxSelect =
    question.maxSelect ||
    question.constraints?.maxSelections ||
    visibleOptions.length ||
    maxSelectedSections;
  const optionLayout = resolveOptionLayout(visibleOptions);
  const otherTextByValue = toMultiOtherTextByValue(value);
  const selectedCustomOptions = visibleOptions.filter(
    (option) => option.allowsCustomInput && selected.has(option.value)
  );

  const commitSelection = (
    selectedValues: string[],
    customTextByValue: Record<string, string> = otherTextByValue
  ) => {
    onChangeValue(
      question,
      buildMultiPayload({
        question,
        selectedValues,
        options: visibleOptions,
        variantKey: currentVariantKey,
        otherTextByValue: customTextByValue,
      })
    );
  };

  const handleVariantChange = (nextVariantKey: string) => {
    const nextResolved = resolveVariantOptions(question, nextVariantKey);
    const nextVisibleOptions = nextResolved.options.filter((option) => !isNoneLikeOption(option));
    const selectedValues = clampByVariantOptions(toMultiValues(value), nextVisibleOptions);
    const customTextByValue = sanitizeOtherTextByValue(
      nextVisibleOptions,
      selectedValues,
      toMultiOtherTextByValue(value)
    );
    onChangeValue(
      question,
      withVariantAnswer(nextVariantKey, selectedValues, nextVisibleOptions, "", customTextByValue)
    );
  };

  return (
    <QuestionCard question={question} helpText={question.helpText}>
      <VariantSelector
        question={question}
        busy={busy}
        variantKeys={variantKeys}
        currentVariantKey={currentVariantKey}
        onChangeVariant={handleVariantChange}
      />
      <p className={styles.questionCardHint}>
        {optionsPrefix ? `${optionsPrefix} ` : ""}최대 {maxSelect}개까지 선택할 수 있습니다.
        {!question.required ? " 해당 사항이 없으면 선택하지 않고 다음으로 이동해도 됩니다." : ""}
      </p>
      <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
        {visibleOptions.map((option) => {
          const active = selected.has(option.value);
          return (
            <button
              key={`${question.key}-${option.value}`}
              type="button"
              className={optionButtonClass(active, optionLayout.compact)}
              disabled={busy}
              onClick={() => {
                const next = new Set(selected);
                if (next.has(option.value)) next.delete(option.value);
                else if (next.size < maxSelect) next.add(option.value);
                commitSelection([...next].slice(0, maxSelect));
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {selectedCustomOptions.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {selectedCustomOptions.map((option) => (
            <input
              key={`${question.key}-${option.value}-other`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              value={otherTextByValue[option.value] ?? ""}
              disabled={busy}
              onChange={(event) => {
                const nextMap = {
                  ...otherTextByValue,
                  [option.value]: event.target.value,
                };
                if (!nextMap[option.value]?.trim()) delete nextMap[option.value];
                commitSelection([...selected], nextMap);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onRequestAdvance?.(question.key);
              }}
              placeholder={option.label}
            />
          ))}
        </div>
      ) : null}
    </QuestionCard>
  );
}

export function SingleChoiceQuestionField({
  question,
  value,
  busy,
  onChangeValue,
  onRequestAdvance,
  variantKeys,
  currentVariantKey,
  options,
  optionsPrefix,
}: SharedRendererProps) {
  const visibleOptions = options.filter((option) => !isNoneLikeOption(option));
  const currentValue = toInputValue(value).trim();
  const optionLayout = resolveOptionLayout(visibleOptions);

  const handleVariantChange = (nextVariantKey: string) => {
    const nextResolved = resolveVariantOptions(question, nextVariantKey);
    const nextVisibleOptions = nextResolved.options.filter((option) => !isNoneLikeOption(option));
    const validValue = nextVisibleOptions.some((option) => option.value === currentValue)
      ? currentValue
      : "";
    onChangeValue(
      question,
      withVariantAnswer(
        nextVariantKey,
        validValue ? [validValue] : [],
        nextVisibleOptions,
        validValue
      )
    );
  };

  return (
    <QuestionCard question={question} helpText={question.helpText}>
      <VariantSelector
        question={question}
        busy={busy}
        variantKeys={variantKeys}
        currentVariantKey={currentVariantKey}
        onChangeVariant={handleVariantChange}
      />
      <p className={styles.questionCardHint}>
        {optionsPrefix ? `${optionsPrefix} ` : ""}아래 목록에서 가장 가까운 항목을 선택해 주세요.
      </p>
      <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
        {visibleOptions.map((option) => {
          const active = currentValue === option.value;
          return (
            <button
              key={`${question.key}-${option.value}`}
              type="button"
              className={optionButtonClass(active, optionLayout.compact)}
              disabled={busy}
              onClick={() => {
                const nextValue = option.value;
                const selectedLabel =
                  visibleOptions.find((row) => row.value === nextValue)?.label ?? nextValue;
                const committedValue =
                  variantKeys.length > 0
                    ? withVariantAnswer(currentVariantKey, [nextValue], visibleOptions, selectedLabel)
                    : nextValue;
                onChangeValue(question, committedValue);
                window.setTimeout(() => {
                  onRequestAdvance?.(question.key, committedValue);
                }, 0);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </QuestionCard>
  );
}

export function NumberQuestionField({
  question,
  value,
  busy,
  onChangeValue,
  onRequestAdvance,
}: SharedRendererProps) {
  return (
    <QuestionCard question={question} helpText={question.helpText}>
      <p className={styles.questionCardHint}>
        {question.unit ? `숫자만 입력해 주세요(${question.unit}).` : "숫자만 입력해 주세요."}
      </p>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 sm:text-lg"
        type="text"
        inputMode="decimal"
        pattern="[0-9.]*"
        value={toInputValue(value)}
        disabled={busy}
        onChange={(event) => onChangeValue(question, event.target.value.replace(/[^0-9.]/g, ""))}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          onRequestAdvance?.(question.key);
        }}
        placeholder={question.placeholder || "숫자를 입력해 주세요."}
      />
    </QuestionCard>
  );
}

export function GroupQuestionField({
  question,
  value,
  busy,
  onChangeValue,
  onRequestAdvance,
}: SharedRendererProps) {
  const groupFieldValues = resolveGroupFieldValues(question, value);
  return (
    <QuestionCard question={question} helpText={question.helpText}>
      <p className={styles.questionCardHint}>각 항목을 입력해 주세요.</p>
      <div
        className={`grid gap-3 ${
          (question.fields?.length ?? 0) >= 2 ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {(question.fields ?? []).map((field, index) => (
          <div key={`${question.key}-${field.id}`} className={styles.field}>
            <label className={styles.fieldLabel}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </label>
            <input
              id={`${question.key}-${field.id}`}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              type="text"
              inputMode={field.type === "number" ? "decimal" : "text"}
              pattern={field.type === "number" ? "[0-9.]*" : undefined}
              value={groupFieldValues[field.id] ?? ""}
              disabled={busy}
              onChange={(event) => {
                const nextFieldValues = {
                  ...groupFieldValues,
                  [field.id]:
                    field.type === "number"
                      ? event.target.value.replace(/[^0-9.]/g, "")
                      : event.target.value,
                };
                onChangeValue(question, buildGroupAnswer(question, nextFieldValues));
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const nextField = (question.fields ?? [])[index + 1];
                if (nextField) {
                  const nextNode = document.getElementById(
                    `${question.key}-${nextField.id}`
                  ) as HTMLInputElement | null;
                  nextNode?.focus();
                  return;
                }
                onRequestAdvance?.(question.key);
              }}
              placeholder={`${field.label} 입력`}
            />
          </div>
        ))}
      </div>
    </QuestionCard>
  );
}

export function TextQuestionField({
  question,
  value,
  busy,
  onChangeValue,
  onRequestAdvance,
}: SharedRendererProps) {
  return (
    <QuestionCard question={question} helpText={question.helpText}>
      <p className={styles.questionCardHint}>자유 문장으로 응답을 입력해 주세요.</p>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 sm:text-lg"
        value={toInputValue(value)}
        disabled={busy}
        onChange={(event) => onChangeValue(question, event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          onRequestAdvance?.(question.key);
        }}
        placeholder={question.placeholder || "응답을 입력해 주세요."}
      />
    </QuestionCard>
  );
}
