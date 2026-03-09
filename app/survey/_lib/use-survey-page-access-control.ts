import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getLoginStatus } from "@/lib/useLoginStatus";
import type { SurveyPhase } from "./survey-page-persistence";

type UseSurveyPageAccessControlInput = {
  hydrated: boolean;
  phase: SurveyPhase;
  authVerified: boolean;
  setPhase: Dispatch<SetStateAction<SurveyPhase>>;
};

export function useSurveyPageAccessControl({
  hydrated,
  phase,
  authVerified,
  setPhase,
}: UseSurveyPageAccessControlInput) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const refreshLoginStatus = useCallback(async () => {
    try {
      const status = await getLoginStatus();
      setIsAdminLoggedIn(status.isAdminLoggedIn);
    } catch {
      setIsAdminLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "survey" && !authVerified) setPhase("intro");
  }, [authVerified, hydrated, phase, setPhase]);

  return {
    isAdminLoggedIn,
    refreshLoginStatus,
  };
}
