import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeListItem } from "../_lib/client-types";
import { normalizeDigits } from "../_lib/client-utils";

type B2bEmployeeSidebarProps = {
  employees: EmployeeListItem[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (employeeId: string) => void;
};

export default function B2bEmployeeSidebar({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
}: B2bEmployeeSidebarProps) {
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const totalSnapshots = employees.reduce(
    (sum, employee) => sum + employee.counts.healthSnapshots,
    0
  );
  const totalReports = employees.reduce(
    (sum, employee) => sum + employee.counts.reports,
    0
  );

  return (
    <section className={`${styles.sectionCard} ${styles.sidebarCard}`}>
      <div className={styles.sidebarHead}>
        <h2 className={styles.sectionTitle}>임직원 목록</h2>
        <div className={styles.sidebarBadgeRow}>
          <span className={styles.sidebarBadge}>총 {employees.length}명</span>
          <span className={styles.sidebarBadge}>스냅샷 {totalSnapshots}건</span>
          <span className={styles.sidebarBadge}>레포트 {totalReports}건</span>
          {selectedEmployee ? (
            <span className={styles.sidebarBadge}>선택: {selectedEmployee.name}</span>
          ) : null}
        </div>
      </div>

      <div className={`${styles.listWrap} ${styles.listWrapGrid}`}>
        {employees.map((employee) => (
          <button
            key={employee.id}
            type="button"
            onClick={() => onSelectEmployee(employee.id)}
            className={`${styles.listButton} ${
              selectedEmployeeId === employee.id ? styles.listButtonActive : ""
            }`}
          >
            <span className={styles.listTopRow}>
              <span className={styles.listAvatar}>
                {(employee.name || "?").slice(0, 1)}
              </span>
              <span className={styles.listTitle}>{employee.name}</span>
            </span>
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
  );
}
