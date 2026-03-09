import {
  GroupQuestionField,
  MultiChoiceQuestionField,
  NumberQuestionField,
  SingleChoiceQuestionField,
  TextQuestionField,
} from "./SurveyQuestionField.renderers";
import {
  listVariantKeys,
  normalizeVariantKey,
  resolveVariantOptions,
} from "./SurveyQuestionField.helpers";
import type { SurveyQuestionFieldProps } from "./SurveyQuestionField.shared";

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

  const sharedProps = {
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
  };

  switch (question.type) {
    case "multi":
      return <MultiChoiceQuestionField {...sharedProps} />;
    case "single":
      return <SingleChoiceQuestionField {...sharedProps} />;
    case "number":
      return <NumberQuestionField {...sharedProps} />;
    case "group":
      if ((question.fields?.length ?? 0) > 0) {
        return <GroupQuestionField {...sharedProps} />;
      }
      return <TextQuestionField {...sharedProps} />;
    case "text":
    default:
      return <TextQuestionField {...sharedProps} />;
  }
}
