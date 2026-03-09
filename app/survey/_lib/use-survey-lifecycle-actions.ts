import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import { resetSurveyFlowState } from "./survey-state-reset";

type SurveyPhase = "intro" | "survey" | "calculating" | "result";

type PersistSurveySnapshotInput = {
  answers: PublicSurveyAnswers;
  selectedSections: string[];
  finalize: boolean;
  periodKey?: string | null;
};

type UseSurveyLifecycleActionsInput = {
  authVerified: boolean;
  hasCompletedSubmission: boolean;
  surveyPeriodKey: string | null;
  blockSurveyStartTemporarily: boolean;
  needAuthNoticeText: string;
  storageKey: string;
  setAuthErrorText: Dispatch<SetStateAction<string | null>>;
  setIsRenewalModalOpen: Dispatch<SetStateAction<boolean>>;
  setPhase: Dispatch<SetStateAction<SurveyPhase>>;
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
  setIsSectionTransitioning: Dispatch<SetStateAction<boolean>>;
  setIsResetConfirmModalOpen: Dispatch<SetStateAction<boolean>>;
  restoredSnapshotUpdatedAtRef: MutableRefObject<number>;
  lastRemoteSavedSignatureRef: MutableRefObject<string>;
  lastVisitedSectionIndexRef: MutableRefObject<number>;
  renewalHoldTimerRef: MutableRefObject<number | null>;
  renewalBypassTriggeredRef: MutableRefObject<boolean>;
  persistSurveySnapshot: (input: PersistSurveySnapshotInput) => Promise<void>;
};

export function useSurveyLifecycleActions(input: UseSurveyLifecycleActionsInput) {
  const {
    authVerified,
    hasCompletedSubmission,
    surveyPeriodKey,
    blockSurveyStartTemporarily,
    needAuthNoticeText,
    storageKey,
    setAuthErrorText,
    setIsRenewalModalOpen,
    setPhase,
    setAnswers,
    setSelectedSectionsCommitted,
    setCurrentSectionIndex,
    setFocusedQuestionBySection,
    setConfirmedQuestionKeys,
    setCompletedSectionKeys,
    setErrorText,
    setErrorQuestionKey,
    setResult,
    setHasCompletedSubmission,
    setIsSectionTransitioning,
    setIsResetConfirmModalOpen,
    restoredSnapshotUpdatedAtRef,
    lastRemoteSavedSignatureRef,
    lastVisitedSectionIndexRef,
    renewalHoldTimerRef,
    renewalBypassTriggeredRef,
    persistSurveySnapshot,
  } = input;

  const resetSurveyState = useCallback(() => {
    resetSurveyFlowState({
      storageKey,
      restoredSnapshotUpdatedAtRef,
      lastRemoteSavedSignatureRef,
      lastVisitedSectionIndexRef,
      setAnswers,
      setSelectedSectionsCommitted,
      setCurrentSectionIndex,
      setFocusedQuestionBySection,
      setConfirmedQuestionKeys,
      setCompletedSectionKeys,
      setErrorText,
      setErrorQuestionKey,
      setResult,
      setHasCompletedSubmission,
      setIsSectionTransitioning,
    });
  }, [
    lastRemoteSavedSignatureRef,
    lastVisitedSectionIndexRef,
    restoredSnapshotUpdatedAtRef,
    setAnswers,
    setCompletedSectionKeys,
    setConfirmedQuestionKeys,
    setCurrentSectionIndex,
    setErrorQuestionKey,
    setErrorText,
    setFocusedQuestionBySection,
    setHasCompletedSubmission,
    setIsSectionTransitioning,
    setResult,
    setSelectedSectionsCommitted,
    storageKey,
  ]);

  const handleReset = useCallback(() => {
    resetSurveyState();
    setIsResetConfirmModalOpen(false);
    setPhase("intro");
    if (authVerified) {
      void persistSurveySnapshot({
        answers: {},
        selectedSections: [],
        finalize: false,
        periodKey: surveyPeriodKey,
      }).catch(() => null);
    }
  }, [
    authVerified,
    persistSurveySnapshot,
    resetSurveyState,
    setIsResetConfirmModalOpen,
    setPhase,
    surveyPeriodKey,
  ]);

  const requestReset = useCallback(() => {
    setIsResetConfirmModalOpen(true);
  }, [setIsResetConfirmModalOpen]);

  const handleRenewalHoldEnd = useCallback(() => {
    if (renewalHoldTimerRef.current != null) {
      window.clearTimeout(renewalHoldTimerRef.current);
      renewalHoldTimerRef.current = null;
    }
  }, [renewalHoldTimerRef]);

  const handleRenewalHoldStart = useCallback(() => {
    handleRenewalHoldEnd();
    renewalBypassTriggeredRef.current = false;
    renewalHoldTimerRef.current = window.setTimeout(() => {
      renewalBypassTriggeredRef.current = true;
      setIsRenewalModalOpen(false);
      setPhase("survey");
    }, 2000);
  }, [
    handleRenewalHoldEnd,
    renewalBypassTriggeredRef,
    renewalHoldTimerRef,
    setIsRenewalModalOpen,
    setPhase,
  ]);

  const handleStartSurvey = useCallback(() => {
    if (!authVerified) {
      setAuthErrorText(needAuthNoticeText);
      return;
    }
    setAuthErrorText(null);
    if (blockSurveyStartTemporarily) {
      setIsRenewalModalOpen(true);
      return;
    }
    if (hasCompletedSubmission) {
      resetSurveyState();
      if (authVerified) {
        void persistSurveySnapshot({
          answers: {},
          selectedSections: [],
          finalize: false,
          periodKey: surveyPeriodKey,
        }).catch(() => null);
      }
    }
    setPhase("survey");
  }, [
    authVerified,
    blockSurveyStartTemporarily,
    hasCompletedSubmission,
    needAuthNoticeText,
    persistSurveySnapshot,
    resetSurveyState,
    setAuthErrorText,
    setIsRenewalModalOpen,
    setPhase,
    surveyPeriodKey,
  ]);

  return {
    requestReset,
    handleReset,
    handleStartSurvey,
    handleRenewalHoldStart,
    handleRenewalHoldEnd,
  };
}
