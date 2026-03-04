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
  type ResolvedOption,
} from "./SurveyQuestionField.helpers";

type SurveyQuestionFieldProps = {
  question: SurveyQuestion;
  value: unknown;
  maxSelectedSections: number;
  busy?: boolean;
  onChangeValue: (question: SurveyQuestion, value: unknown) => void;
  onRequestAdvance?: (questionKey: string) => void;
};

function toAnswerRecord(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDisplayQuestionText(question: SurveyQuestion) {
  let text = (question.text ?? "")
    .replace(/\s*만\s*\(\s*\)\s*세/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/해주십시오/g, "해 주세요")
    .replace(/기재해/g, "입력해")
    .replace(/\s+/g, " ")
    .trim();

  if (question.type === "group" && (question.fields?.length ?? 0) > 0) {
    const trailingUnits = (question.fields ?? [])
      .map((field) => {
        const label = (field.label ?? "").trim();
        if (!label) return "";
        const unit = (field.unit ?? "").trim();
        if (!unit) return escapeRegExp(label);
        return `${escapeRegExp(label)}\\s*\\(?\\s*${escapeRegExp(unit)}\\s*\\)?`;
      })
      .filter(Boolean);
    if (trailingUnits.length > 0) {
      const trailingPattern = new RegExp(
        `(?:\\s*[:,-]?\\s*)?(?:${trailingUnits.join("\\s+")})\\s*$`,
        "i"
      );
      text = text.replace(trailingPattern, "").trim();
    }
  }

  return text.replace(/\s+[,.]$/g, "").trim();
}

function isNoneLikeOption(option: { label?: string | null; value?: string | null }) {
  const normalized = `${option.label ?? ""}${option.value ?? ""}`.replace(/\s+/g, "").toLowerCase();
  return normalized === "없음" || normalized.includes("해당없음") || normalized === "none";
}

function resolveOptionLayout(options: Array<{ label?: string | null }>) {
  const count = options.length;
  const lengths = options.map((option) => (option.label ?? "").replace(/\s+/g, "").length);
  const maxLabelLength = lengths.length > 0 ? Math.max(...lengths) : 0;
  const avgLabelLength =
    lengths.length > 0
      ? Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length)
      : 0;
  const shortLabelRatio =
    lengths.length > 0 ? lengths.filter((len) => len <= 7).length / lengths.length : 0;

  if (count <= 1) return { gridClass: "grid-cols-1", compact: false };
  if (count === 2) return { gridClass: "grid-cols-2", compact: false };

  const canUseThreeCols = count >= 9 && shortLabelRatio >= 0.65 && avgLabelLength <= 8;
  if (canUseThreeCols) {
    if (count >= 12) return { gridClass: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5", compact: true };
    return { gridClass: "grid-cols-3 sm:grid-cols-4", compact: true };
  }

  if (count <= 6) return { gridClass: "grid-cols-2 sm:grid-cols-3", compact: false };
  return { gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", compact: count >= 10 && maxLabelLength <= 10 };
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
  const customSet = new Set(options.filter((option) => option.allowsCustomInput).map((option) => option.value));
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

function QuestionHeader({ question }: { question: SurveyQuestion }) {
  return (
    <div className={styles.questionCardHead}>
      <p className={styles.questionCardTitle}>
        {question.index}. {toDisplayQuestionText(question) || question.key}
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
  onRequestAdvance,
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
            const otherTextByValue = sanitizeOtherTextByValue(
              nextOptions,
              selectedValues,
              toMultiOtherTextByValue(value)
            );
            onChangeValue(
              question,
              withVariantAnswer(nextVariantKey, selectedValues, nextOptions, "", otherTextByValue)
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

    return (
      <div className={`${styles.questionCard} rounded-2xl border border-slate-200 bg-white p-4 sm:p-5`}>
        <QuestionHeader question={question} />
        {renderHelpText}
        {renderVariantSelector}
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
                className={`rounded-xl border transition ${
                  optionLayout.compact
                    ? "min-h-[40px] px-2 py-2 text-center text-[11px] leading-snug break-keep sm:min-h-[46px] sm:px-3 sm:py-2.5 sm:text-[13px]"
                    : "min-h-[44px] px-3 py-2.5 text-left text-[13px] leading-tight break-keep sm:min-h-[50px] sm:px-4 sm:py-3 sm:text-sm"
                } ${
                  active
                    ? "border-sky-400 bg-sky-50 text-sky-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-sky-200 hover:bg-sky-50"
                }`}
                disabled={busy}
                onClick={() => {
                  const next = new Set(selected);
                  if (next.has(option.value)) next.delete(option.value);
                  else if (next.size < maxSelect) next.add(option.value);
                  const nextValues = [...next].slice(0, maxSelect);
                  commitSelection(nextValues);
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
      </div>
    );
  }

  if (question.type === "single" && options.length > 0) {
    const visibleOptions = options.filter((option) => !isNoneLikeOption(option));
    const currentValue = toInputValue(value).trim();
    const optionLayout = resolveOptionLayout(visibleOptions);
    return (
      <div className={`${styles.questionCard} rounded-2xl border border-slate-200 bg-white p-4 sm:p-5`}>
        <QuestionHeader question={question} />
        {renderHelpText}
        {renderVariantSelector}
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
                className={`rounded-xl border transition ${
                  optionLayout.compact
                    ? "min-h-[40px] px-2 py-2 text-center text-[11px] leading-snug break-keep sm:min-h-[46px] sm:px-3 sm:py-2.5 sm:text-[13px]"
                    : "min-h-[44px] px-3 py-2.5 text-left text-[13px] leading-tight break-keep sm:min-h-[50px] sm:px-4 sm:py-3 sm:text-sm"
                } ${
                  active
                    ? "border-sky-400 bg-sky-50 text-sky-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-sky-200 hover:bg-sky-50"
                }`}
                disabled={busy}
                onClick={() => {
                  const nextValue = option.value;
                  const selectedLabel =
                    visibleOptions.find((row) => row.value === nextValue)?.label ?? nextValue;
                  if (variantKeys.length > 0) {
                    onChangeValue(
                      question,
                      withVariantAnswer(currentVariantKey, [nextValue], visibleOptions, selectedLabel)
                    );
                  } else {
                    onChangeValue(question, nextValue);
                  }
                  window.setTimeout(() => {
                    onRequestAdvance?.(question.key);
                  }, 0);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "number") {
    const currentValue = toInputValue(value);
    return (
      <div className={`${styles.questionCard} rounded-2xl border border-slate-200 bg-white p-4 sm:p-5`}>
        <QuestionHeader question={question} />
        {renderHelpText}
        <p className={styles.questionCardHint}>
          {question.unit ? `숫자만 입력해 주세요 (${question.unit}).` : "숫자만 입력해 주세요."}
        </p>
        <input
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 sm:text-lg"
          type="text"
          inputMode="decimal"
          pattern="[0-9]*"
          value={currentValue}
          disabled={busy}
          onChange={(event) =>
            onChangeValue(question, event.target.value.replace(/[^0-9.]/g, ""))
          }
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            onRequestAdvance?.(question.key);
          }}
          placeholder={question.placeholder || "숫자를 입력해 주세요"}
        />
      </div>
    );
  }

  if (question.type === "group" && (question.fields?.length ?? 0) > 0) {
    return (
      <div className={`${styles.questionCard} rounded-2xl border border-slate-200 bg-white p-4 sm:p-5`}>
        <QuestionHeader question={question} />
        {renderHelpText}
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
                pattern={field.type === "number" ? "[0-9]*" : undefined}
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
      </div>
    );
  }

  return (
    <div className={`${styles.questionCard} rounded-2xl border border-slate-200 bg-white p-4 sm:p-5`}>
      <QuestionHeader question={question} />
      {renderHelpText}
      <p className={styles.questionCardHint}>자유 문장으로 답변을 입력해 주세요.</p>
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
        placeholder={question.placeholder || "답변을 입력해 주세요"}
      />
    </div>
  );
}
