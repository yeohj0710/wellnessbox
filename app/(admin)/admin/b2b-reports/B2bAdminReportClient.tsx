"use client";

import { useEffect, useMemo, useState } from "react";

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

type SurveyTemplateSchema = {
  common: Array<{ key: string; text: string }>;
  sectionCatalog: Array<{ key: string; title: string; triggerLabel: string }>;
  sections: Array<{
    key: string;
    title: string;
    questions: Array<{ key: string; text: string }>;
  }>;
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
    throw new Error(message);
  }
  return data;
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

async function downloadFromApi(url: string, fallbackName: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "파일 다운로드에 실패했습니다.");
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

export default function B2bAdminReportClient() {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeIdsForBatch, setSelectedEmployeeIdsForBatch] = useState<Set<string>>(
    new Set()
  );
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<any>(null);
  const [surveyTemplate, setSurveyTemplate] = useState<SurveyTemplateSchema | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, unknown>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [analysisText, setAnalysisText] = useState("{}");
  const [note, setNote] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [cautions, setCautions] = useState("");
  const [latestReport, setLatestReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadEmployees(query = "") {
    const data = await requestJson<{ ok: boolean; employees: EmployeeListItem[] }>(
      `/api/admin/b2b/employees${query ? `?q=${encodeURIComponent(query)}` : ""}`
    );
    setEmployees(data.employees);
  }

  async function loadEmployeeDetail(employeeId: string) {
    const [detail, survey, analysis, noteData, report] = await Promise.all([
      requestJson<{ ok: boolean; employee: any }>(`/api/admin/b2b/employees/${employeeId}`),
      requestJson<{
        ok: boolean;
        template: { schema: SurveyTemplateSchema };
        response: {
          selectedSections: string[];
          answersJson: Record<string, unknown>;
          answers: Array<{
            questionKey: string;
            answerText: string | null;
            answerValue: string | null;
          }>;
        } | null;
      }>(`/api/admin/b2b/employees/${employeeId}/survey`),
      requestJson<{ ok: boolean; analysis: { payload: unknown } | null }>(
        `/api/admin/b2b/employees/${employeeId}/analysis`
      ),
      requestJson<{
        ok: boolean;
        note: {
          note: string | null;
          recommendations: string | null;
          cautions: string | null;
        } | null;
      }>(`/api/admin/b2b/employees/${employeeId}/note`),
      requestJson<{ ok: boolean; latest: any }>(`/api/admin/b2b/employees/${employeeId}/report`),
    ]);

    setSelectedEmployeeDetail(detail.employee);
    setSurveyTemplate(survey.template.schema);
    setSelectedSections(survey.response?.selectedSections ?? []);
    const answersFromJson = survey.response?.answersJson || {};
    const answersFromRows =
      survey.response?.answers.reduce<Record<string, unknown>>((acc, row) => {
        acc[row.questionKey] = row.answerText ?? row.answerValue ?? "";
        return acc;
      }, {}) ?? {};
    setSurveyAnswers(
      Object.keys(answersFromJson).length > 0 ? answersFromJson : answersFromRows
    );
    setAnalysisText(
      JSON.stringify(analysis.analysis?.payload ?? {}, null, 2)
    );
    setNote(noteData.note?.note ?? "");
    setRecommendations(noteData.note?.recommendations ?? "");
    setCautions(noteData.note?.cautions ?? "");
    setLatestReport(report.latest);
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
        await loadEmployeeDetail(selectedEmployeeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "상세 조회에 실패했습니다.");
      } finally {
        setBusy(false);
      }
    })();
  }, [selectedEmployeeId]);

  const selectedSectionSet = useMemo(() => new Set(selectedSections), [selectedSections]);
  const selectedSectionObjects = useMemo(() => {
    if (!surveyTemplate) return [];
    return surveyTemplate.sections.filter((section) =>
      selectedSectionSet.has(section.key)
    );
  }, [surveyTemplate, selectedSectionSet]);

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
          selectedSections,
          answers: surveyAnswers,
        }),
      });
      setNotice("설문 응답이 저장되었습니다.");
      await loadEmployeeDetail(selectedEmployeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "설문 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAnalysis() {
    if (!selectedEmployeeId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = JSON.parse(analysisText || "{}");
      await requestJson(`/api/admin/b2b/employees/${selectedEmployeeId}/analysis`, {
        method: "PUT",
        body: JSON.stringify({ payload }),
      });
      setNotice("분석 JSON이 저장되었습니다.");
      await loadEmployeeDetail(selectedEmployeeId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "분석 JSON 저장에 실패했습니다."
      );
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
          note,
          recommendations,
          cautions,
          actorTag: "admin",
        }),
      });
      setNotice("약사 상담 코멘트가 저장되었습니다.");
      await loadEmployeeDetail(selectedEmployeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "코멘트 저장에 실패했습니다.");
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
        body: JSON.stringify({ regenerate: true, pageSize: "A4" }),
      });
      setNotice("새 레포트 스냅샷이 생성되었습니다.");
      await loadEmployeeDetail(selectedEmployeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "레포트 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportPptx() {
    if (!latestReport?.id) return;
    setBusy(true);
    setError("");
    try {
      await downloadFromApi(
        `/api/admin/b2b/reports/${latestReport.id}/export/pptx`,
        "employee-report.pptx"
      );
      setNotice("PPTX 파일을 다운로드했습니다.");
      if (selectedEmployeeId) await loadEmployeeDetail(selectedEmployeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PPTX 내보내기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!latestReport?.id) return;
    setBusy(true);
    setError("");
    try {
      await downloadFromApi(
        `/api/admin/b2b/reports/${latestReport.id}/export/pdf`,
        "employee-report.pdf"
      );
      setNotice("PDF 파일을 다운로드했습니다.");
      if (selectedEmployeeId) await loadEmployeeDetail(selectedEmployeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 내보내기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchExport() {
    const employeeIds = [...selectedEmployeeIdsForBatch];
    if (employeeIds.length === 0) {
      setError("배치 내보내기 대상을 하나 이상 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await downloadFromApi(
        "/api/admin/b2b/reports/export-batch",
        "b2b_reports.zip",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeIds,
            format: "both",
          }),
        }
      );
      setNotice("배치 ZIP 파일을 다운로드했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "배치 내보내기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">B2B 임직원 레포트 관리</h1>
        <p className="mt-2 text-sm text-slate-600">
          임직원 조회, 설문 입력, 분석 JSON 업로드, 약사 코멘트 관리, 레포트 미리보기와 PPTX/PDF/ZIP 내보내기를 수행합니다.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="이름/전화번호/생년월일 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={busy}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            검색
          </button>
          <button
            type="button"
            onClick={handleBatchExport}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            선택 대상 배치 Export(zip)
          </button>
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
          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`rounded-lg border p-3 ${
                  selectedEmployeeId === employee.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className="text-left"
                  >
                    <div className="text-sm font-semibold text-slate-900">{employee.name}</div>
                    <div className="text-xs text-slate-500">
                      {employee.birthDate} / {normalizeDigits(employee.phoneNormalized)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      스냅샷 {employee.counts.healthSnapshots}건 / 레포트 {employee.counts.reports}건
                    </div>
                  </button>
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIdsForBatch.has(employee.id)}
                    onChange={(event) => {
                      setSelectedEmployeeIdsForBatch((prev) => {
                        const next = new Set(prev);
                        if (event.target.checked) next.add(employee.id);
                        else next.delete(employee.id);
                        return next;
                      });
                    }}
                  />
                </div>
              </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedEmployeeDetail.name} ({selectedEmployeeDetail.birthDate})
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRegenerateReport}
                      disabled={busy}
                      className="rounded-md border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      레포트 Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPptx}
                      disabled={busy || !latestReport?.id}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      PPTX Export
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={busy || !latestReport?.id}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      PDF Export
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  최근 동기화:{" "}
                  {selectedEmployeeDetail.lastSyncedAt
                    ? new Date(selectedEmployeeDetail.lastSyncedAt).toLocaleString("ko-KR")
                    : "없음"}
                </p>
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

                <label className="text-sm text-slate-700 block">
                  선택 섹션 키 (쉼표 구분, 최대 5개)
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={selectedSections.join(",")}
                    onChange={(event) => {
                      const values = event.target.value
                        .split(",")
                        .map((item) => item.trim().toUpperCase())
                        .filter(Boolean)
                        .slice(0, 5);
                      setSelectedSections(values);
                    }}
                    placeholder="S01,S02,S03"
                  />
                </label>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800">공통 1~27 문항</h4>
                    {surveyTemplate?.common.map((question) => (
                      <label key={question.key} className="block text-xs text-slate-700">
                        {question.key}. {question.text}
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={String(surveyAnswers[question.key] ?? "")}
                          onChange={(event) =>
                            setSurveyAnswers((prev) => ({
                              ...prev,
                              [question.key]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800">
                      선택 섹션 문항 (S01~S24)
                    </h4>
                    {selectedSectionObjects.length === 0 && (
                      <p className="text-sm text-slate-500">
                        선택 섹션 키를 입력하면 해당 섹션 문항이 표시됩니다.
                      </p>
                    )}
                    {selectedSectionObjects.map((section) => (
                      <div key={section.key} className="rounded-lg border border-slate-200 p-3">
                        <h5 className="text-sm font-semibold text-slate-800">
                          {section.key} - {section.title}
                        </h5>
                        <div className="mt-2 space-y-2">
                          {section.questions.map((question) => (
                            <label key={question.key} className="block text-xs text-slate-700">
                              {question.key}. {question.text}
                              <input
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                value={String(surveyAnswers[question.key] ?? "")}
                                onChange={(event) =>
                                  setSurveyAnswers((prev) => ({
                                    ...prev,
                                    [question.key]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">분석 결과 JSON</h3>
                  <button
                    type="button"
                    onClick={handleSaveAnalysis}
                    disabled={busy}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    분석 저장
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
                  <h3 className="text-base font-bold text-slate-900">약사 상담 코멘트</h3>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={busy}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    코멘트 저장
                  </button>
                </div>
                <label className="text-sm text-slate-700 block">
                  상담 메모
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <label className="text-sm text-slate-700 block">
                  권장사항
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={recommendations}
                    onChange={(event) => setRecommendations(event.target.value)}
                  />
                </label>
                <label className="text-sm text-slate-700 block">
                  주의사항
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={cautions}
                    onChange={(event) => setCautions(event.target.value)}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                <h3 className="text-base font-bold text-slate-900">레포트 미리보기(JSON)</h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 overflow-auto max-h-80">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(latestReport?.payload ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
