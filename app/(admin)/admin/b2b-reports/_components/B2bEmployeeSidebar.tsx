"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import B2bAdminEmployeeManagementPanel from "./B2bAdminEmployeeManagementPanel";
import type { EmployeeListItem } from "../_lib/client-types";
import { normalizeDigits } from "../_lib/client-utils";

type B2bEmployeeSidebarProps = {
  employees: EmployeeListItem[];
  selectedEmployeeId: string | null;
  searchQuery: string;
  busy: boolean;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
  loadEmployees: (query?: string) => Promise<void>;
  onSelectEmployee: (employeeId: string) => void;
};

export default function B2bEmployeeSidebar({
  employees,
  selectedEmployeeId,
  searchQuery,
  busy,
  setSelectedEmployeeId,
  loadEmployees,
  onSelectEmployee,
}: B2bEmployeeSidebarProps) {
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const orderedEmployees = [
    ...employees.filter((employee) => employee.id === selectedEmployeeId),
    ...employees.filter((employee) => employee.id !== selectedEmployeeId),
  ];
  const totalSnapshots = employees.reduce(
    (sum, employee) => sum + employee.counts.healthSnapshots,
    0
  );
  const totalReports = employees.reduce(
    (sum, employee) => sum + employee.counts.reports,
    0
  );

  useEffect(() => {
    if (!selectedEmployeeId) {
      setIsManagementOpen(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (!isManagementOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsManagementOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isManagementOpen]);

  return (
    <>
      <section className={`${styles.sectionCard} ${styles.employeeBrowserCard}`}>
        <div className={styles.employeeBrowserHead}>
          <div className={styles.sidebarTitleRow}>
            <h2 className={styles.sectionTitle}>임직원 브라우저</h2>
            <span className={styles.sidebarBadge}>
              {"총 " + employees.length.toLocaleString("ko-KR") + "명"}
            </span>
          </div>
          <p className={styles.sidebarHeadMeta}>
            {"스냅샷 " +
              totalSnapshots.toLocaleString("ko-KR") +
              "건 · 리포트 " +
              totalReports.toLocaleString("ko-KR") +
              "건"}
          </p>
        </div>

        <div className={styles.employeeBrowserSummaryRow}>
          <div className={styles.employeeBrowserSummaryCard}>
            <p className={styles.employeeBrowserSummaryLabel}>현재 선택</p>
            {selectedEmployee ? (
              <>
                <div className={styles.employeeBrowserSummaryMain}>
                  <span className={styles.employeeBrowserSummaryAvatar}>
                    {(selectedEmployee.name || "?").slice(0, 1)}
                  </span>
                  <div className={styles.employeeBrowserSummaryText}>
                    <p className={styles.employeeBrowserSummaryName}>{selectedEmployee.name}</p>
                    <p className={styles.employeeBrowserSummaryMeta}>
                      {selectedEmployee.birthDate} /{" "}
                      {normalizeDigits(selectedEmployee.phoneNormalized)}
                    </p>
                  </div>
                </div>
                <div className={styles.employeeBrowserStatPills}>
                  <span className={styles.employeeBrowserStatPill}>
                    스냅샷 {selectedEmployee.counts.healthSnapshots.toLocaleString("ko-KR")}건
                  </span>
                  <span className={styles.employeeBrowserStatPill}>
                    리포트 {selectedEmployee.counts.reports.toLocaleString("ko-KR")}건
                  </span>
                </div>
              </>
            ) : (
              <p className={styles.inlineHint}>
                직원을 선택하면 여기에서 바로 요약과 관리 작업을 이어갈 수 있습니다.
              </p>
            )}
            <div className={styles.employeeBrowserSummaryActions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => setIsManagementOpen(true)}
                disabled={busy || !selectedEmployee}
              >
                직원 데이터 관리
              </button>
              <span className={styles.employeeBrowserSummaryActionHint}>
                {selectedEmployee
                  ? "선택한 직원 기준으로 프로필 수정과 기록 정리를 한 번에 엽니다."
                  : "직원을 먼저 고르면 관리 모달을 바로 열 수 있습니다."}
              </span>
            </div>
          </div>

          <div className={styles.employeeBrowserSummaryAside}>
            <span className={styles.employeeBrowserStatPill}>
              전체 스냅샷 {totalSnapshots.toLocaleString("ko-KR")}건
            </span>
            <span className={styles.employeeBrowserStatPill}>
              전체 리포트 {totalReports.toLocaleString("ko-KR")}건
            </span>
            <span className={styles.employeeBrowserStatHint}>
              이름, 생년월일, 전화번호 검색 결과를 여기에서 바로 고를 수 있어요.
            </span>
          </div>
        </div>

        <div className={styles.employeeBrowserScroller}>
          <div className={`${styles.listWrap} ${styles.employeeBrowserGrid}`}>
            {orderedEmployees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => onSelectEmployee(employee.id)}
                disabled={busy}
                className={`${styles.listButton} ${
                  selectedEmployeeId === employee.id ? styles.listButtonActive : ""
                }`}
              >
                <span className={styles.listTopRow}>
                  <span className={styles.listAvatar}>{(employee.name || "?").slice(0, 1)}</span>
                  <span className={styles.listTitle}>{employee.name}</span>
                </span>
                <span className={styles.listMeta}>
                  {employee.birthDate} / {normalizeDigits(employee.phoneNormalized)}
                </span>
                <span className={styles.employeeBrowserCardPills}>
                  <span className={styles.employeeBrowserMiniPill}>
                    스냅샷 {employee.counts.healthSnapshots.toLocaleString("ko-KR")}건
                  </span>
                  <span className={styles.employeeBrowserMiniPill}>
                    리포트 {employee.counts.reports.toLocaleString("ko-KR")}건
                  </span>
                </span>
              </button>
            ))}
            {employees.length === 0 ? (
              <p className={styles.inlineHint}>조회된 임직원 데이터가 없습니다.</p>
            ) : null}
          </div>
        </div>
      </section>

      {isManagementOpen && selectedEmployee ? (
        <div
          className={styles.adminModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsManagementOpen(false);
            }
          }}
        >
          <section
            className={styles.adminModalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-management-modal-title"
          >
            <div className={styles.adminModalHeader}>
              <div className={styles.adminModalHeaderText}>
                <p className={styles.adminModalEyebrow}>현재 선택 직원</p>
                <h3 id="employee-management-modal-title" className={styles.adminModalTitle}>
                  직원 데이터 관리
                </h3>
                <p className={styles.adminModalMeta}>
                  {selectedEmployee.name} · {selectedEmployee.birthDate} ·{" "}
                  {normalizeDigits(selectedEmployee.phoneNormalized)}
                </p>
              </div>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => setIsManagementOpen(false)}
              >
                닫기
              </button>
            </div>
            <div className={styles.adminModalBody}>
              <B2bAdminEmployeeManagementPanel
                embedded
                searchQuery={searchQuery}
                selectedEmployeeId={selectedEmployeeId}
                setSelectedEmployeeId={setSelectedEmployeeId}
                loadEmployees={loadEmployees}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
