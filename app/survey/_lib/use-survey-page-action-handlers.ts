import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import { normalizeDigits } from "./survey-page-auto-compute";

type SurveyPhase = "intro" | "survey" | "calculating" | "result";

type UseSurveyPageActionHandlersInput = {
  setIdentity: Dispatch<SetStateAction<IdentityInput>>;
  setPhase: Dispatch<SetStateAction<SurveyPhase>>;
  setResult: Dispatch<SetStateAction<WellnessComputedResult | null>>;
  setHasCompletedSubmission: Dispatch<SetStateAction<boolean>>;
  setIsRenewalModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsResetConfirmModalOpen: Dispatch<SetStateAction<boolean>>;
  handleStartKakaoAuth: () => Promise<void>;
  handleConfirmKakaoAuth: () => Promise<void>;
  handleSwitchIdentity: () => Promise<void>;
  handleRenewalHoldEnd: () => void;
  resultSummary: WellnessComputedResult | null;
};

export function useSurveyPageActionHandlers({
  setIdentity,
  setPhase,
  setResult,
  setHasCompletedSubmission,
  setIsRenewalModalOpen,
  setIsResetConfirmModalOpen,
  handleStartKakaoAuth,
  handleConfirmKakaoAuth,
  handleSwitchIdentity,
  handleRenewalHoldEnd,
  resultSummary,
}: UseSurveyPageActionHandlersInput) {
  const handleNameChange = useCallback(
    (value: string) => {
      setIdentity((prev) => ({
        ...prev,
        name: value,
      }));
    },
    [setIdentity]
  );

  const handleBirthDateChange = useCallback(
    (value: string) => {
      setIdentity((prev) => ({
        ...prev,
        birthDate: normalizeDigits(value).slice(0, 8),
      }));
    },
    [setIdentity]
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      setIdentity((prev) => ({
        ...prev,
        phone: normalizeDigits(value).slice(0, 11),
      }));
    },
    [setIdentity]
  );

  const handleStartKakaoAuthClick = useCallback(() => {
    void handleStartKakaoAuth();
  }, [handleStartKakaoAuth]);

  const handleConfirmKakaoAuthClick = useCallback(() => {
    void handleConfirmKakaoAuth();
  }, [handleConfirmKakaoAuth]);

  const handleSwitchIdentityClick = useCallback(() => {
    void handleSwitchIdentity();
  }, [handleSwitchIdentity]);

  const handleEditAdminResult = useCallback(() => {
    setPhase("survey");
    setResult(resultSummary);
    setHasCompletedSubmission(false);
  }, [resultSummary, setHasCompletedSubmission, setPhase, setResult]);

  const handleEditSubmittedResult = useCallback(() => {
    setPhase("survey");
    setResult(null);
    setHasCompletedSubmission(false);
  }, [setHasCompletedSubmission, setPhase, setResult]);

  const handleCloseRenewalModal = useCallback(() => {
    setIsRenewalModalOpen(false);
    handleRenewalHoldEnd();
  }, [handleRenewalHoldEnd, setIsRenewalModalOpen]);

  const handleCancelResetConfirm = useCallback(() => {
    setIsResetConfirmModalOpen(false);
  }, [setIsResetConfirmModalOpen]);

  return {
    handleNameChange,
    handleBirthDateChange,
    handlePhoneChange,
    handleStartKakaoAuthClick,
    handleConfirmKakaoAuthClick,
    handleSwitchIdentityClick,
    handleEditAdminResult,
    handleEditSubmittedResult,
    handleCloseRenewalModal,
    handleCancelResetConfirm,
  };
}
