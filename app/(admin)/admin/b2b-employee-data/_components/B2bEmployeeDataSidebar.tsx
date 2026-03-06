import { useMemo } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeListItem } from "../_lib/client-types";
import { formatRelativeTime } from "../_lib/client-utils";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";

type B2bEmployeeDataSidebarProps = {
  employees: EmployeeListItem[];
  selectedEmployeeId: string | null;
  busy: boolean;
  onSelectEmployee: (employeeId: string) => void;
};

export default function B2bEmployeeDataSidebar({
  employees,
  selectedEmployeeId,
  busy,
  onSelectEmployee,
}: B2bEmployeeDataSidebarProps) {
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  return (
    <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
      <div className={styles.sidebarHead}>
        <div className={styles.sidebarTitleRow}>
          <h2 className={styles.sectionTitle}>{EMPLOYEE_DATA_COPY.sidebar.title}</h2>
          <span className={styles.sidebarBadge}>
            {EMPLOYEE_DATA_COPY.sidebar.totalPrefix} {employees.length}명
          </span>
        </div>
        <p className={styles.sidebarHeadMeta}>
          {selectedEmployee
            ? `${EMPLOYEE_DATA_COPY.sidebar.selectedPrefix}: ${selectedEmployee.name} / ${formatRelativeTime(
                selectedEmployee.updatedAt
              )}`
            : EMPLOYEE_DATA_COPY.sidebar.selectGuide}
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
            onClick={() => onSelectEmployee(employee.id)}
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
              {EMPLOYEE_DATA_COPY.sidebar.healthSnapshotPrefix} {employee.counts.healthSnapshots}건 /{" "}
              {EMPLOYEE_DATA_COPY.sidebar.reportPrefix} {employee.counts.reports}건
            </span>
          </button>
        ))}
        {employees.length === 0 ? (
          <div className={styles.noticeInfo}>{EMPLOYEE_DATA_COPY.sidebar.empty}</div>
        ) : null}
      </div>
    </section>
  );
}
