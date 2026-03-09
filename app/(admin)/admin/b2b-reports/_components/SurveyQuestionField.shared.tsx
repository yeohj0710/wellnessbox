import type { ReactNode } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import { toDisplayQuestionText } from "@/app/survey/_lib/survey-page-helpers";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import type { SurveyQuestion } from "../_lib/client-types";
import {
  variantLabel,
  type ResolvedOption,
} from "./SurveyQuestionField.helpers";

export type SurveyQuestionFieldProps = {
  question: SurveyQuestion;
  value: unknown;
  maxSelectedSections: number;
  busy?: boolean;
  onChangeValue: (question: SurveyQuestion, value: unknown) => void;
  onRequestAdvance?: (questionKey: string, pendingValue?: unknown) => void;
};

export type SharedRendererProps = {
  question: SurveyQuestion;
  value: unknown;
  busy: boolean;
  maxSelectedSections: number;
  onChangeValue: (question: SurveyQuestion, value: unknown) => void;
  onRequestAdvance?: (questionKey: string, pendingValue?: unknown) => void;
  variantKeys: string[];
  currentVariantKey: string | null;
  options: ResolvedOption[];
  optionsPrefix?: string;
};

const QUESTION_CARD_CLASS = `${styles.questionCard} rounded-2xl border border-slate-200 bg-white p-4 sm:p-5`;

export function optionButtonClass(active: boolean, compact: boolean) {
  const sizeClass = compact
    ? "min-h-[40px] px-2 py-2 text-center text-[11px] leading-snug break-keep sm:min-h-[46px] sm:px-3 sm:py-2.5 sm:text-[13px]"
    : "min-h-[44px] px-3 py-2.5 text-left text-[13px] leading-tight break-keep sm:min-h-[50px] sm:px-4 sm:py-3 sm:text-sm";
  const stateClass = active
    ? "border-sky-400 bg-sky-50 text-sky-900"
    : "border-gray-200 bg-white text-gray-700 hover:border-sky-200 hover:bg-sky-50";
  return `rounded-xl border transition ${sizeClass} ${stateClass}`;
}

function QuestionHeader({ question }: { question: SurveyQuestion }) {
  const isRequired = Boolean(question.required);
  return (
    <div className={styles.questionCardHead}>
      <p className={styles.questionCardTitle}>
        {question.index}.{" "}
        {toDisplayQuestionText(question as WellnessSurveyQuestionForTemplate) || question.key}
      </p>
      {isRequired ? (
        <span className={styles.requiredBadge}>필수</span>
      ) : (
        <span className={styles.optionalBadge}>선택</span>
      )}
    </div>
  );
}

export function QuestionCard({
  question,
  helpText,
  children,
}: {
  question: SurveyQuestion;
  helpText?: string;
  children: ReactNode;
}) {
  return (
    <div className={QUESTION_CARD_CLASS}>
      <QuestionHeader question={question} />
      {helpText ? <p className={styles.questionCardHint}>{helpText}</p> : null}
      {children}
    </div>
  );
}

export function VariantSelector({
  question,
  busy,
  variantKeys,
  currentVariantKey,
  onChangeVariant,
}: {
  question: SurveyQuestion;
  busy: boolean;
  variantKeys: string[];
  currentVariantKey: string | null;
  onChangeVariant: (nextVariantKey: string) => void;
}) {
  if (variantKeys.length === 0) return null;
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>문항 옵션 세트</label>
      <select
        className={styles.select}
        disabled={busy}
        value={currentVariantKey ?? "base"}
        onChange={(event) => onChangeVariant(event.target.value)}
      >
        {variantKeys.map((variantKey) => (
          <option key={`variant-${question.key}-${variantKey}`} value={variantKey}>
            {variantLabel(variantKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
