import SurveyQuestionField from "./SurveyQuestionField";
import type { SurveyQuestion } from "../_lib/client-types";
import type { SurveySectionGroup } from "../_lib/survey-editor-sections";

type B2bSurveyEditorQuestionListProps = {
  currentSection: SurveySectionGroup | null;
  surveyAnswers: Record<string, unknown>;
  maxSelectedSections: number;
  busy: boolean;
  focusedQuestionKey: string | null;
  errorQuestionKey: string | null;
  errorText: string | null;
  onSetQuestionRef: (questionKey: string, nodeRef: HTMLDivElement | null) => void;
  onFocusQuestion: (sectionKey: string, questionKey: string) => void;
  onSetAnswerValue: (question: SurveyQuestion, value: unknown) => void;
  onClearErrorForQuestion: (questionKey: string) => void;
  onRequestAdvance: (questionKey: string, pendingValue?: unknown) => void;
};

export default function B2bSurveyEditorQuestionList({
  currentSection,
  surveyAnswers,
  maxSelectedSections,
  busy,
  focusedQuestionKey,
  errorQuestionKey,
  errorText,
  onSetQuestionRef,
  onFocusQuestion,
  onSetAnswerValue,
  onClearErrorForQuestion,
  onRequestAdvance,
}: B2bSurveyEditorQuestionListProps) {
  return (
    <section className="space-y-3">
      {currentSection && currentSection.questions.length > 0 ? (
        currentSection.questions.map((question) => {
          const isFocused = focusedQuestionKey === question.key;
          return (
            <div
              key={question.key}
              ref={(nodeRef) => {
                onSetQuestionRef(question.key, nodeRef);
              }}
              className={`rounded-2xl border p-0 transition ${
                isFocused
                  ? "border-sky-300 bg-sky-50/30 shadow-[0_12px_30px_-20px_rgba(56,189,248,0.85)]"
                  : "border-slate-200 bg-white"
              }`}
              onClick={() => onFocusQuestion(currentSection.key, question.key)}
            >
              <SurveyQuestionField
                question={question as SurveyQuestion}
                value={surveyAnswers[question.key]}
                maxSelectedSections={maxSelectedSections}
                busy={busy}
                onChangeValue={(nextQuestion, nextValue) => {
                  onSetAnswerValue(nextQuestion, nextValue);
                  onClearErrorForQuestion(nextQuestion.key);
                }}
                onRequestAdvance={onRequestAdvance}
              />
              {errorQuestionKey === question.key && errorText ? (
                <p className="px-5 pb-4 text-sm font-medium text-rose-600">{errorText}</p>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          선택한 섹션에 현재 표시할 문항이 없습니다. 다른 영역 선택이나 조건 문항(C27)을 먼저 확인해 주세요.
        </div>
      )}
    </section>
  );
}
