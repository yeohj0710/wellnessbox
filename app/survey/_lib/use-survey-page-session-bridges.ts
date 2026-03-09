import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { normalizeSurveyAnswersByTemplate, type PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import { saveStoredIdentity } from "@/app/(features)/employee-report/_lib/client-utils";
import { toIdentityPayload } from "@/app/survey/_lib/survey-page-auto-compute";
import { tryComputeSurveyResultFromAnswers } from "@/app/survey/_lib/survey-result-derivation";
import { deriveRemoteSurveySnapshotState } from "@/app/survey/_lib/survey-page-persistence";
import type { EmployeeSurveyResponsePayload } from "@/app/survey/_lib/use-survey-remote-sync";

type UseSurveyRemoteSnapshotAdapterInput = {
  template: WellnessSurveyTemplate;
  maxSelectedSections: number;
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
  restoredSnapshotUpdatedAtRef: MutableRefObject<number>;
  lastVisitedSectionIndexRef: MutableRefObject<number>;
  setAnswers: Dispatch<SetStateAction<PublicSurveyAnswers>>;
  setSelectedSectionsCommitted: Dispatch<SetStateAction<string[]>>;
  setCurrentSectionIndex: Dispatch<SetStateAction<number>>;
  setFocusedQuestionBySection: Dispatch<SetStateAction<Record<string, string>>>;
  setHasCompletedSubmission: Dispatch<SetStateAction<boolean>>;
  setConfirmedQuestionKeys: Dispatch<SetStateAction<string[]>>;
  setCompletedSectionKeys: Dispatch<SetStateAction<string[]>>;
  setSurveyPeriodKey: Dispatch<SetStateAction<string | null>>;
  setResult: Dispatch<SetStateAction<WellnessComputedResult | null>>;
};

export function saveSurveyIdentity(input: IdentityInput) {
  saveStoredIdentity(toIdentityPayload(input));
}

export function useSurveyRemoteSnapshotAdapter({
  template,
  maxSelectedSections,
  sectionTitleMap,
  commonSectionTitle,
  restoredSnapshotUpdatedAtRef,
  lastVisitedSectionIndexRef,
  setAnswers,
  setSelectedSectionsCommitted,
  setCurrentSectionIndex,
  setFocusedQuestionBySection,
  setHasCompletedSubmission,
  setConfirmedQuestionKeys,
  setCompletedSectionKeys,
  setSurveyPeriodKey,
  setResult,
}: UseSurveyRemoteSnapshotAdapterInput) {
  return useCallback(
    (input: {
      response: EmployeeSurveyResponsePayload;
      periodKey: string | null;
    }) => {
      const normalizedAnswers = normalizeSurveyAnswersByTemplate(
        template,
        (input.response.answersJson ?? {}) as PublicSurveyAnswers
      );
      const nextSurveyState = deriveRemoteSurveySnapshotState({
        template,
        maxSelectedSections,
        sectionTitleMap,
        commonSectionTitle,
        answers: normalizedAnswers,
        selectedSections: input.response.selectedSections ?? [],
        submittedAt: input.response.submittedAt,
      });

      setAnswers(nextSurveyState.answers);
      setSelectedSectionsCommitted(nextSurveyState.selectedSections);
      setCurrentSectionIndex(nextSurveyState.currentSectionIndex);
      setFocusedQuestionBySection(nextSurveyState.focusedQuestionBySection);
      setHasCompletedSubmission(Boolean(input.response.submittedAt));
      setConfirmedQuestionKeys(nextSurveyState.confirmedQuestionKeys);
      setCompletedSectionKeys(nextSurveyState.completedSectionKeys);
      lastVisitedSectionIndexRef.current = nextSurveyState.currentSectionIndex;
      setSurveyPeriodKey(input.periodKey);
      setResult(
        input.response.submittedAt
          ? tryComputeSurveyResultFromAnswers({
              template,
              answers: nextSurveyState.answers,
              selectedSections: nextSurveyState.selectedSections,
            })
          : null
      );
      const updatedMs = new Date(input.response.updatedAt).getTime();
      restoredSnapshotUpdatedAtRef.current = Number.isFinite(updatedMs) ? updatedMs : Date.now();
    },
    [
      commonSectionTitle,
      lastVisitedSectionIndexRef,
      maxSelectedSections,
      restoredSnapshotUpdatedAtRef,
      sectionTitleMap,
      setAnswers,
      setCompletedSectionKeys,
      setConfirmedQuestionKeys,
      setCurrentSectionIndex,
      setFocusedQuestionBySection,
      setHasCompletedSubmission,
      setResult,
      setSelectedSectionsCommitted,
      setSurveyPeriodKey,
      template,
    ]
  );
}
