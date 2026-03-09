import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";

type ResetSurveyFlowStateInput = {
  storageKey: string;
  restoredSnapshotUpdatedAtMs?: number;
  restoredSnapshotUpdatedAtRef: MutableRefObject<number>;
  lastRemoteSavedSignatureRef: MutableRefObject<string>;
  lastVisitedSectionIndexRef: MutableRefObject<number>;
  setAnswers: Dispatch<SetStateAction<PublicSurveyAnswers>>;
  setSelectedSectionsCommitted: Dispatch<SetStateAction<string[]>>;
  setCurrentSectionIndex: Dispatch<SetStateAction<number>>;
  setFocusedQuestionBySection: Dispatch<SetStateAction<Record<string, string>>>;
  setConfirmedQuestionKeys: Dispatch<SetStateAction<string[]>>;
  setCompletedSectionKeys: Dispatch<SetStateAction<string[]>>;
  setErrorText: Dispatch<SetStateAction<string | null>>;
  setErrorQuestionKey: Dispatch<SetStateAction<string | null>>;
  setResult: Dispatch<SetStateAction<WellnessComputedResult | null>>;
  setHasCompletedSubmission: Dispatch<SetStateAction<boolean>>;
  setIsSectionTransitioning?: Dispatch<SetStateAction<boolean>>;
};

export function resetSurveyFlowState(input: ResetSurveyFlowStateInput) {
  input.setAnswers({});
  input.setSelectedSectionsCommitted([]);
  input.setCurrentSectionIndex(0);
  input.setFocusedQuestionBySection({});
  input.setConfirmedQuestionKeys([]);
  input.setCompletedSectionKeys([]);
  input.setErrorText(null);
  input.setErrorQuestionKey(null);
  input.setResult(null);
  input.setHasCompletedSubmission(false);
  input.setIsSectionTransitioning?.(false);
  input.restoredSnapshotUpdatedAtRef.current =
    input.restoredSnapshotUpdatedAtMs ?? Date.now();
  input.lastRemoteSavedSignatureRef.current = "";
  input.lastVisitedSectionIndexRef.current = 0;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(input.storageKey);
  }
}
