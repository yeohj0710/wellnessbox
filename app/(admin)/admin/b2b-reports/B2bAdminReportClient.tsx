"use client";

import { useEffect, useMemo, useState } from "react";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import styles from "@/components/b2b/B2bUx.module.css";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import B2bAnalysisJsonPanel from "./_components/B2bAnalysisJsonPanel";
import B2bAdminOpsHero from "./_components/B2bAdminOpsHero";
import B2bEmployeeOverviewCard from "./_components/B2bEmployeeOverviewCard";
import B2bEmployeeSidebar from "./_components/B2bEmployeeSidebar";
import B2bLayoutValidationPanel from "./_components/B2bLayoutValidationPanel";
import B2bNoteEditorPanel from "./_components/B2bNoteEditorPanel";
import B2bSurveyEditorPanel from "./_components/B2bSurveyEditorPanel";
import type {
  AdminClientProps,
  CompletionStats,
  EmployeeDetail,
  EmployeeListItem,
  LatestReport,
  ReportAudit,
  SurveyAnswerRow,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "./_lib/client-types";
import {
  fetchEmployeeDetailBundle,
  fetchEmployees,
  recomputeAnalysis,
  regenerateReport,
  runLayoutValidation,
  saveAnalysisPayload,
  saveNote,
  saveSurvey,
  seedDemoEmployees,
} from "./_lib/api";
import {
  ExportApiError,
  downloadFromApi,
  extractIssuesFromAudit,
  mergePeriods,
  parseLayoutDsl,
  toInputValue,
  toMultiValues,
} from "./_lib/client-utils";

export default function B2bAdminReportClient({ demoMode = false }: AdminClientProps) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] =
    useState<EmployeeDetail | null>(null);

  const [surveyTemplate, setSurveyTemplate] = useState<SurveyTemplateSchema | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, unknown>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [surveyUpdatedAt, setSurveyUpdatedAt] = useState<string | null>(null);

  const [analysisText, setAnalysisText] = useState("{}");
  const [note, setNote] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [cautions, setCautions] = useState("");

  const [latestReport, setLatestReport] = useState<LatestReport | null>(null);
  const [validationAudit, setValidationAudit] = useState<ReportAudit | null>(null);
  const [validationIssues, setValidationIssues] = useState<LayoutValidationIssue[]>([]);
  const [validatedLayout, setValidatedLayout] = useState<LayoutDocument | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);

  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const maxSelectedSections = surveyTemplate?.rules?.maxSelectedSections ?? 5;
  const selectedSectionSet = useMemo(() => new Set(selectedSections), [selectedSections]);
  const selectedSectionObjects = useMemo(() => {
    if (!surveyTemplate) return [];
    return surveyTemplate.sections.filter((section) => selectedSectionSet.has(section.key));
  }, [surveyTemplate, selectedSectionSet]);
  const latestLayout = useMemo(
    () => validatedLayout ?? parseLayoutDsl(latestReport?.layoutDsl),
    [latestReport?.layoutDsl, validatedLayout]
  );
  const periodOptions = useMemo(() => {
    if (availablePeriods.length > 0) return availablePeriods;
    if (selectedPeriodKey) return [selectedPeriodKey];
    return [];
  }, [availablePeriods, selectedPeriodKey]);

  const completionStats = useMemo<CompletionStats>(() => {
    if (!surveyTemplate) {
      return { total: 0, answered: 0, requiredTotal: 0, requiredAnswered: 0, percent: 0 };
    }
    const activeQuestions = [
      ...surveyTemplate.common,
      ...surveyTemplate.sections
        .filter((section) => selectedSectionSet.has(section.key))
        .flatMap((section) => section.questions),
    ];
    const total = activeQuestions.length;
    const required = activeQuestions.filter((q) => q.required);
    const hasAnswer = (question: SurveyQuestion) => {
      const value = surveyAnswers[question.key];
      return question.type === "multi"
        ? toMultiValues(value).length > 0
        : toInputValue(value).trim().length > 0;
    };
    const answered = activeQuestions.filter(hasAnswer).length;
    const requiredAnswered = required.filter(hasAnswer).length;
    return {
      total,
      answered,
      requiredTotal: required.length,
      requiredAnswered,
      percent: total > 0 ? Math.round((answered / total) * 100) : 0,
    };
  }, [surveyTemplate, selectedSectionSet, surveyAnswers]);

  function applyExportFailure(err: unknown, fallbackMessage: string) {
    if (err instanceof ExportApiError) {
      if (err.payload.audit) {
        setValidationAudit(err.payload.audit);
      }
      if (Array.isArray(err.payload.issues)) {
        setValidationIssues(err.payload.issues);
      }
      if (err.payload.audit || (err.payload.issues?.length ?? 0) > 0) {
        setShowExportPreview(true);
      }
      const suffix = err.payload.debugId ? ` (debugId: ${err.payload.debugId})` : "";
      setError(`${err.payload.error || fallbackMessage}${suffix}`);
      return;
    }
    setError(err instanceof Error ? err.message : fallbackMessage);
  }

  async function loadEmployees(query = "") {
    const data = await fetchEmployees(query);
    setEmployees(data.employees);
  }

  async function loadEmployeeDetail(employeeId: string, periodKey?: string) {
    const { detail, survey, analysis, note: noteData, report } =
      await fetchEmployeeDetailBundle(employeeId, periodKey);

    setSelectedEmployeeDetail(detail.employee);
    setSurveyTemplate(survey.template.schema);
    setSelectedSections(survey.response?.selectedSections ?? []);
    setSurveyUpdatedAt(survey.response?.updatedAt ?? null);

    const answersFromJson = survey.response?.answersJson || {};
    const answersFromRows =
      survey.response?.answers?.reduce(
        (acc: Record<string, unknown>, row: SurveyAnswerRow) => {
          acc[row.questionKey] = row.answerText ?? row.answerValue ?? "";
          return acc;
        },
        {}
      ) ?? {};
    setSurveyAnswers(
      Object.keys(answersFromJson).length > 0 ? answersFromJson : answersFromRows
    );

    setAnalysisText(JSON.stringify(analysis.analysis?.payload ?? {}, null, 2));
    setNote(noteData.note?.note ?? "");
    setRecommendations(noteData.note?.recommendations ?? "");
    setCautions(noteData.note?.cautions ?? "");

    setLatestReport(report.latest);
    setValidatedLayout(parseLayoutDsl(report.latest?.layoutDsl));
    setValidationAudit((report.latest?.exportAudit ?? null) as ReportAudit | null);
    setValidationIssues(extractIssuesFromAudit(report.latest?.exportAudit));

    const mergedPeriods = mergePeriods(
      report.availablePeriods,
      survey.availablePeriods,
      analysis.availablePeriods,
      report.latest?.periodKey ? [String(report.latest.periodKey)] : [],
      periodKey ? [periodKey] : []
    );
    setAvailablePeriods(mergedPeriods);

    setSelectedPeriodKey(
      report.latest?.periodKey || report.periodKey || survey.periodKey || analysis.periodKey || ""
    );
  }

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    void (async () => {
      setBusy(true);
      setError("");
      try {
        await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "임직원 상세 정보를 불러오지 못했습니다."
        );
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

  async function reloadCurrentEmployee() {
    if (!selectedEmployeeId) return;
    await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
  }

  async function handleSearch() {
    setBusy(true);
    setError("");
    try {
      await loadEmployees(search.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSurvey() {
    if (!selectedEmployeeId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveSurvey({
        employeeId: selectedEmployeeId,
        periodKey: selectedPeriodKey || undefined,
        selectedSections,
        answers: surveyAnswers,
      });
      setNotice("설문을 저장했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "설문 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAnalysisPayload() {
    if (!selectedEmployeeId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveAnalysisPayload({
        employeeId: selectedEmployeeId,
        periodKey: selectedPeriodKey || undefined,
        payload: JSON.parse(analysisText || "{}"),
      });
      setNotice("분석 JSON을 저장했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 JSON 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNote() {
    if (!selectedEmployeeId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveNote({
        employeeId: selectedEmployeeId,
        periodKey: selectedPeriodKey || undefined,
        note,
        recommendations,
        cautions,
      });
      setNotice("약사 코멘트를 저장했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "약사 코멘트 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecomputeAnalysis(generateAiEvaluation: boolean) {
    if (!selectedEmployeeId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await recomputeAnalysis({
        employeeId: selectedEmployeeId,
        periodKey: selectedPeriodKey || undefined,
        generateAiEvaluation,
      });
      setNotice(
        generateAiEvaluation
          ? "분석과 AI 평가를 재생성했습니다."
          : "분석 지표를 재계산했습니다."
      );
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 재계산에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerateReport() {
    if (!selectedEmployeeId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await regenerateReport({
        employeeId: selectedEmployeeId,
        periodKey: selectedPeriodKey || undefined,
      });
      setNotice("레포트를 재생성했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "레포트 재생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRunValidation() {
    if (!latestReport?.id) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await runLayoutValidation(latestReport.id);
      setValidationAudit((result.audit ?? null) as ReportAudit | null);
      setValidationIssues(result.issues ?? []);
      if (result.layout) setValidatedLayout(result.layout);
      setNotice(result.ok ? "레이아웃 검증을 완료했습니다." : "레이아웃 검증에 실패했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "레이아웃 검증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportPptx() {
    if (!latestReport?.id) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await downloadFromApi(
        `/api/admin/b2b/reports/${latestReport.id}/export/pptx`,
        "employee-report.pptx"
      );
      setNotice("PPTX 다운로드가 완료되었습니다.");
    } catch (err) {
      applyExportFailure(err, "PPTX 다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!latestReport?.id) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await downloadFromApi(
        `/api/admin/b2b/reports/${latestReport.id}/export/pdf`,
        "employee-report.pdf"
      );
      setNotice("PDF 다운로드가 완료되었습니다.");
    } catch (err) {
      applyExportFailure(err, "PDF 다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSeedDemo() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const seeded = await seedDemoEmployees();
      await loadEmployees("데모");
      if (seeded.employeeIds[0]) setSelectedEmployeeId(seeded.employeeIds[0]);
      setNotice("데모 데이터를 생성했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "데모 데이터 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function setAnswerValue(question: SurveyQuestion, value: unknown) {
    setSurveyAnswers((prev) => ({ ...prev, [question.key]: value }));
    if (question.key === "C27") {
      setSelectedSections(toMultiValues(value).slice(0, maxSelectedSections));
    }
  }

  function toggleSection(sectionKey: string) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else if (next.size < maxSelectedSections) next.add(sectionKey);
      const value = [...next];
      setSurveyAnswers((answers) => ({ ...answers, C27: value }));
      return value;
    });
  }

  return (
    <div className={`${styles.page} ${styles.stack}`}>
      <B2bAdminOpsHero
        search={search}
        busy={busy}
        demoMode={demoMode}
        onSearchChange={setSearch}
        onSearchSubmit={() => void handleSearch()}
        onSeedDemo={() => void handleSeedDemo()}
      />

      {error ? <div className={styles.noticeError}>{error}</div> : null}
      {notice ? <div className={styles.noticeSuccess}>{notice}</div> : null}

      <div className={styles.splitLayout}>
        <B2bEmployeeSidebar
          employees={employees}
          selectedEmployeeId={selectedEmployeeId}
          onSelectEmployee={(employeeId) => {
            setSelectedEmployeeId(employeeId);
            setSelectedPeriodKey("");
          }}
        />

        <div className={styles.stack}>
          {!selectedEmployeeId ? (
            <section className={styles.sectionCard}>
              <p className={styles.inlineHint}>
                왼쪽 목록에서 임직원을 선택하면 레포트 미리보기와 편집 도구가 열립니다.
              </p>
            </section>
          ) : null}

          {selectedEmployeeId && selectedEmployeeDetail ? (
            <>
              <B2bEmployeeOverviewCard
                detail={selectedEmployeeDetail}
                latestReport={latestReport}
                selectedPeriodKey={selectedPeriodKey}
                periodOptions={periodOptions}
                busy={busy}
                onPeriodChange={(next) => {
                  setSelectedPeriodKey(next);
                  if (selectedEmployeeId) void loadEmployeeDetail(selectedEmployeeId, next);
                }}
                onExportPdf={() => void handleExportPdf()}
                onExportPptx={() => void handleExportPptx()}
                onRegenerateReport={() => void handleRegenerateReport()}
                onRecomputeAnalysis={(generateAiEvaluation) => {
                  void handleRecomputeAnalysis(generateAiEvaluation);
                }}
              />

              <ReportSummaryCards payload={latestReport?.payload} viewerMode="admin" />

              <B2bSurveyEditorPanel
                completionStats={completionStats}
                surveyUpdatedAt={surveyUpdatedAt}
                surveyTemplate={surveyTemplate}
                selectedSectionSet={selectedSectionSet}
                selectedSectionObjects={selectedSectionObjects}
                surveyAnswers={surveyAnswers}
                maxSelectedSections={maxSelectedSections}
                busy={busy}
                onToggleSection={toggleSection}
                onSetAnswerValue={setAnswerValue}
                onSaveSurvey={() => void handleSaveSurvey()}
              />

              <B2bNoteEditorPanel
                note={note}
                recommendations={recommendations}
                cautions={cautions}
                busy={busy}
                onNoteChange={setNote}
                onRecommendationsChange={setRecommendations}
                onCautionsChange={setCautions}
                onSave={() => void handleSaveNote()}
              />

              <B2bAnalysisJsonPanel
                analysisText={analysisText}
                busy={busy}
                onAnalysisTextChange={setAnalysisText}
                onSave={() => void handleSaveAnalysisPayload()}
              />

              <B2bLayoutValidationPanel
                busy={busy}
                latestReportId={latestReport?.id ?? null}
                showExportPreview={showExportPreview}
                latestLayout={latestLayout}
                validationAudit={validationAudit}
                validationIssues={validationIssues}
                onRunValidation={() => void handleRunValidation()}
                onTogglePreview={() => setShowExportPreview((prev) => !prev)}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
