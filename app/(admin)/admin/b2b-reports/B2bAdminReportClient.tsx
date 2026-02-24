"use client";

import { useEffect, useMemo, useState } from "react";
import ReportRenderer from "@/components/b2b/ReportRenderer";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";

type AdminClientProps = { demoMode?: boolean };

type EmployeeListItem = {
  id: string;
  name: string;
  birthDate: string;
  phoneNormalized: string;
  lastSyncedAt: string | null;
  updatedAt: string;
  counts: {
    healthSnapshots: number;
    reports: number;
    surveyResponses: number;
    analysisResults: number;
  };
};

type SurveyOption = { value: string; label: string; score?: number };
type SurveyQuestion = {
  key: string;
  index: number;
  text: string;
  type: "text" | "single" | "multi";
  required?: boolean;
  options?: SurveyOption[];
  placeholder?: string;
  helpText?: string;
  maxSelect?: number;
};
type SurveySectionCatalog = {
  key: string;
  title: string;
  displayName?: string;
  description?: string;
  triggerLabel: string;
  questionCount: number;
};
type SurveySection = {
  key: string;
  title: string;
  displayName?: string;
  description?: string;
  questions: SurveyQuestion[];
};
type SurveyTemplateSchema = {
  common: SurveyQuestion[];
  sectionCatalog: SurveySectionCatalog[];
  sections: SurveySection[];
  rules?: { maxSelectedSections?: number; minSelectedSections?: number };
};

type ValidationAuditEntry = {
  stage: string;
  ok: boolean;
  issues?: LayoutValidationIssue[];
  runtimeIssueCount?: number;
  staticIssueCount?: number;
};
type ReportAudit = { selectedStage?: string | null; validation?: ValidationAuditEntry[] };

type LatestReport = {
  id: string;
  variantIndex: number;
  status: string;
  pageSize: string;
  stylePreset?: string;
  periodKey?: string | null;
  payload?: any;
  layoutDsl?: unknown;
  exportAudit?: ReportAudit | null;
  updatedAt: string;
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
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
    const message =
      (data as { error?: string })?.error || "요청을 처리하지 못했습니다.";
    const error = new Error(message) as Error & { payload?: unknown };
    error.payload = data;
    throw error;
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
  if (Array.isArray(raw)) return raw.map((item) => String(item)).join(", ");
  if (typeof raw === "object") {
    const value = raw as Record<string, unknown>;
    if (typeof value.answerText === "string") return value.answerText;
    if (typeof value.text === "string") return value.text;
    if (typeof value.answerValue === "string") return value.answerValue;
    if (typeof value.value === "string") return value.value;
  }
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
  if (entries.length === 0) return [];
  const selected = entries.find((entry) => entry.stage === audit?.selectedStage);
  if (selected?.issues?.length) return selected.issues;
  const latestWithIssues = [...entries].reverse().find((entry) => entry.issues?.length);
  return latestWithIssues?.issues ?? [];
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

function mergePeriods(...groups: Array<Array<string> | undefined>) {
  const set = new Set<string>();
  for (const group of groups) {
    if (!group) continue;
    for (const item of group) if (item) set.add(item);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = header.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
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

  const selectedSectionSet = useMemo(() => new Set(selectedSections), [selectedSections]);
  const maxSelectedSections = surveyTemplate?.rules?.maxSelectedSections ?? 5;

  const selectedSectionObjects = useMemo(() => {
    if (!surveyTemplate) return [];
    return surveyTemplate.sections.filter((section) => selectedSectionSet.has(section.key));
  }, [surveyTemplate, selectedSectionSet]);

  const latestLayout = useMemo(
    () => validatedLayout ?? parseLayoutDsl(latestReport?.layoutDsl),
    [latestReport?.layoutDsl, validatedLayout]
  );

  const completionStats = useMemo(() => {
    if (!surveyTemplate) return { total: 0, answered: 0, requiredTotal: 0, requiredAnswered: 0, percent: 0 };
    const active = [
      ...surveyTemplate.common,
      ...surveyTemplate.sections
        .filter((section) => selectedSectionSet.has(section.key))
        .flatMap((section) => section.questions),
    ];
    const total = active.length;
    const requiredTotal = active.filter((q) => q.required).length;
    const answered = active.filter((q) => {
      const value = surveyAnswers[q.key];
      return q.type === "multi"
        ? toMultiValues(value).length > 0
        : toInputValue(value).trim().length > 0;
    }).length;
    const requiredAnswered = active
      .filter((q) => q.required)
      .filter((q) => {
        const value = surveyAnswers[q.key];
        return q.type === "multi"
          ? toMultiValues(value).length > 0
          : toInputValue(value).trim().length > 0;
      }).length;
    return { total, answered, requiredTotal, requiredAnswered, percent: total > 0 ? Math.round((answered / total) * 100) : 0 };
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

    const merged = mergePeriods(
      report.availablePeriods,
      survey.availablePeriods,
      analysis.availablePeriods,
      report.latest?.periodKey ? [String(report.latest.periodKey)] : [],
      periodKey ? [periodKey] : []
    );
    setAvailablePeriods(merged);

    const resolvedPeriod =
      report.latest?.periodKey || report.periodKey || survey.periodKey || analysis.periodKey || "";
    setSelectedPeriodKey(resolvedPeriod);
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
        setError(err instanceof Error ? err.message : "임직원 상세 조회에 실패했습니다.");
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

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

  async function reloadCurrentEmployee() {
    if (!selectedEmployeeId) return;
    await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
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
      setNotice("설문 응답을 저장했습니다.");
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
      const payload = JSON.parse(analysisText || "{}");
      await requestJson(`/api/admin/b2b/employees/${selectedEmployeeId}/analysis`, {
        method: "PUT",
        body: JSON.stringify({
          periodKey: selectedPeriodKey || undefined,
          payload,
        }),
      });
      setNotice("외부 분석 JSON을 반영했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 JSON 저장에 실패했습니다.");
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
          ? "분석 및 AI 종합평가를 재생성했습니다."
          : "분석 결과를 재계산했습니다."
      );
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 재계산에 실패했습니다.");
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
      setNotice("리포트를 재생성했습니다.");
      await reloadCurrentEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "리포트 재생성에 실패했습니다.");
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
      setNotice(result.ok ? "레이아웃 검증을 통과했습니다." : "레이아웃 검증에 실패했습니다.");
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
      await downloadFromApi(`/api/admin/b2b/reports/${latestReport.id}/export/pptx`, "employee-report.pptx");
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
      await downloadFromApi(`/api/admin/b2b/reports/${latestReport.id}/export/pdf`, "employee-report.pdf");
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
      if (seeded.employeeIds[0]) {
        setSelectedEmployeeId(seeded.employeeIds[0]);
      }
      setNotice("데모 데이터를 생성/갱신했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "데모 데이터 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function setAnswerValue(question: SurveyQuestion, value: unknown) {
    setSurveyAnswers((prev) => ({ ...prev, [question.key]: value }));
    if (question.key === "C27") {
      const next = toMultiValues(value).slice(0, maxSelectedSections);
      setSelectedSections(next);
    }
  }

  function toggleSection(sectionKey: string) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else {
        if (next.size >= maxSelectedSections) return prev;
        next.add(sectionKey);
      }
      const nextArray = [...next];
      setSurveyAnswers((prevAnswers) => ({ ...prevAnswers, C27: nextArray }));
      return nextArray;
    });
  }

  function renderQuestionInput(question: SurveyQuestion) {
    const value = surveyAnswers[question.key];
    if (question.type === "multi") {
      const selected = new Set(toMultiValues(value));
      return (
        <div key={question.key} className="rounded-lg border border-slate-200 p-3">
          <label className="block text-sm font-semibold text-slate-800">
            {question.index}. {question.text}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(question.options || []).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (next.has(option.value)) next.delete(option.value);
                  else next.add(option.value);
                  setAnswerValue(question, [...next].slice(0, question.maxSelect || maxSelectedSections));
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selected.has(option.value)
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-300 text-slate-700"
                }`}
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
        <div key={question.key} className="rounded-lg border border-slate-200 p-3">
          <label className="block text-sm font-semibold text-slate-800">
            {question.index}. {question.text}
          </label>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
      <div key={question.key} className="rounded-lg border border-slate-200 p-3">
        <label className="block text-sm font-semibold text-slate-800">
          {question.index}. {question.text}
        </label>
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={toInputValue(value)}
          onChange={(event) => setAnswerValue(question, event.target.value)}
          placeholder={question.placeholder || "응답 입력"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">B2B 임직원 건강리포트 관리자</h1>
            <p className="mt-1 text-sm text-slate-600">
              운영 화면은 읽기용이며, 산출물은 PPTX/PDF 다운로드로 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {demoMode ? (
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={busy}
                className="rounded-md border border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                데모 데이터 생성
              </button>
            ) : null}
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="이름/생년월일/전화번호 검색"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={busy}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">임직원 목록</h2>
          <div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">
            {employees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => {
                  setSelectedEmployeeId(employee.id);
                  setSelectedPeriodKey("");
                }}
                className={`w-full rounded-lg border p-3 text-left ${
                  selectedEmployeeId === employee.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{employee.name}</div>
                <div className="text-xs text-slate-500">
                  {employee.birthDate} / {normalizeDigits(employee.phoneNormalized)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  스냅샷 {employee.counts.healthSnapshots}건 / 리포트 {employee.counts.reports}건
                </div>
              </button>
            ))}
            {employees.length === 0 && (
              <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-500">
                조회된 임직원이 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!selectedEmployeeId && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              왼쪽 목록에서 임직원을 선택해 주세요.
            </div>
          )}

          {selectedEmployeeId && selectedEmployeeDetail && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedEmployeeDetail.name} ({selectedEmployeeDetail.birthDate})
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={selectedPeriodKey}
                      onChange={(event) => {
                        const next = event.target.value;
                        setSelectedPeriodKey(next);
                        if (selectedEmployeeId) void loadEmployeeDetail(selectedEmployeeId, next);
                      }}
                    >
                      {(availablePeriods.length > 0 ? availablePeriods : [selectedPeriodKey]).map(
                        (period) => (
                          <option key={period} value={period}>
                            {period}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={handleRegenerateReport}
                      disabled={busy}
                      className="rounded-md border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      리포트 재생성
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecomputeAnalysis(false)}
                      disabled={busy}
                      className="rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      분석 재계산
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecomputeAnalysis(true)}
                      disabled={busy}
                      className="rounded-md border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      AI 재생성
                    </button>
                    <button
                      type="button"
                      onClick={handleRunValidation}
                      disabled={busy || !latestReport?.id}
                      className="rounded-md border border-purple-300 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                    >
                      레이아웃 검증
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPptx}
                      disabled={busy || !latestReport?.id}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      PPTX 다운로드
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={busy || !latestReport?.id}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      PDF 다운로드
                    </button>
                  </div>
                </div>
              </div>

              <ReportSummaryCards payload={latestReport?.payload} />

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">검증 이슈</h3>
                  <button
                    type="button"
                    onClick={() => setShowExportPreview((prev) => !prev)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {showExportPreview ? "A4 디버그 숨기기" : "A4 디버그 보기"}
                  </button>
                </div>
                {(validationAudit?.validation?.length ?? 0) > 0 ? (
                  <div className="space-y-1 text-xs text-slate-700">
                    {(validationAudit?.validation ?? []).map((entry) => (
                      <p key={entry.stage}>
                        [{entry.stage}] {entry.ok ? "통과" : "실패"} / static{" "}
                        {entry.staticIssueCount ?? 0} / runtime {entry.runtimeIssueCount ?? 0}
                      </p>
                    ))}
                  </div>
                ) : null}
                {validationIssues.length > 0 ? (
                  <ul className="max-h-64 space-y-1 overflow-auto text-xs text-rose-700">
                    {validationIssues.map((issue, index) => (
                      <li key={`${issue.pageId}-${index}`}>
                        [{issue.code}] {issue.detail} / {formatBounds(issue)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">검증 이슈가 없습니다.</p>
                )}
                {showExportPreview ? (
                  <ReportRenderer layout={latestLayout} fitToWidth debugOverlay issues={validationIssues} />
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">설문 입력</h3>
                  <button
                    type="button"
                    onClick={handleSaveSurvey}
                    disabled={busy}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    설문 저장
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <h4 className="text-sm font-semibold text-slate-800">선택 섹션</h4>
                    <p className="mt-1 text-xs text-slate-500">최대 {maxSelectedSections}개</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {surveyTemplate?.sectionCatalog.map((section) => (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => toggleSection(section.key)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            selectedSectionSet.has(section.key)
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-slate-300 text-slate-700"
                          }`}
                        >
                          {section.displayName || `${section.key} ${section.title}`}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      진행률 {completionStats.percent}% ({completionStats.answered}/{completionStats.total})
                    </p>
                    <p className="text-xs text-slate-500">
                      마지막 저장: {surveyUpdatedAt ? new Date(surveyUpdatedAt).toLocaleString("ko-KR") : "없음"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800">공통 문항</h4>
                    {surveyTemplate?.common.map((q) => renderQuestionInput(q))}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800">선택 섹션 문항</h4>
                    {selectedSectionObjects.length === 0 ? (
                      <p className="text-sm text-slate-500">선택된 섹션이 없습니다.</p>
                    ) : null}
                    {selectedSectionObjects.map((section) => (
                      <div key={section.key} className="rounded-lg border border-slate-200 p-3">
                        <h5 className="text-sm font-semibold text-slate-800">
                          {section.displayName || `${section.key} ${section.title}`}
                        </h5>
                        <div className="mt-2 space-y-2">
                          {section.questions.map((q) => renderQuestionInput(q))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">외부 분석 결과 JSON</h3>
                  <button
                    type="button"
                    onClick={handleSaveAnalysisPayload}
                    disabled={busy}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    분석 JSON 저장
                  </button>
                </div>
                <textarea
                  className="h-56 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                  value={analysisText}
                  onChange={(event) => setAnalysisText(event.target.value)}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">약사 코멘트</h3>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={busy}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    코멘트 저장
                  </button>
                </div>
                <label className="block text-sm text-slate-700">
                  요약 메모
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  권장 사항
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={recommendations}
                    onChange={(event) => setRecommendations(event.target.value)}
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  주의 사항
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={cautions}
                    onChange={(event) => setCautions(event.target.value)}
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
