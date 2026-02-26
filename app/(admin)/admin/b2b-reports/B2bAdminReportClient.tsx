"use client";

import { useEffect, useMemo, useState } from "react";
import ReportRenderer from "@/components/b2b/ReportRenderer";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import OperationLoadingOverlay from "@/components/common/operationLoadingOverlay";
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
  saveReportDisplayPeriod,
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
  const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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
  const [reportDisplayPeriodKey, setReportDisplayPeriodKey] = useState("");

  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
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

  function beginBusy(message: string) {
    setBusyMessage(message);
    setBusy(true);
  }

  function endBusy() {
    setBusy(false);
    setBusyMessage("");
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
    const nextSelectedPeriod =
      report.latest?.periodKey || report.periodKey || survey.periodKey || analysis.periodKey || "";
    setSelectedPeriodKey(nextSelectedPeriod);
    const displayPeriodRaw = report.latest?.payload?.meta?.periodKey ?? nextSelectedPeriod;
    setReportDisplayPeriodKey(
      typeof displayPeriodRaw === "string" && MONTH_KEY_PATTERN.test(displayPeriodRaw)
        ? displayPeriodRaw
        : ""
    );
  }

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    if (employees.length === 0) {
      if (selectedEmployeeId !== null) {
        setSelectedEmployeeId(null);
        setSelectedPeriodKey("");
        setReportDisplayPeriodKey("");
      }
      return;
    }

    if (
      selectedEmployeeId &&
      employees.some((employee) => employee.id === selectedEmployeeId)
    ) {
      return;
    }

    setSelectedEmployeeId(employees[0].id);
    setSelectedPeriodKey("");
    setReportDisplayPeriodKey("");
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    if (
      employees.length > 0 &&
      !employees.some((employee) => employee.id === selectedEmployeeId)
    ) {
      setSelectedEmployeeDetail(null);
      setLatestReport(null);
      setValidatedLayout(null);
      setValidationAudit(null);
      setValidationIssues([]);
      setSelectedEmployeeId(employees[0]?.id ?? null);
      setReportDisplayPeriodKey("");
      return;
    }
    void (async () => {
      beginBusy("임직원 상세 데이터를 불러오고 있어요.");
      setError("");
      try {
        await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "임직원 상세 정보를 불러오지 못했습니다."
        );
      } finally {
        endBusy();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, selectedEmployeeId]);

  async function reloadCurrentEmployee() {
    if (!selectedEmployeeId) return;
    await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
  }

  async function handleSearch() {
    beginBusy("임직원 목록을 검색하고 있어요.");
    setError("");
    try {
      await loadEmployees(search.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleSaveSurvey() {
    if (!selectedEmployeeId) return;
    beginBusy("설문 응답을 저장하고 있어요.");
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
      endBusy();
    }
  }

  async function handleSaveAnalysisPayload() {
    if (!selectedEmployeeId) return;
    beginBusy("분석 JSON을 저장하고 있어요.");
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
      endBusy();
    }
  }

  async function handleSaveNote() {
    if (!selectedEmployeeId) return;
    beginBusy("약사 코멘트를 저장하고 있어요.");
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
      endBusy();
    }
  }

  async function handleRecomputeAnalysis(generateAiEvaluation: boolean) {
    if (!selectedEmployeeId) return;
    beginBusy(
      generateAiEvaluation
        ? "분석 지표와 AI 평가를 재생성하고 있어요."
        : "분석 지표를 재계산하고 있어요."
    );
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
      endBusy();
    }
  }

  async function handleRegenerateReport() {
    if (!selectedEmployeeId) return;
    beginBusy("레포트를 재생성하고 있어요.");
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
      endBusy();
    }
  }

  async function handleRunValidation() {
    if (!latestReport?.id) return;
    beginBusy("레이아웃 검증을 실행하고 있어요.");
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
      endBusy();
    }
  }

  async function handleSaveDisplayPeriod() {
    if (!latestReport?.id) return;
    const nextDisplayPeriod = reportDisplayPeriodKey.trim();
    if (!MONTH_KEY_PATTERN.test(nextDisplayPeriod)) {
      setError("표기 연월은 YYYY-MM 형식으로 입력해 주세요.");
      return;
    }
    beginBusy("레포트 표기 연월을 반영하고 있어요.");
    setError("");
    setNotice("");
    try {
      await saveReportDisplayPeriod({
        reportId: latestReport.id,
        displayPeriodKey: nextDisplayPeriod,
      });
      setNotice("레포트 표기 연월을 반영했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "표기 연월 저장에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleExportPptx() {
    if (!latestReport?.id) return;
    beginBusy("PPTX 파일을 생성하고 있어요.");
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
      endBusy();
    }
  }

  async function handleExportPdf() {
    if (!latestReport?.id) return;
    beginBusy("PDF 파일을 생성하고 있어요.");
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
      endBusy();
    }
  }

  async function handleSeedDemo() {
    beginBusy("데모 임직원 데이터를 생성하고 있어요.");
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
      endBusy();
    }
  }

  async function handleChangePeriod(nextPeriod: string) {
    if (!selectedEmployeeId) return;
    setSelectedPeriodKey(nextPeriod);
    beginBusy("선택한 기간의 리포트를 불러오고 있어요.");
    setError("");
    try {
      await loadEmployeeDetail(selectedEmployeeId, nextPeriod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "기간별 데이터 조회에 실패했습니다.");
    } finally {
      endBusy();
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
    <div className={styles.pageBackdrop}>
      <OperationLoadingOverlay
        visible={busy}
        title={busyMessage || "작업을 처리하고 있어요"}
        description="완료되면 화면이 자동으로 갱신됩니다."
      />
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
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
              setReportDisplayPeriodKey("");
            }}
          />

          <div className={styles.stack}>
            {!selectedEmployeeId ? (
              <section className={styles.sectionCard}>
                <p className={styles.inlineHint}>
                  임직원을 선택하면 레포트 미리보기와 편집 도구가 함께 열려요.
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
                  reportDisplayPeriodKey={reportDisplayPeriodKey}
                  busy={busy}
                  onPeriodChange={(next) => {
                    void handleChangePeriod(next);
                  }}
                  onReportDisplayPeriodChange={setReportDisplayPeriodKey}
                  onSaveReportDisplayPeriod={() => void handleSaveDisplayPeriod()}
                  onExportPdf={() => void handleExportPdf()}
                  onExportPptx={() => void handleExportPptx()}
                  onRegenerateReport={() => void handleRegenerateReport()}
                  onRecomputeAnalysis={(generateAiEvaluation) => {
                    void handleRecomputeAnalysis(generateAiEvaluation);
                  }}
                />

                {latestLayout ? (
                  <section className={styles.reportCanvas}>
                    <div className={styles.reportCanvasHeader}>
                      <div>
                        <h3>리포트 본문 미리보기</h3>
                        <p>현재 미리보기에서 보이는 구성 그대로 PDF/PPTX가 생성돼요.</p>
                      </div>
                      <span className={styles.statusOn}>화면/PDF/PPTX 구성 일치</span>
                    </div>
                    <div className={styles.reportCanvasBoard}>
                      <ReportRenderer layout={latestLayout} fitToWidth />
                    </div>
                  </section>
                ) : (
                  <ReportSummaryCards payload={latestReport?.payload} viewerMode="admin" />
                )}

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
    </div>
  );
}
