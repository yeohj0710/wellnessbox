import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

type UseB2bAdminReportEditorStateActionsParams = {
  setNoteDirty: Dispatch<SetStateAction<boolean>>;
  setNote: Dispatch<SetStateAction<string>>;
  setRecommendations: Dispatch<SetStateAction<string>>;
  setCautions: Dispatch<SetStateAction<string>>;
  setAnalysisDirty: Dispatch<SetStateAction<boolean>>;
  setAnalysisText: Dispatch<SetStateAction<string>>;
};

export function useB2bAdminReportEditorStateActions({
  setNoteDirty,
  setNote,
  setRecommendations,
  setCautions,
  setAnalysisDirty,
  setAnalysisText,
}: UseB2bAdminReportEditorStateActionsParams) {
  const handleNoteChange = useCallback(
    (value: string) => {
      setNoteDirty(true);
      setNote(value);
    },
    [setNote, setNoteDirty]
  );

  const handleRecommendationsChange = useCallback(
    (value: string) => {
      setNoteDirty(true);
      setRecommendations(value);
    },
    [setNoteDirty, setRecommendations]
  );

  const handleCautionsChange = useCallback(
    (value: string) => {
      setNoteDirty(true);
      setCautions(value);
    },
    [setCautions, setNoteDirty]
  );

  const handleAnalysisTextChange = useCallback(
    (value: string) => {
      setAnalysisDirty(true);
      setAnalysisText(value);
    },
    [setAnalysisDirty, setAnalysisText]
  );

  return {
    handleNoteChange,
    handleRecommendationsChange,
    handleCautionsChange,
    handleAnalysisTextChange,
  };
}
