import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  recomputeAnalysis,
  regenerateReport,
  saveAnalysisPayload,
  saveNote,
  saveSurvey,
} from "./api";
import type { B2bAdminReportRunBusyAction } from "./use-b2b-admin-report-busy-action";

type UseB2bAdminReportPersistenceActionsParams = {
  runBusyAction: B2bAdminReportRunBusyAction;
  selectedEmployeeId: string | null;
  selectedPeriodKey: string;
  surveyAnswers: Record<string, unknown>;
  resolvedSelectedSections: string[];
  analysisText: string;
  note: string;
  recommendations: string;
  cautions: string;
  setSurveyDirty: Dispatch<SetStateAction<boolean>>;
  setAnalysisDirty: Dispatch<SetStateAction<boolean>>;
  setNoteDirty: Dispatch<SetStateAction<boolean>>;
  setNotice: Dispatch<SetStateAction<string>>;
  reloadCurrentEmployee: () => Promise<void>;
};

export function useB2bAdminReportPersistenceActions({
  runBusyAction,
  selectedEmployeeId,
  selectedPeriodKey,
  surveyAnswers,
  resolvedSelectedSections,
  analysisText,
  note,
  recommendations,
  cautions,
  setSurveyDirty,
  setAnalysisDirty,
  setNoteDirty,
  setNotice,
  reloadCurrentEmployee,
}: UseB2bAdminReportPersistenceActionsParams) {
  const handleSaveSurvey = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await runBusyAction({
      fallbackError: "설문 저장에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        await saveSurvey({
          employeeId: selectedEmployeeId,
          periodKey: selectedPeriodKey || undefined,
          selectedSections: resolvedSelectedSections,
          answers: surveyAnswers,
        });
        setSurveyDirty(false);
        setNotice("설문을 저장했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }, [
    reloadCurrentEmployee,
    resolvedSelectedSections,
    runBusyAction,
    selectedEmployeeId,
    selectedPeriodKey,
    setNotice,
    setSurveyDirty,
    surveyAnswers,
  ]);

  const handleSaveAnalysisPayload = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await runBusyAction({
      fallbackError: "분석 JSON 저장에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        await saveAnalysisPayload({
          employeeId: selectedEmployeeId,
          periodKey: selectedPeriodKey || undefined,
          payload: JSON.parse(analysisText || "{}"),
        });
        setAnalysisDirty(false);
        setNotice("분석 JSON을 저장했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }, [
    analysisText,
    reloadCurrentEmployee,
    runBusyAction,
    selectedEmployeeId,
    selectedPeriodKey,
    setAnalysisDirty,
    setNotice,
  ]);

  const handleSaveNote = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await runBusyAction({
      fallbackError: "의사 코멘트 저장에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        await saveNote({
          employeeId: selectedEmployeeId,
          periodKey: selectedPeriodKey || undefined,
          note,
          recommendations,
          cautions,
        });
        setNoteDirty(false);
        setNotice("의사 코멘트를 저장했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }, [
    cautions,
    note,
    recommendations,
    reloadCurrentEmployee,
    runBusyAction,
    selectedEmployeeId,
    selectedPeriodKey,
    setNoteDirty,
    setNotice,
  ]);

  const handleRecomputeAnalysis = useCallback(
    async (generateAiEvaluation: boolean) => {
      if (!selectedEmployeeId) return;
      await runBusyAction({
        fallbackError: "분석 재계산에 실패했습니다.",
        clearNotice: true,
        run: async () => {
          await recomputeAnalysis({
            employeeId: selectedEmployeeId,
            periodKey: selectedPeriodKey || undefined,
            generateAiEvaluation,
          });
          setNotice(
            generateAiEvaluation
              ? "분석과 AI 평가를 생성했습니다."
              : "분석 지표를 재계산했습니다."
          );
          await reloadCurrentEmployee();
        },
      });
    },
    [reloadCurrentEmployee, runBusyAction, selectedEmployeeId, selectedPeriodKey, setNotice]
  );

  const handleRegenerateReport = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await runBusyAction({
      fallbackError: "리포트 재생성에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        await regenerateReport({
          employeeId: selectedEmployeeId,
          periodKey: selectedPeriodKey || undefined,
        });
        setNotice("리포트를 재생성했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }, [reloadCurrentEmployee, runBusyAction, selectedEmployeeId, selectedPeriodKey, setNotice]);

  return {
    handleSaveSurvey,
    handleSaveAnalysisPayload,
    handleSaveNote,
    handleRecomputeAnalysis,
    handleRegenerateReport,
  };
}
