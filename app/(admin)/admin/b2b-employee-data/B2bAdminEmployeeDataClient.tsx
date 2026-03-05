"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import {
  clearHyphenCache,
  createEmployee,
  deleteEmployee,
  deleteRecord,
  fetchEmployeeOps,
  fetchEmployees,
  patchEmployee,
  resetAllB2bData,
  resetPeriodData,
} from "./_lib/api";
import { formatDateTime, formatRelativeTime } from "./_lib/client-utils";
import type {
  DeleteRecordType,
  EmployeeListItem,
  EmployeeOpsResponse,
} from "./_lib/client-types";
import RecordListSection, { type RecordListRow } from "./_components/RecordListSection";
import {
  buildEmployeeRecordRowsByGroup,
  buildHealthLinkRecordRows,
} from "./_lib/record-row-builders";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function B2bAdminEmployeeDataClient() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [opsData, setOpsData] = useState<EmployeeOpsResponse | null>(null);

  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createAppUserId, setCreateAppUserId] = useState("");
  const [createProvider, setCreateProvider] = useState("HYPHEN_NHIS");

  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAppUserId, setEditAppUserId] = useState("");
  const [editProvider, setEditProvider] = useState("HYPHEN_NHIS");

  const [periodResetKey, setPeriodResetKey] = useState("");
  const [includeAccessLogs, setIncludeAccessLogs] = useState(false);
  const [includeAdminLogs, setIncludeAdminLogs] = useState(false);
  const [clearLink, setClearLink] = useState(true);
  const [clearFetchCache, setClearFetchCache] = useState(true);
  const [clearFetchAttempts, setClearFetchAttempts] = useState(true);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  function beginBusy(message: string) {
    setBusy(true);
    setBusyMessage(message);
  }

  function endBusy() {
    setBusy(false);
    setBusyMessage("");
  }

  function hydrateEditor(data: EmployeeOpsResponse) {
    setEditName(data.employee.name);
    setEditBirthDate(data.employee.birthDate);
    setEditPhone(data.employee.phoneNormalized);
    setEditAppUserId(data.employee.appUserId ?? "");
    setEditProvider(data.employee.linkedProvider || "HYPHEN_NHIS");
    setDeleteConfirmName("");
    setPeriodResetKey((prev) => {
      if (MONTH_KEY_PATTERN.test(prev)) return prev;
      return data.summary.periods[0] ?? "";
    });
  }

  async function loadEmployeeList(query = "") {
    const data = await fetchEmployees(query);
    setEmployees(data.employees);
  }

  async function loadEmployeeOps(employeeId: string) {
    const detail = await fetchEmployeeOps(employeeId);
    setOpsData(detail);
    hydrateEditor(detail);
  }

  async function refreshCurrentEmployee() {
    if (!selectedEmployeeId) return;
    await loadEmployeeOps(selectedEmployeeId);
  }

  useEffect(() => {
    void (async () => {
      beginBusy("직원 목록을 불러오고 있습니다.");
      setError("");
      try {
        await loadEmployeeList();
      } catch (err) {
        setError(err instanceof Error ? err.message : "직원 목록 조회에 실패했습니다.");
      } finally {
        endBusy();
      }
    })();
  }, []);

  useEffect(() => {
    if (employees.length === 0) {
      setSelectedEmployeeId(null);
      setOpsData(null);
      return;
    }
    if (!selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
      return;
    }
    if (!employees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    void (async () => {
      beginBusy("직원 운영 데이터를 불러오고 있습니다.");
      setError("");
      try {
        await loadEmployeeOps(selectedEmployeeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "직원 운영 데이터 조회에 실패했습니다.");
      } finally {
        endBusy();
      }
    })();
  }, [selectedEmployeeId]);

  async function handleSearch() {
    beginBusy("직원 목록을 검색하고 있습니다.");
    setError("");
    setNotice("");
    try {
      await loadEmployeeList(search.trim());
      setNotice("직원 목록을 갱신했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleCreateEmployee() {
    beginBusy("신규 직원을 등록하고 있습니다.");
    setError("");
    setNotice("");
    try {
      const created = await createEmployee({
        name: createName.trim(),
        birthDate: createBirthDate.trim(),
        phone: createPhone.trim(),
        appUserId: createAppUserId.trim() || null,
        linkedProvider: createProvider.trim() || "HYPHEN_NHIS",
      });
      await loadEmployeeList(search.trim());
      setSelectedEmployeeId(created.employee.id);
      setCreateName("");
      setCreateBirthDate("");
      setCreatePhone("");
      setCreateAppUserId("");
      setNotice("신규 직원을 등록했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "직원 등록에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleSaveEmployeeProfile() {
    if (!selectedEmployeeId) return;
    beginBusy("직원 기본 정보를 저장하고 있습니다.");
    setError("");
    setNotice("");
    try {
      await patchEmployee(selectedEmployeeId, {
        name: editName.trim(),
        birthDate: editBirthDate.trim(),
        phone: editPhone.trim(),
        appUserId: editAppUserId.trim() || null,
        linkedProvider: editProvider.trim() || "HYPHEN_NHIS",
      });
      await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      setNotice("직원 기본 정보를 저장했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "직원 정보 저장에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleResetAllData() {
    if (!selectedEmployeeId) return;
    const confirmed = window.confirm(
      "이 직원의 B2B 산출 데이터(스냅샷/설문/분석/약사코멘트/리포트)를 초기화하시겠습니까?"
    );
    if (!confirmed) return;

    beginBusy("직원 산출 데이터를 초기화하고 있습니다.");
    setError("");
    setNotice("");
    try {
      await resetAllB2bData({
        employeeId: selectedEmployeeId,
        includeAccessLogs,
        includeAdminLogs,
      });
      await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      setNotice("직원 산출 데이터 초기화를 완료했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터 초기화에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleResetPeriodData() {
    if (!selectedEmployeeId) return;
    const periodKey = periodResetKey.trim();
    if (!MONTH_KEY_PATTERN.test(periodKey)) {
      setError("기간은 YYYY-MM 형식으로 입력해 주세요.");
      return;
    }

    const confirmed = window.confirm(
      `${periodKey} 기간 데이터(스냅샷/설문/분석/약사코멘트/리포트)를 초기화하시겠습니까?`
    );
    if (!confirmed) return;

    beginBusy("기간 데이터를 초기화하고 있습니다.");
    setError("");
    setNotice("");
    try {
      await resetPeriodData({ employeeId: selectedEmployeeId, periodKey });
      await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      setNotice(`${periodKey} 기간 데이터를 초기화했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "기간 데이터 초기화에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleClearHyphenCache() {
    if (!selectedEmployeeId) return;
    const confirmed = window.confirm(
      "하이픈 연동 세션/캐시/시도 이력을 정리합니다. 다음 조회 시 재인증 또는 재조회가 필요할 수 있습니다. 진행할까요?"
    );
    if (!confirmed) return;

    beginBusy("하이픈 연동 캐시를 정리하고 있습니다.");
    setError("");
    setNotice("");
    try {
      await clearHyphenCache({
        employeeId: selectedEmployeeId,
        clearLink,
        clearFetchCache,
        clearFetchAttempts,
      });
      await refreshCurrentEmployee();
      setNotice("하이픈 연동 캐시 정리를 완료했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "하이픈 캐시 정리에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleDeleteEmployee() {
    if (!selectedEmployeeId || !opsData) return;
    if (deleteConfirmName.trim() !== opsData.employee.name) {
      setError("삭제 확인란에 직원명을 정확히 입력해 주세요.");
      return;
    }

    const confirmed = window.confirm(
      `${opsData.employee.name} 직원을 완전히 삭제합니다. 연관 데이터도 함께 삭제됩니다. 계속할까요?`
    );
    if (!confirmed) return;

    beginBusy("직원 데이터를 삭제하고 있습니다.");
    setError("");
    setNotice("");
    try {
      await deleteEmployee(selectedEmployeeId, deleteConfirmName.trim());
      await loadEmployeeList(search.trim());
      setNotice("직원 데이터를 삭제했습니다.");
      setOpsData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "직원 삭제에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  async function handleDeleteRecord(recordType: DeleteRecordType, recordId: string) {
    if (!selectedEmployeeId) return;
    const confirmed = window.confirm("선택한 레코드를 삭제하시겠습니까?");
    if (!confirmed) return;

    beginBusy("레코드를 삭제하고 있습니다.");
    setError("");
    setNotice("");
    try {
      await deleteRecord({
        employeeId: selectedEmployeeId,
        recordType,
        recordId,
      });
      await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      setNotice("레코드를 삭제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "레코드 삭제에 실패했습니다.");
    } finally {
      endBusy();
    }
  }

  const recordRowsByGroup = useMemo(
    () => (opsData ? buildEmployeeRecordRowsByGroup(opsData) : null),
    [opsData]
  );

  const healthLinkRows = useMemo(() => (opsData ? buildHealthLinkRecordRows(opsData) : null), [opsData]);

  const recordSections = useMemo<Array<{ title: string; rows: RecordListRow[] }>>(() => {
    if (!recordRowsByGroup) return [];
    return [
      { title: "건강 스냅샷", rows: recordRowsByGroup.healthSnapshots },
      { title: "설문 응답", rows: recordRowsByGroup.surveyResponses },
      { title: "분석 결과", rows: recordRowsByGroup.analysisResults },
      { title: "약사 코멘트", rows: recordRowsByGroup.pharmacistNotes },
      { title: "리포트", rows: recordRowsByGroup.reports },
      { title: "접근 로그 기록", rows: recordRowsByGroup.accessLogs },
      { title: "관리자 작업 기록", rows: recordRowsByGroup.adminActionLogs },
    ];
  }, [recordRowsByGroup]);

  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
        <header className={styles.heroCard}>
          <p className={styles.kicker}>B2B DATA OPS</p>
          <h1 className={styles.title}>임직원 데이터 운영 콘솔</h1>
          <p className={styles.description}>
            /employee-report, /health-link, /survey, /admin/b2b-reports에서 사용하는 임직원
            데이터(연동/캐시/리포트 산출물)를 한 곳에서 관리할 수 있습니다.
          </p>
          <div className={styles.actionRow}>
            <input
              className={styles.input}
              placeholder="이름, 생년월일, 휴대폰으로 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              style={{ minWidth: 280 }}
            />
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={() => void handleSearch()}
              disabled={busy}
            >
              검색
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => {
                void (async () => {
                  beginBusy("운영 데이터를 새로고침하고 있습니다.");
                  setError("");
                  try {
                    await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
                    setNotice("운영 데이터를 새로고침했습니다.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "새로고침에 실패했습니다.");
                  } finally {
                    endBusy();
                  }
                })();
              }}
              disabled={busy}
            >
              새로고침
            </button>
          </div>
          {busyMessage ? <p className={styles.inlineHint}>현재 작업: {busyMessage}</p> : null}
        </header>

        {error ? <div className={styles.noticeError}>{error}</div> : null}
        {notice ? <div className={styles.noticeSuccess}>{notice}</div> : null}

        <details className={styles.optionalCard}>
          <summary>신규 임직원 등록</summary>
          <div className={styles.optionalBody}>
            <div className={styles.formGrid}>
              <input
                className={styles.input}
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="이름"
                disabled={busy}
              />
              <input
                className={styles.input}
                value={createBirthDate}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(event) => setCreateBirthDate(event.target.value.replace(/\D/g, ""))}
                placeholder="생년월일 8자리 (YYYYMMDD)"
                maxLength={8}
                disabled={busy}
              />
              <input
                className={styles.input}
                value={createPhone}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(event) => setCreatePhone(event.target.value.replace(/\D/g, ""))}
                placeholder="휴대폰 10~11자리"
                maxLength={11}
                disabled={busy}
              />
            </div>
            <div className={styles.formGrid}>
              <input
                className={styles.input}
                value={createAppUserId}
                onChange={(event) => setCreateAppUserId(event.target.value)}
                placeholder="연결 AppUser ID (선택)"
                disabled={busy}
              />
              <input
                className={styles.input}
                value={createProvider}
                onChange={(event) => setCreateProvider(event.target.value)}
                placeholder="연동 제공자 (기본: HYPHEN_NHIS)"
                disabled={busy}
              />
              <button
                type="button"
                className={styles.buttonPrimary}
                onClick={() => void handleCreateEmployee()}
                disabled={busy}
              >
                신규 직원 등록
              </button>
            </div>
          </div>
        </details>

        <div className={styles.splitLayout}>
          <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
            <div className={styles.sidebarHead}>
              <div className={styles.sidebarTitleRow}>
                <h2 className={styles.sectionTitle}>직원 목록</h2>
                <span className={styles.sidebarBadge}>총 {employees.length}명</span>
              </div>
              <p className={styles.sidebarHeadMeta}>
                {selectedEmployee
                  ? `선택: ${selectedEmployee.name} / ${formatRelativeTime(selectedEmployee.updatedAt)}`
                  : "직원을 선택해 주세요."}
              </p>
            </div>
            <div className={`${styles.listWrap} ${styles.listWrapGrid}`}>
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  className={`${styles.listButton} ${
                    selectedEmployeeId === employee.id ? styles.listButtonActive : ""
                  }`}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  disabled={busy}
                >
                  <span className={styles.listTopRow}>
                    <span className={styles.listAvatar}>{employee.name.slice(0, 1)}</span>
                    <span className={styles.listTitle}>{employee.name}</span>
                  </span>
                  <span className={styles.listMeta}>
                    {employee.birthDate} / {employee.phoneNormalized}
                  </span>
                  <span className={styles.listMeta}>
                    스냅샷 {employee.counts.healthSnapshots} · 리포트 {employee.counts.reports}
                  </span>
                </button>
              ))}
              {employees.length === 0 ? (
                <div className={styles.noticeInfo}>조회된 직원 데이터가 없습니다.</div>
              ) : null}
            </div>
          </section>

          <div className={styles.stack}>
            {!opsData ? (
              <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
                <p className={styles.reportSelectionPlaceholderText}>
                  직원을 선택하면 운영 데이터를 조회할 수 있습니다.
                </p>
              </section>
            ) : null}

            {opsData ? (
              <>
                <section className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>
                    {opsData.employee.name} ({opsData.employee.birthDate})
                  </h2>
                  <p className={styles.sectionDescription}>
                    마지막 동기화 {formatDateTime(opsData.employee.lastSyncedAt)} · 마지막 조회{" "}
                    {formatDateTime(opsData.employee.lastViewedAt)}
                  </p>
                  <div className={styles.formGrid}>
                    <input
                      className={styles.input}
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      placeholder="이름"
                      disabled={busy}
                    />
                    <input
                      className={styles.input}
                      value={editBirthDate}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(event) => setEditBirthDate(event.target.value.replace(/\D/g, ""))}
                      placeholder="생년월일 8자리"
                      maxLength={8}
                      disabled={busy}
                    />
                    <input
                      className={styles.input}
                      value={editPhone}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(event) => setEditPhone(event.target.value.replace(/\D/g, ""))}
                      placeholder="휴대폰 10~11자리"
                      maxLength={11}
                      disabled={busy}
                    />
                  </div>
                  <div className={styles.formGrid}>
                    <input
                      className={styles.input}
                      value={editAppUserId}
                      onChange={(event) => setEditAppUserId(event.target.value)}
                      placeholder="AppUser ID (비우면 연결 해제)"
                      disabled={busy}
                    />
                    <input
                      className={styles.input}
                      value={editProvider}
                      onChange={(event) => setEditProvider(event.target.value)}
                      placeholder="연동 제공자"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className={styles.buttonPrimary}
                      onClick={() => void handleSaveEmployeeProfile()}
                      disabled={busy}
                    >
                      기본 정보 저장
                    </button>
                  </div>
                </section>

                <section className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>운영 작업</h2>
                  <div className={styles.actionRow}>
                    <input
                      type="month"
                      className={styles.input}
                      value={periodResetKey}
                      onChange={(event) => setPeriodResetKey(event.target.value)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className={styles.buttonGhost}
                      onClick={() => void handleResetPeriodData()}
                      disabled={busy}
                    >
                      기간 데이터 초기화
                    </button>
                    <button
                      type="button"
                      className={styles.buttonDanger}
                      onClick={() => void handleResetAllData()}
                      disabled={busy}
                    >
                      전체 B2B 산출 데이터 초기화
                    </button>
                  </div>
                  <div className={styles.actionRow}>
                    <label className={styles.inlineHint}>
                      <input
                        type="checkbox"
                        checked={includeAccessLogs}
                        onChange={(event) => setIncludeAccessLogs(event.target.checked)}
                        disabled={busy}
                      />{" "}
                      접근 로그 삭제
                    </label>
                    <label className={styles.inlineHint}>
                      <input
                        type="checkbox"
                        checked={includeAdminLogs}
                        onChange={(event) => setIncludeAdminLogs(event.target.checked)}
                        disabled={busy}
                      />{" "}
                      관리자 로그 삭제
                    </label>
                  </div>
                  <div className={styles.actionRow}>
                    <label className={styles.inlineHint}>
                      <input
                        type="checkbox"
                        checked={clearLink}
                        onChange={(event) => setClearLink(event.target.checked)}
                        disabled={busy}
                      />{" "}
                      하이픈 링크 세션 초기화
                    </label>
                    <label className={styles.inlineHint}>
                      <input
                        type="checkbox"
                        checked={clearFetchCache}
                        onChange={(event) => setClearFetchCache(event.target.checked)}
                        disabled={busy}
                      />{" "}
                      하이픈 캐시 삭제
                    </label>
                    <label className={styles.inlineHint}>
                      <input
                        type="checkbox"
                        checked={clearFetchAttempts}
                        onChange={(event) => setClearFetchAttempts(event.target.checked)}
                        disabled={busy}
                      />{" "}
                      하이픈 조회 이력 삭제
                    </label>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => void handleClearHyphenCache()}
                      disabled={busy}
                    >
                      하이픈 캐시/세션 정리
                    </button>
                  </div>
                  <div className={styles.optionalCard}>
                    <p className={styles.optionalText}>
                      직원 전체 삭제가 필요하면 확인 입력란에 직원명을 정확히 입력하세요.
                    </p>
                    <div className={styles.actionRow}>
                      <input
                        className={styles.input}
                        value={deleteConfirmName}
                        onChange={(event) => setDeleteConfirmName(event.target.value)}
                        placeholder={`삭제 확인: ${opsData.employee.name}`}
                        disabled={busy}
                        style={{ minWidth: 240 }}
                      />
                      <button
                        type="button"
                        className={styles.buttonDanger}
                        onClick={() => void handleDeleteEmployee()}
                        disabled={busy}
                      >
                        직원 전체 삭제
                      </button>
                    </div>
                  </div>
                </section>

                <section className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>데이터 현황</h2>
                  <div className={styles.kvRow}>
                    <div className={styles.kvCard}>
                      <span className={styles.kvLabel}>스냅샷</span>
                      <span className={styles.kvValue}>{opsData.summary.counts.healthSnapshots}</span>
                    </div>
                    <div className={styles.kvCard}>
                      <span className={styles.kvLabel}>설문</span>
                      <span className={styles.kvValue}>{opsData.summary.counts.surveyResponses}</span>
                    </div>
                    <div className={styles.kvCard}>
                      <span className={styles.kvLabel}>분석</span>
                      <span className={styles.kvValue}>{opsData.summary.counts.analysisResults}</span>
                    </div>
                    <div className={styles.kvCard}>
                      <span className={styles.kvLabel}>코멘트</span>
                      <span className={styles.kvValue}>{opsData.summary.counts.pharmacistNotes}</span>
                    </div>
                    <div className={styles.kvCard}>
                      <span className={styles.kvLabel}>리포트</span>
                      <span className={styles.kvValue}>{opsData.summary.counts.reports}</span>
                    </div>
                    <div className={styles.kvCard}>
                      <span className={styles.kvLabel}>하이픈 캐시(유효/전체)</span>
                      <span className={styles.kvValue}>
                        {opsData.summary.counts.healthFetchCachesValid}/
                        {opsData.summary.counts.healthFetchCaches}
                      </span>
                    </div>
                  </div>
                  <p className={styles.inlineHint}>
                    가용 기간:{" "}
                    {opsData.summary.periods.length > 0
                      ? opsData.summary.periods.join(", ")
                      : "기간 데이터 없음"}
                  </p>
                </section>

                {recordSections.map((section) => (
                  <RecordListSection
                    key={section.title}
                    title={section.title}
                    rows={section.rows}
                    busy={busy}
                    onDeleteRecord={handleDeleteRecord}
                  />
                ))}

                <details className={styles.optionalCard}>
                  <summary>하이픈 캐시/조회이력</summary>
                  <div className={styles.optionalBody}>
                    {opsData.healthLink ? (
                      <>
                        <RecordListSection
                          title="\uD558\uC774\uD508 \uCE90\uC2DC \uB808\uCF54\uB4DC"
                          rows={healthLinkRows?.fetchCaches ?? []}
                          busy={busy}
                          onDeleteRecord={handleDeleteRecord}
                        />
                        <RecordListSection
                          title="\uD558\uC774\uD508 \uC870\uD68C \uC2DC\uB3C4"
                          rows={healthLinkRows?.fetchAttempts ?? []}
                          busy={busy}
                          onDeleteRecord={handleDeleteRecord}
                        />
                      </>
                    ) : (
                      <p className={styles.noticeInfo}>
                        appUserId가 연결되지 않아 하이픈 연동 정보를 조회할 수 없습니다.
                      </p>
                    )}
                  </div>
                </details>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
