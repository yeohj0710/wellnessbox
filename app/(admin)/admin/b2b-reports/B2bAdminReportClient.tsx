"use client";

import { useEffect, useMemo, useState } from "react";
import ReportRenderer from "@/components/b2b/ReportRenderer";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import styles from "@/components/b2b/B2bUx.module.css";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";

type AdminClientProps = { demoMode?: boolean };

type EmployeeListItem = {
  id: string;
  name: string;
  birthDate: string;
  phoneNormalized: string;
  lastSyncedAt: string | null;
  counts: {
    healthSnapshots: number;
    reports: number;
  };
};

type SurveyQuestion = {
  key: string;
  index: number;
  text: string;
  type: "text" | "single" | "multi";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  maxSelect?: number;
};

type SurveyTemplateSchema = {
  common: SurveyQuestion[];
  sections: Array<{
    key: string;
    title: string;
    displayName?: string;
    questions: SurveyQuestion[];
  }>;
  sectionCatalog: Array<{
    key: string;
    title: string;
    displayName?: string;
  }>;
  rules?: { maxSelectedSections?: number };
};

type ReportAudit = {
  selectedStage?: string | null;
  validation?: Array<{
    stage: string;
    ok: boolean;
    issues?: LayoutValidationIssue[];
    runtimeIssueCount?: number;
    staticIssueCount?: number;
  }>;
};

type LatestReport = {
  id: string;
  status: string;
  periodKey?: string | null;
  payload?: any;
  layoutDsl?: unknown;
  exportAudit?: ReportAudit | null;
  updatedAt: string;
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDateTime(raw: string | null | undefined) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("ko-KR");
}

function formatRelativeTime(raw: string | null | undefined) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "방금";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 172800) return "어제";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
  return date.toLocaleDateString("ko-KR");
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const message = (data as { error?: string })?.error || "요청 처리에 실패했습니다.";
    throw new Error(message);
  }
  return data;
}

function parseLayoutDsl(raw: unknown): LayoutDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const layout = raw as LayoutDocument;
  if (!Array.isArray(layout.pages) || layout.pages.length === 0) return null;
  if (!layout.pageSizeMm || typeof layout.pageSizeMm.width !== "number") return null;
  return layout;
}

function toInputValue(raw: unknown) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.join(", ");
  return "";
}

function toMultiValues(raw: unknown) {
  if (Array.isArray(raw)) return raw.map((item) => String(item)).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(/[,\n/|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function extractIssuesFromAudit(audit: ReportAudit | null | undefined) {
  const entries = audit?.validation ?? [];
  const selected = entries.find((entry) => entry.stage === audit?.selectedStage);
  if (selected?.issues?.length) return selected.issues;
  const latest = [...entries].reverse().find((entry) => entry.issues?.length);
  return latest?.issues ?? [];
}

function formatBounds(issue: LayoutValidationIssue) {
  const first = issue.nodeBounds;
  const second = issue.relatedNodeBounds;
  const firstText = first
    ? `x:${first.x.toFixed(1)} y:${first.y.toFixed(1)} w:${first.w.toFixed(1)} h:${first.h.toFixed(1)}`
    : "-";
  const secondText = second
    ? ` / 상대 x:${second.x.toFixed(1)} y:${second.y.toFixed(1)} w:${second.w.toFixed(1)} h:${second.h.toFixed(1)}`
    : "";
  return `${firstText}${secondText}`;
}

function formatIssueDebug(issue: LayoutValidationIssue) {
  const page = issue.pageId || "-";
  const node = issue.nodeId || "-";
  const related = issue.relatedNodeId ? ` / related:${issue.relatedNodeId}` : "";
  return `page:${page} / node:${node}${related} / ${formatBounds(issue)}`;
}

function mergePeriods(...groups: Array<Array<string> | undefined>) {
  const set = new Set<string>();
  for (const group of groups) {
    if (!group) continue;
    for (const period of group) if (period) set.add(period);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = header.match(
    /filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i
  );
  const encoded = match?.[1] || match?.[2];
  if (!encoded) return fallback;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

async function downloadFromApi(url: string, fallbackName: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "다운로드에 실패했습니다.");
  }
  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get("content-disposition"),
    fallbackName
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function B2bAdminReportClient({ demoMode = false }: AdminClientProps) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<any>(null);

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

  const completionStats = useMemo(() => {
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

  async function loadEmployees(query = "") {
    const data = await requestJson<{ ok: boolean; employees: EmployeeListItem[] }>(
      `/api/admin/b2b/employees${query ? `?q=${encodeURIComponent(query)}` : ""}`
    );
    setEmployees(data.employees);
  }

  async function loadEmployeeDetail(employeeId: string, periodKey?: string) {
    const periodQuery = periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
    const [detail, survey, analysis, noteData, report] = await Promise.all([
      requestJson<{ ok: boolean; employee: any }>(`/api/admin/b2b/employees/${employeeId}`),
      requestJson<any>(`/api/admin/b2b/employees/${employeeId}/survey${periodQuery}`),
      requestJson<any>(`/api/admin/b2b/employees/${employeeId}/analysis${periodQuery}`),
      requestJson<any>(`/api/admin/b2b/employees/${employeeId}/note${periodQuery}`),
      requestJson<any>(`/api/admin/b2b/employees/${employeeId}/report${periodQuery}`),
    ]);

    setSelectedEmployeeDetail(detail.employee);
    setSurveyTemplate(survey.template.schema);
    setSelectedSections(survey.response?.selectedSections ?? []);
    setSurveyUpdatedAt(survey.response?.updatedAt ?? null);

    const answersFromJson = survey.response?.answersJson || {};
    const answersFromRows =
      survey.response?.answers?.reduce((acc: Record<string, unknown>, row: any) => {
        acc[row.questionKey] = row.answerText ?? row.answerValue ?? "";
        return acc;
      }, {}) ?? {};
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
      await requestJson(`/api/admin/b2b/employees/${selectedEmployeeId}/survey`, {
        method: "PUT",
        body: JSON.stringify({
          periodKey: selectedPeriodKey || undefined,
          selectedSections,
          answers: surveyAnswers,
        }),
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
      await requestJson(`/api/admin/b2b/employees/${selectedEmployeeId}/analysis`, {
        method: "PUT",
        body: JSON.stringify({
          periodKey: selectedPeriodKey || undefined,
          payload: JSON.parse(analysisText || "{}"),
        }),
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
      await requestJson(`/api/admin/b2b/employees/${selectedEmployeeId}/note`, {
        method: "PUT",
        body: JSON.stringify({
          periodKey: selectedPeriodKey || undefined,
          note,
          recommendations,
          cautions,
          actorTag: "admin",
        }),
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
      await requestJson(`/api/admin/b2b/employees/${selectedEmployeeId}/analysis`, {
        method: "POST",
        body: JSON.stringify({
          periodKey: selectedPeriodKey || undefined,
          generateAiEvaluation,
          forceAiRegenerate: generateAiEvaluation,
          replaceLatestPeriodEntry: true,
        }),
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
      await requestJson(`/api/admin/b2b/employees/${selectedEmployeeId}/report`, {
        method: "POST",
        body: JSON.stringify({
          regenerate: true,
          pageSize: "A4",
          periodKey: selectedPeriodKey || undefined,
        }),
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
      const result = await requestJson<{
        ok: boolean;
        layout?: LayoutDocument;
        audit?: ReportAudit;
        issues?: LayoutValidationIssue[];
      }>(`/api/admin/b2b/reports/${latestReport.id}/validation`);
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
      setError(err instanceof Error ? err.message : "PPTX 다운로드에 실패했습니다.");
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
      setError(err instanceof Error ? err.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSeedDemo() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const seeded = await requestJson<{ ok: boolean; employeeIds: string[] }>(
        "/api/admin/b2b/demo/seed",
        { method: "POST" }
      );
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

  function renderQuestionInput(question: SurveyQuestion) {
    const value = surveyAnswers[question.key];
    if (question.type === "multi") {
      const selected = new Set(toMultiValues(value));
      return (
        <div key={question.key} className={styles.optionalCard}>
          <p className={styles.fieldLabel}>
            {question.index}. {question.text}
          </p>
          <div className={styles.actionRow}>
            {(question.options || []).map((option) => (
              <button
                key={option.value}
                type="button"
                className={selected.has(option.value) ? styles.chipActive : styles.chip}
                onClick={() => {
                  const next = new Set(selected);
                  if (next.has(option.value)) next.delete(option.value);
                  else next.add(option.value);
                  setAnswerValue(
                    question,
                    [...next].slice(0, question.maxSelect || maxSelectedSections)
                  );
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (question.type === "single" && (question.options?.length ?? 0) > 0) {
      return (
        <div key={question.key} className={styles.optionalCard}>
          <label className={styles.fieldLabel}>
            {question.index}. {question.text}
          </label>
          <select
            className={styles.select}
            value={toInputValue(value)}
            onChange={(event) => setAnswerValue(question, event.target.value)}
          >
            <option value="">선택하세요</option>
            {(question.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={question.key} className={styles.optionalCard}>
        <label className={styles.fieldLabel}>
          {question.index}. {question.text}
        </label>
        <input
          className={styles.input}
          value={toInputValue(value)}
          onChange={(event) => setAnswerValue(question, event.target.value)}
          placeholder={question.placeholder || "응답 입력"}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.stack}`}>
      <header className={styles.heroCard}>
        <p className={styles.kicker}>B2B REPORT OPS</p>
        <h1 className={styles.title}>임직원 건강 레포트 운영</h1>
        <p className={styles.description}>
          핵심 흐름은 임직원 선택 → 레포트 확인 → PDF/PPTX 다운로드입니다. 편집/검증은
          고급 섹션에서 선택적으로 사용하세요.
        </p>
        <div className={styles.actionRow}>
          <input
            className={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="이름, 생년월일, 휴대폰 번호 검색"
            style={{ minWidth: 280 }}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={busy}
            className={styles.buttonPrimary}
          >
            검색
          </button>
          {demoMode ? (
            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={busy}
              className={styles.buttonSecondary}
            >
              데모 생성
            </button>
          ) : null}
        </div>
      </header>

      {error ? <div className={styles.noticeError}>{error}</div> : null}
      {notice ? <div className={styles.noticeSuccess}>{notice}</div> : null}

      <div className={styles.splitLayout}>
        <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
          <h2 className={styles.sectionTitle}>임직원 목록</h2>
          <div className={styles.listWrap}>
            {employees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => {
                  setSelectedEmployeeId(employee.id);
                  setSelectedPeriodKey("");
                }}
                className={`${styles.listButton} ${
                  selectedEmployeeId === employee.id ? styles.listButtonActive : ""
                }`}
              >
                <span className={styles.listTitle}>{employee.name}</span>
                <span className={styles.listMeta}>
                  {employee.birthDate} / {normalizeDigits(employee.phoneNormalized)}
                </span>
                <span className={styles.listMeta}>
                  스냅샷 {employee.counts.healthSnapshots}건 / 레포트 {employee.counts.reports}건
                </span>
              </button>
            ))}
            {employees.length === 0 ? (
              <div className={styles.noticeInfo}>조회된 임직원이 없습니다.</div>
            ) : null}
          </div>
        </section>

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
              <section className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>
                  {selectedEmployeeDetail.name} ({selectedEmployeeDetail.birthDate})
                </h2>
                <p className={styles.sectionDescription}>
                  최근 연동:{" "}
                  {formatRelativeTime(
                    selectedEmployeeDetail.lastSyncedAt || latestReport?.updatedAt
                  )}
                </p>
                <div className={styles.actionRow}>
                  <select
                    className={styles.select}
                    value={selectedPeriodKey}
                    disabled={periodOptions.length === 0}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSelectedPeriodKey(next);
                      if (selectedEmployeeId) void loadEmployeeDetail(selectedEmployeeId, next);
                    }}
                  >
                    {periodOptions.length === 0 ? (
                      <option value="">기간 없음</option>
                    ) : (
                      periodOptions.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={busy || !latestReport?.id}
                    className={styles.buttonPrimary}
                  >
                    PDF 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPptx}
                    disabled={busy || !latestReport?.id}
                    className={styles.buttonSecondary}
                  >
                    PPTX 다운로드
                  </button>
                </div>
                <details className={styles.optionalCard}>
                  <summary>고급 작업</summary>
                  <div className={styles.optionalBody}>
                    <div className={styles.optionalCard}>
                      <p className={styles.optionalText}>
                        최근 연동 시각: {formatDateTime(selectedEmployeeDetail.lastSyncedAt)}
                      </p>
                      <p className={styles.optionalText}>
                        레포트 생성 시각:{" "}
                        {formatDateTime(
                          latestReport?.payload?.meta?.generatedAt || latestReport?.updatedAt
                        )}
                      </p>
                      <p className={styles.optionalText}>
                        레포트 갱신 시각: {formatDateTime(latestReport?.updatedAt)}
                      </p>
                    </div>
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        onClick={handleRegenerateReport}
                        disabled={busy}
                        className={styles.buttonGhost}
                      >
                        레포트 재생성
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecomputeAnalysis(false)}
                        disabled={busy}
                        className={styles.buttonGhost}
                      >
                        분석 재계산
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecomputeAnalysis(true)}
                        disabled={busy}
                        className={styles.buttonGhost}
                      >
                        AI 재생성
                      </button>
                    </div>
                  </div>
                </details>
              </section>

              <ReportSummaryCards payload={latestReport?.payload} />

              <details className={styles.optionalCard}>
                <summary>
                  설문 입력 ({completionStats.answered}/{completionStats.total},{" "}
                  {completionStats.percent}%)
                </summary>
                <div className={styles.optionalBody}>
                  <p className={styles.optionalText}>
                    마지막 저장: {formatDateTime(surveyUpdatedAt)} / 필수{" "}
                    {completionStats.requiredAnswered}/{completionStats.requiredTotal}
                  </p>
                  <div className={styles.actionRow}>
                    {(surveyTemplate?.sectionCatalog ?? []).map((section) => (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => toggleSection(section.key)}
                        className={
                          selectedSectionSet.has(section.key) ? styles.chipActive : styles.chip
                        }
                      >
                        {section.displayName || `${section.key} ${section.title}`}
                      </button>
                    ))}
                  </div>
                  <div className={styles.twoCol}>
                    <div className={styles.stack}>
                      <h3 className={styles.sectionTitle}>공통 문항</h3>
                      {(surveyTemplate?.common ?? []).map((q) => renderQuestionInput(q))}
                    </div>
                    <div className={styles.stack}>
                      <h3 className={styles.sectionTitle}>선택 섹션 문항</h3>
                      {selectedSectionObjects.length === 0 ? (
                        <p className={styles.inlineHint}>선택된 섹션이 없습니다.</p>
                      ) : null}
                      {selectedSectionObjects.map((section) => (
                        <section key={section.key} className={styles.sectionCard}>
                          <h4 className={styles.sectionTitle}>
                            {section.displayName || `${section.key} ${section.title}`}
                          </h4>
                          <div className={styles.stack}>
                            {section.questions.map((q) => renderQuestionInput(q))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSurvey}
                    disabled={busy}
                    className={styles.buttonPrimary}
                  >
                    설문 저장
                  </button>
                </div>
              </details>

              <details className={styles.optionalCard}>
                <summary>약사 코멘트 편집</summary>
                <div className={styles.optionalBody}>
                  <textarea
                    className={styles.textarea}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="요약 메모"
                  />
                  <textarea
                    className={styles.textarea}
                    value={recommendations}
                    onChange={(event) => setRecommendations(event.target.value)}
                    placeholder="권장 사항"
                  />
                  <textarea
                    className={styles.textarea}
                    value={cautions}
                    onChange={(event) => setCautions(event.target.value)}
                    placeholder="주의 사항"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={busy}
                    className={styles.buttonPrimary}
                  >
                    코멘트 저장
                  </button>
                </div>
              </details>

              <details className={styles.optionalCard}>
                <summary>분석 JSON 편집</summary>
                <div className={styles.optionalBody}>
                  <textarea
                    className={`${styles.textarea} ${styles.mono}`}
                    style={{ minHeight: 280 }}
                    value={analysisText}
                    onChange={(event) => setAnalysisText(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAnalysisPayload}
                    disabled={busy}
                    className={styles.buttonPrimary}
                  >
                    분석 JSON 저장
                  </button>
                </div>
              </details>

              <details className={styles.optionalCard}>
                <summary>레이아웃 검증 및 디버그</summary>
                <div className={styles.optionalBody}>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      onClick={handleRunValidation}
                      disabled={busy || !latestReport?.id}
                      className={styles.buttonSecondary}
                    >
                      레이아웃 검증 실행
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExportPreview((prev) => !prev)}
                      className={styles.buttonGhost}
                    >
                      {showExportPreview ? "A4 프리뷰 숨기기" : "A4 프리뷰 보기"}
                    </button>
                  </div>
                  {(validationAudit?.validation?.length ?? 0) > 0 ? (
                    <ul className={styles.listPlain}>
                      {(validationAudit?.validation ?? []).map((entry) => (
                        <li key={entry.stage}>
                          [{entry.stage}] {entry.ok ? "통과" : "실패"} / static{" "}
                          {entry.staticIssueCount ?? 0} / runtime{" "}
                          {entry.runtimeIssueCount ?? 0}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.inlineHint}>검증 기록이 없습니다.</p>
                  )}
                  {validationIssues.length > 0 ? (
                    <ul className={styles.listPlain}>
                      {validationIssues.map((issue, index) => (
                        <li key={`${issue.pageId}-${index}`}>
                          <strong>[{issue.code}]</strong> {issue.detail}
                          <div className={styles.inlineHint}>{formatIssueDebug(issue)}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.inlineHint}>현재 검증 이슈가 없습니다.</p>
                  )}
                  {showExportPreview ? (
                    latestLayout ? (
                      <ReportRenderer
                        layout={latestLayout}
                        fitToWidth
                        debugOverlay
                        issues={validationIssues}
                      />
                    ) : (
                      <p className={styles.inlineHint}>표시할 레이아웃이 없습니다.</p>
                    )
                  ) : null}
                </div>
              </details>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
