import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";

type UseB2bAdminReportEditorStateActionsParams = {
  setNoteDirty: Dispatch<SetStateAction<boolean>>;
  setNote: Dispatch<SetStateAction<string>>;
  setRecommendations: Dispatch<SetStateAction<string>>;
  setCautions: Dispatch<SetStateAction<string>>;
  setAnalysisDirty: Dispatch<SetStateAction<boolean>>;
  setAnalysisText: Dispatch<SetStateAction<string>>;
  setReportCustomizationDirty: Dispatch<SetStateAction<boolean>>;
  setReportConsultationSummary: Dispatch<SetStateAction<string>>;
  setReportPackagedProducts: Dispatch<SetStateAction<B2bReportPackagedProduct[]>>;
};

export function useB2bAdminReportEditorStateActions({
  setNoteDirty,
  setNote,
  setRecommendations,
  setCautions,
  setAnalysisDirty,
  setAnalysisText,
  setReportCustomizationDirty,
  setReportConsultationSummary,
  setReportPackagedProducts,
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

  const handleReportConsultationSummaryChange = useCallback(
    (value: string) => {
      setReportCustomizationDirty(true);
      setReportConsultationSummary(value);
    },
    [setReportConsultationSummary, setReportCustomizationDirty]
  );

  const handleReportPackagedProductsChange = useCallback(
    (value: B2bReportPackagedProduct[]) => {
      setReportCustomizationDirty(true);
      setReportPackagedProducts(value);
    },
    [setReportCustomizationDirty, setReportPackagedProducts]
  );

  return {
    handleNoteChange,
    handleRecommendationsChange,
    handleCautionsChange,
    handleAnalysisTextChange,
    handleReportConsultationSummaryChange,
    handleReportPackagedProductsChange,
  };
}
