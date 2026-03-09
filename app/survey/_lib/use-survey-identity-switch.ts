import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { deleteEmployeeSession } from "@/app/(features)/employee-report/_lib/api";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import { clearStoredIdentity } from "@/app/(features)/employee-report/_lib/client-utils";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import { resetSurveyFlowState } from "./survey-state-reset";

type SurveyPhase = "intro" | "survey" | "calculating" | "result";
type AuthBusyState = "idle" | "session" | "init" | "sign" | "sync";

type UseSurveyIdentitySwitchInput = {
  authBusy: AuthBusyState;
  storageKey: string;
  noticeSwitchedIdentityText: string;
  remoteSurveyBootstrappedRef: MutableRefObject<boolean>;
  restoredSnapshotUpdatedAtRef: MutableRefObject<number>;
  lastRemoteSavedSignatureRef: MutableRefObject<string>;
  lastVisitedSectionIndexRef: MutableRefObject<number>;
  setAuthBusy: Dispatch<SetStateAction<AuthBusyState>>;
  setIdentity: Dispatch<SetStateAction<IdentityInput>>;
  setAuthVerified: Dispatch<SetStateAction<boolean>>;
  setIdentityEditable: Dispatch<SetStateAction<boolean>>;
  setAuthPendingSign: Dispatch<SetStateAction<boolean>>;
  setAuthErrorText: Dispatch<SetStateAction<string | null>>;
  setAuthNoticeText: Dispatch<SetStateAction<string | null>>;
  setSurveyPeriodKey: Dispatch<SetStateAction<string | null>>;
  setSurveySyncReady: Dispatch<SetStateAction<boolean>>;
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
};

export function useSurveyIdentitySwitch({
  authBusy,
  storageKey,
  noticeSwitchedIdentityText,
  remoteSurveyBootstrappedRef,
  restoredSnapshotUpdatedAtRef,
  lastRemoteSavedSignatureRef,
  lastVisitedSectionIndexRef,
  setAuthBusy,
  setIdentity,
  setAuthVerified,
  setIdentityEditable,
  setAuthPendingSign,
  setAuthErrorText,
  setAuthNoticeText,
  setSurveyPeriodKey,
  setSurveySyncReady,
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
}: UseSurveyIdentitySwitchInput) {
  const handleSwitchIdentity = useCallback(async () => {
    if (authBusy !== "idle") return;
    setAuthBusy("session");
    try {
      await deleteEmployeeSession().catch(() => null);
      setIdentity({ name: "", birthDate: "", phone: "" });
      setAuthVerified(false);
      setIdentityEditable(true);
      setAuthPendingSign(false);
      setAuthErrorText(null);
      setAuthNoticeText(noticeSwitchedIdentityText);
      setSurveyPeriodKey(null);
      setSurveySyncReady(false);
      setPhase("intro");
      remoteSurveyBootstrappedRef.current = false;
      resetSurveyFlowState({
        storageKey,
        restoredSnapshotUpdatedAtMs: 0,
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
      clearStoredIdentity();
      emitAuthSyncEvent({
        scope: "b2b-employee-session",
        reason: "survey-session-cleared",
      });
    } finally {
      setAuthBusy("idle");
    }
  }, [
    authBusy,
    lastRemoteSavedSignatureRef,
    lastVisitedSectionIndexRef,
    noticeSwitchedIdentityText,
    remoteSurveyBootstrappedRef,
    restoredSnapshotUpdatedAtRef,
    setAnswers,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setCompletedSectionKeys,
    setConfirmedQuestionKeys,
    setCurrentSectionIndex,
    setErrorQuestionKey,
    setErrorText,
    setFocusedQuestionBySection,
    setHasCompletedSubmission,
    setIdentity,
    setIdentityEditable,
    setIsSectionTransitioning,
    setPhase,
    setResult,
    setSelectedSectionsCommitted,
    setSurveyPeriodKey,
    setSurveySyncReady,
    storageKey,
  ]);

  return {
    handleSwitchIdentity,
  };
}
