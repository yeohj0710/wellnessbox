"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReportRenderer from "@/components/b2b/ReportRenderer";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import { useToast } from "@/components/common/toastContext.client";
import styles from "@/components/b2b/B2bUx.module.css";
import {
  buildPublicSurveyQuestionList,
  computeSurveyProgress,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";
import B2bAnalysisJsonPanel from "./_components/B2bAnalysisJsonPanel";
import B2bAdminOpsHero from "./_components/B2bAdminOpsHero";
import B2bEmployeeOverviewCard from "./_components/B2bEmployeeOverviewCard";
import B2bEmployeeSidebar from "./_components/B2bEmployeeSidebar";
import B2bLayoutValidationPanel from "./_components/B2bLayoutValidationPanel";
import B2bNoteEditorPanel from "./_components/B2bNoteEditorPanel";
import B2bSurveyEditorPanel from "./_components/B2bSurveyEditorPanel";
import type {
  AdminClientProps,
  EmployeeListItem,
  LatestReport,
  ReportAudit,
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
} from "./_lib/client-utils";
import {
  buildEmployeeReportPdfFilename,
  buildPdfCaptureQuery,
} from "./_lib/export-filename";
import { mergeSurveyAnswers } from "./_lib/survey-answer-merge";

export default function B2bAdminReportClient({ demoMode = false }: AdminClientProps) {
  const { showToast } = useToast();
  const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [surveyTemplate, setSurveyTemplate] = useState<SurveyTemplateSchema | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, unknown>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [surveySubmittedAt, setSurveySubmittedAt] = useState<string | null>(null);
  const [surveyUpdatedAt, setSurveyUpdatedAt] = useState<string | null>(null);

  const [analysisText, setAnalysisText] = useState("{}");
  const [note, setNote] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [cautions, setCautions] = useState("");
  const [surveyDirty, setSurveyDirty] = useState(false);
  const [analysisDirty, setAnalysisDirty] = useState(false);
  const [noteDirty, setNoteDirty] = useState(false);

  const [latestReport, setLatestReport] = useState<LatestReport | null>(null);
  const [validationAudit, setValidationAudit] = useState<ReportAudit | null>(null);
  const [validationIssues, setValidationIssues] = useState<LayoutValidationIssue[]>([]);
  const [validatedLayout, setValidatedLayout] = useState<LayoutDocument | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);

  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [reportDisplayPeriodKey, setReportDisplayPeriodKey] = useState("");

  const [busy, setBusy] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEmployeeListReady, setIsEmployeeListReady] = useState(false);
  const [isInitialDetailReady, setIsInitialDetailReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const webReportCaptureRef = useRef<HTMLDivElement | null>(null);
  const backgroundRefreshInFlightRef = useRef(false);
  const lastBackgroundRefreshAtRef = useRef(0);
  const BACKGROUND_REFRESH_MIN_INTERVAL_MS = 15000;

  type BusyActionOptions = {
    fallbackError: string;
    clearNotice?: boolean;
    onError?: (err: unknown, fallbackError: string) => void;
    run: () => Promise<void>;
  };

  const maxSelectedSections = surveyTemplate?.rules?.maxSelectedSections ?? 5;
  const wellnessTemplate = useMemo(
    () => (surveyTemplate as WellnessSurveyTemplate | null),
    [surveyTemplate]
  );
  const surveyAnswersRecord = surveyAnswers as PublicSurveyAnswers;
  const resolvedSelectedSections = useMemo(() => {
    if (!wellnessTemplate) return selectedSections;
    return resolveSelectedSectionsFromC27(
      wellnessTemplate,
      surveyAnswersRecord,
      selectedSections
    );
  }, [selectedSections, surveyAnswersRecord, wellnessTemplate]);
  const selectedSectionSet = useMemo(
    () => new Set(resolvedSelectedSections),
    [resolvedSelectedSections]
  );
  const latestLayout = useMemo(
    () => validatedLayout ?? parseLayoutDsl(latestReport?.layoutDsl),
    [latestReport?.layoutDsl, validatedLayout]
  );
  const periodOptions = useMemo(() => {
    if (availablePeriods.length > 0) return availablePeriods;
    if (selectedPeriodKey) return [selectedPeriodKey];
    return [];
  }, [availablePeriods, selectedPeriodKey]);
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );
  const hasUnsavedDraft = surveyDirty || analysisDirty || noteDirty;
  const isBootstrapping = !isEmployeeListReady || (employees.length > 0 && !isInitialDetailReady);

  const completionStats = useMemo(
    () => {
      if (!wellnessTemplate) {
        return { total: 0, answered: 0, requiredTotal: 0, requiredAnswered: 0, percent: 0 };
      }
      const questionList = buildPublicSurveyQuestionList(
        wellnessTemplate,
        surveyAnswersRecord,
        resolvedSelectedSections,
        { deriveSelectedSections: false }
      );
      return computeSurveyProgress(questionList, surveyAnswersRecord);
    },
    [resolvedSelectedSections, surveyAnswersRecord, wellnessTemplate]
  );

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

  function beginBusy() {
    setBusy(true);
  }

  function endBusy() {
    setBusy(false);
  }

  async function runBusyAction({
    fallbackError,
    clearNotice = false,
    onError,
    run,
  }: BusyActionOptions) {
    beginBusy();
    setError("");
    if (clearNotice) setNotice("");
    try {
      await run();
    } catch (err) {
      if (onError) {
        onError(err, fallbackError);
        return;
      }
      setError(err instanceof Error ? err.message : fallbackError);
    } finally {
      endBusy();
    }
  }

  async function loadEmployees(query = "") {
    const data = await fetchEmployees(query);
    setEmployees(data.employees);
  }

  async function loadEmployeeDetail(employeeId: string, periodKey?: string) {
    const { survey, analysis, note: noteData, report } = await fetchEmployeeDetailBundle(
      employeeId,
      periodKey
    );

    setSurveyTemplate(survey.template.schema);
    setSelectedSections(survey.response?.selectedSections ?? []);
    setSurveySubmittedAt(survey.response?.submittedAt ?? null);
    setSurveyUpdatedAt(survey.response?.updatedAt ?? null);

    const answersFromJson = survey.response?.answersJson || {};
    setSurveyAnswers(
      mergeSurveyAnswers({
        answersFromJson,
        answerRows: survey.response?.answers,
      })
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
    setSurveyDirty(false);
    setAnalysisDirty(false);
    setNoteDirty(false);
  }

  const clearEmployeeDetailState = useCallback(() => {
    setLatestReport(null);
    setValidatedLayout(null);
    setValidationAudit(null);
    setValidationIssues([]);
    setSurveyDirty(false);
    setAnalysisDirty(false);
    setNoteDirty(false);
  }, []);

  const selectEmployeeForLoading = useCallback((nextEmployeeId: string | null) => {
    setSelectedEmployeeId(nextEmployeeId);
    setSelectedPeriodKey("");
    setReportDisplayPeriodKey("");
    clearEmployeeDetailState();
    setIsDetailLoading(Boolean(nextEmployeeId));
  }, [clearEmployeeDetailState]);

  useEffect(() => {
    void (async () => {
      try {
        await loadEmployees();
      } finally {
        setIsEmployeeListReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (employees.length === 0) {
      if (selectedEmployeeId !== null) {
        selectEmployeeForLoading(null);
      }
      return;
    }

    if (
      selectedEmployeeId &&
      employees.some((employee) => employee.id === selectedEmployeeId)
    ) {
      return;
    }

    selectEmployeeForLoading(employees[0].id);
  }, [employees, selectedEmployeeId, selectEmployeeForLoading]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setIsDetailLoading(false);
      return;
    }
    void (async () => {
      setIsDetailLoading(true);
      try {
        await runBusyAction({
          fallbackError: "임직원 상세 정보를 불러오지 못했습니다.",
          run: async () => {
            await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
          },
        });
      } finally {
        setIsDetailLoading(false);
        if (!isInitialDetailReady) {
          setIsInitialDetailReady(true);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

  useEffect(() => {
    const text = notice.trim();
    if (!text) return;
    showToast(text, { type: "success", duration: 3200 });
    setNotice("");
  }, [notice, showToast]);

  useEffect(() => {
    const text = error.trim();
    if (!text) return;
    showToast(text, { type: "error", duration: 5000 });
    setError("");
  }, [error, showToast]);

  useEffect(() => {
    const refreshFromServer = () => {
      if (busy || isDetailLoading || hasUnsavedDraft || backgroundRefreshInFlightRef.current) {
        return;
      }
      const now = Date.now();
      if (now - lastBackgroundRefreshAtRef.current < BACKGROUND_REFRESH_MIN_INTERVAL_MS) return;

      backgroundRefreshInFlightRef.current = true;
      lastBackgroundRefreshAtRef.current = now;
      void (async () => {
        try {
          const tasks: Array<Promise<unknown>> = [loadEmployees(search.trim())];
          if (selectedEmployeeId) {
            tasks.push(loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined));
          }
          await Promise.all(tasks);
        } finally {
          backgroundRefreshInFlightRef.current = false;
        }
      })();
    };

    const handleFocus = () => {
      refreshFromServer();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshFromServer();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [busy, hasUnsavedDraft, isDetailLoading, search, selectedEmployeeId, selectedPeriodKey]);

  async function reloadCurrentEmployee() {
    if (!selectedEmployeeId) return;
    await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
  }

  async function handleSearch() {
    await runBusyAction({
      fallbackError: "검색에 실패했습니다.",
      run: async () => {
        await loadEmployees(search.trim());
      },
    });
  }

  async function handleSaveSurvey() {
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
  }

  async function handleSaveAnalysisPayload() {
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
  }

  async function handleSaveNote() {
    if (!selectedEmployeeId) return;
    await runBusyAction({
      fallbackError: "약사 코멘트 저장에 실패했습니다.",
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
        setNotice("약사 코멘트를 저장했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }

  async function handleRecomputeAnalysis(generateAiEvaluation: boolean) {
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
  }

  async function handleRegenerateReport() {
    if (!selectedEmployeeId) return;
    await runBusyAction({
      fallbackError: "레포트 재생성에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        await regenerateReport({
          employeeId: selectedEmployeeId,
          periodKey: selectedPeriodKey || undefined,
        });
        setNotice("레포트를 재생성했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }

  async function handleRunValidation() {
    if (!latestReport?.id) return;
    await runBusyAction({
      fallbackError: "레이아웃 검증에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        const result = await runLayoutValidation(latestReport.id);
        setValidationAudit((result.audit ?? null) as ReportAudit | null);
        setValidationIssues(result.issues ?? []);
        if (result.layout) setValidatedLayout(result.layout);
        setNotice(result.ok ? "레이아웃 검증을 완료했습니다." : "레이아웃 검증에 실패했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }

  async function handleSaveDisplayPeriod() {
    if (!latestReport?.id) return;
    const nextDisplayPeriod = reportDisplayPeriodKey.trim();
    if (!MONTH_KEY_PATTERN.test(nextDisplayPeriod)) {
      setError("표기 연월은 YYYY-MM 형식으로 입력해 주세요.");
      return;
    }
    await runBusyAction({
      fallbackError: "표기 연월 저장에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        await saveReportDisplayPeriod({
          reportId: latestReport.id,
          displayPeriodKey: nextDisplayPeriod,
        });
        setNotice("레포트 표기 연월을 반영했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }

  async function handleExportPdf() {
    if (!latestReport?.id) return;
    await runBusyAction({
      fallbackError: "PDF 다운로드에 실패했습니다.",
      clearNotice: true,
      onError: applyExportFailure,
      run: async () => {
        const downloadFileName = buildEmployeeReportPdfFilename({
          employeeName: selectedEmployee?.name ?? latestReport.payload?.meta?.employeeName,
          periodKey:
            selectedPeriodKey || latestReport.periodKey || latestReport.payload?.meta?.periodKey,
        });
        const captureWidthPx = Math.round(
          webReportCaptureRef.current?.getBoundingClientRect().width ?? 0
        );
        const viewportWidthPx = Math.round(
          window.innerWidth || document.documentElement?.clientWidth || 0
        );
        const queryString = buildPdfCaptureQuery(captureWidthPx, viewportWidthPx);

        await downloadFromApi(
          "/api/admin/b2b/reports/" +
            latestReport.id +
            "/export/pdf" +
            (queryString.length > 0 ? `?${queryString}` : ""),
          downloadFileName
        );
        setNotice("PDF 다운로드가 완료되었습니다.");
      },
    });
  }

  async function handleExportLegacyPdf() {
    if (!latestReport?.id) return;
    await runBusyAction({
      fallbackError: "기존 PDF 다운로드에 실패했습니다.",
      clearNotice: true,
      onError: applyExportFailure,
      run: async () => {
        const fallbackPdfName = buildEmployeeReportPdfFilename({
          employeeName: selectedEmployee?.name ?? latestReport.payload?.meta?.employeeName,
          periodKey:
            selectedPeriodKey || latestReport.periodKey || latestReport.payload?.meta?.periodKey,
        });
        await downloadFromApi(
          "/api/admin/b2b/reports/" + latestReport.id + "/export/pdf?mode=legacy",
          fallbackPdfName
        );
        setNotice("기존 PDF 엔진 다운로드가 완료되었습니다.");
      },
    });
  }

  async function handleSeedDemo() {
    await runBusyAction({
      fallbackError: "데모 데이터 생성에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        const seeded = await seedDemoEmployees();
        await loadEmployees("데모");
        if (seeded.employeeIds[0]) setSelectedEmployeeId(seeded.employeeIds[0]);
        setNotice("데모 데이터를 생성했습니다.");
      },
    });
  }

  async function handleChangePeriod(nextPeriod: string) {
    if (!selectedEmployeeId) return;
    setSelectedPeriodKey(nextPeriod);
    setIsDetailLoading(true);
    try {
      await runBusyAction({
        fallbackError: "기간별 데이터 조회에 실패했습니다.",
        run: async () => {
          await loadEmployeeDetail(selectedEmployeeId, nextPeriod);
        },
      });
    } finally {
      setIsDetailLoading(false);
    }
  }

  function setAnswerValue(question: SurveyQuestion, value: unknown) {
    setSurveyDirty(true);
    const template = wellnessTemplate;
    if (!template) {
      setSurveyAnswers((prev) => ({ ...prev, [question.key]: value }));
      return;
    }
    setSurveyAnswers((prev) => {
      const sanitized = sanitizeSurveyAnswerValue(
        question as WellnessSurveyQuestionForTemplate,
        value,
        maxSelectedSections
      );
      const nextAnswers = {
        ...prev,
        [question.key]: sanitized,
      } as PublicSurveyAnswers;

      setSelectedSections((prevSections) =>
        resolveSelectedSectionsFromC27(template, nextAnswers, prevSections)
      );
      return nextAnswers;
    });
  }

  function toggleSection(sectionKey: string) {
    setSurveyDirty(true);
    const template = wellnessTemplate;
    if (!template) return;
    const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
    const c27Question = template.common.find((question) => question.key === c27Key);
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else if (next.size < maxSelectedSections) next.add(sectionKey);
      const nextSections = [...next];
      setSurveyAnswers((answers) => {
        const nextC27Value = c27Question
          ? sanitizeSurveyAnswerValue(c27Question, nextSections, maxSelectedSections)
          : nextSections;
        const nextAnswers = {
          ...answers,
          [c27Key]: nextC27Value,
        } as PublicSurveyAnswers;
        return nextAnswers;
      });
      return nextSections;
    });
  }

  if (isBootstrapping) {
    return (
      <div className={styles.pageBackdrop}>
        <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
          <section className={styles.heroCard} aria-live="polite" aria-busy="true">
            <span
              className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
              style={{ width: 132 }}
              aria-hidden="true"
            />
            <span
              className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
              style={{ width: "52%", marginTop: 18 }}
              aria-hidden="true"
            />
            <span
              className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
              style={{ width: "74%", marginTop: 10 }}
              aria-hidden="true"
            />
            <div className={styles.actionRow} style={{ marginTop: 20 }}>
              <span
                className={`${styles.skeletonBlock} ${styles.input}`}
                style={{ minWidth: 260, height: 44 }}
                aria-hidden="true"
              />
              <span
                className={`${styles.skeletonBlock} ${styles.buttonPrimary}`}
                style={{ width: 88, height: 44 }}
                aria-hidden="true"
              />
            </div>
          </section>

          <div className={styles.splitLayout} aria-hidden="true">
            <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
              <div className={styles.skeletonRow}>
                <span
                  className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                  style={{ width: "42%" }}
                />
                <span
                  className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                  style={{ width: 68 }}
                />
              </div>
              <span
                className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                style={{ width: "56%", marginTop: 10 }}
              />
              <div className={`${styles.listWrap} ${styles.listWrapGrid}`} style={{ marginTop: 16 }}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <span
                    key={`initial-side-skeleton-${index}`}
                    className={styles.skeletonBlock}
                    style={{ width: "100%", height: 92, borderRadius: 18 }}
                  />
                ))}
              </div>
            </section>

            <div className={styles.stack}>
              <section className={styles.sectionCard}>
                <div className={styles.skeletonRow}>
                  <span
                    className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                    style={{ width: "44%" }}
                  />
                  <span
                    className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                    style={{ width: 96 }}
                  />
                </div>
                <span
                  className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                  style={{ width: "72%", marginTop: 10 }}
                />
                <div className={styles.loadingKpiRow}>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <span
                      key={`initial-kpi-skeleton-${index}`}
                      className={`${styles.skeletonBlock} ${styles.loadingKpi}`}
                    />
                  ))}
                </div>
              </section>

              <section className={styles.reportCanvas}>
                <div className={styles.reportCanvasHeader}>
                  <div>
                    <span
                      className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                      style={{ width: 220 }}
                    />
                    <span
                      className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                      style={{ width: 340, marginTop: 8 }}
                    />
                  </div>
                  <span
                    className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                    style={{ width: 170, height: 30 }}
                  />
                </div>
                <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
                  <span
                    className={styles.skeletonBlock}
                    style={{ width: "100%", minHeight: 520, borderRadius: 20 }}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
        <B2bAdminOpsHero
          search={search}
          busy={busy}
          demoMode={demoMode}
          onSearchChange={setSearch}
          onSearchSubmit={() => void handleSearch()}
          onSeedDemo={() => void handleSeedDemo()}
        />

        <div className={styles.splitLayout}>
          <B2bEmployeeSidebar
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            busy={busy}
            onSelectEmployee={(employeeId) => {
              if (employeeId === selectedEmployeeId) return;
              selectEmployeeForLoading(employeeId);
            }}
          />

          <div className={styles.stack}>
            {!selectedEmployeeId ? (
              <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
                <p className={styles.reportSelectionPlaceholderText}>
                  {"임직원을 선택하면 레포트 미리보기와 편집 도구가 함께 열려요."}
                </p>
              </section>
            ) : null}

            {selectedEmployeeId && isDetailLoading ? (
              <>
                <section className={styles.sectionCard} aria-live="polite" aria-busy="true">
                  <div className={styles.skeletonRow}>
                    <span
                      className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                      style={{ width: "48%" }}
                      aria-hidden="true"
                    />
                    <span
                      className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                      style={{ width: 96 }}
                      aria-hidden="true"
                    />
                  </div>
                  <span
                    className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                    style={{ width: "72%" }}
                    aria-hidden="true"
                  />
                  <div className={styles.loadingKpiRow}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <span
                        key={`overview-kpi-skeleton-${index}`}
                        className={`${styles.skeletonBlock} ${styles.loadingKpi}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </section>

                <section className={styles.reportCanvas} aria-hidden="true">
                  <div className={styles.reportCanvasHeader}>
                    <div>
                      <span
                        className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                        style={{ width: 220 }}
                      />
                      <span
                        className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                        style={{ width: 320, marginTop: 8 }}
                      />
                    </div>
                    <span
                      className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                      style={{ width: 160, height: 30 }}
                    />
                  </div>
                  <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
                    <span
                      className={styles.skeletonBlock}
                      style={{ width: "100%", minHeight: 560, borderRadius: 20 }}
                    />
                  </div>
                </section>

                {Array.from({ length: 3 }).map((_, index) => (
                  <section key={`detail-panel-skeleton-${index}`} className={styles.sectionCard}>
                    <div className={styles.skeletonRow}>
                      <span
                        className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
                        style={{ width: "44%" }}
                        aria-hidden="true"
                      />
                      <span
                        className={`${styles.skeletonPill} ${styles.skeletonBlock}`}
                        style={{ width: 88 }}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                      style={{ width: "84%" }}
                      aria-hidden="true"
                    />
                    <span
                      className={`${styles.skeletonLineShort} ${styles.skeletonBlock}`}
                      style={{ width: "68%" }}
                      aria-hidden="true"
                    />
                  </section>
                ))}
              </>
            ) : null}

            {selectedEmployeeId && !isDetailLoading && selectedEmployee ? (
              <>
                <B2bEmployeeOverviewCard
                  detail={selectedEmployee}
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
                  onExportLegacyPdf={() => void handleExportLegacyPdf()}
                  onRegenerateReport={() => void handleRegenerateReport()}
                  onRecomputeAnalysis={(generateAiEvaluation) => {
                    void handleRecomputeAnalysis(generateAiEvaluation);
                  }}
                />

                {/* New default: web-first report + capture PDF */}
                <section className={styles.reportCanvas}>
                  <div className={styles.reportCanvasHeader}>
                    <div>
                      <h3>{"레포트 본문 미리보기"}</h3>
                      <p>{"화면에서 보는 웹 레포트를 그대로 캡처해 PDF로 저장합니다."}</p>
                    </div>
                    <span className={styles.statusOn}>{"웹/PDF 동일 레이아웃 지향"}</span>
                  </div>
                  <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
                    <div
                      ref={webReportCaptureRef}
                      className={styles.reportCaptureSurface}
                      data-testid="report-capture-surface"
                      data-report-pdf-parity="1"
                    >
                      <ReportSummaryCards payload={latestReport?.payload} viewerMode="admin" />
                    </div>
                  </div>
                </section>

                {latestLayout ? (
                  <details className={`${styles.optionalCard} ${styles.reportLegacyPanel}`}>
                    <summary>{"구 엔진 미리보기"}</summary>
                    <div className={styles.optionalBody}>
                      <p className={styles.optionalText}>
                        {"기존 DSL 렌더 결과입니다. 비교 확인이 필요할 때만 펼쳐서 확인하세요."}
                      </p>
                      <div className={styles.reportCanvasBoard}>
                        <ReportRenderer layout={latestLayout} fitToWidth />
                      </div>
                    </div>
                  </details>
                ) : null}

                <B2bSurveyEditorPanel
                  completionStats={completionStats}
                  surveySubmittedAt={surveySubmittedAt}
                  surveyUpdatedAt={surveyUpdatedAt}
                  surveyTemplate={surveyTemplate}
                  selectedSections={resolvedSelectedSections}
                  selectedSectionSet={selectedSectionSet}
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
                  onNoteChange={(value) => {
                    setNoteDirty(true);
                    setNote(value);
                  }}
                  onRecommendationsChange={(value) => {
                    setNoteDirty(true);
                    setRecommendations(value);
                  }}
                  onCautionsChange={(value) => {
                    setNoteDirty(true);
                    setCautions(value);
                  }}
                  onSave={() => void handleSaveNote()}
                />

                <B2bAnalysisJsonPanel
                  analysisText={analysisText}
                  busy={busy}
                  onAnalysisTextChange={(value) => {
                    setAnalysisDirty(true);
                    setAnalysisText(value);
                  }}
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

            {selectedEmployeeId && !isDetailLoading && !selectedEmployee ? (
              <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
                <p className={styles.reportSelectionPlaceholderText}>
                  {"임직원 상세 데이터를 불러오지 못했습니다. 다시 시도해 주세요."}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
