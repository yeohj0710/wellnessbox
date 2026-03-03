import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeListItem } from "../_lib/client-types";
import { normalizeDigits } from "../_lib/client-utils";

type B2bEmployeeSidebarProps = {
  employees: EmployeeListItem[];
  selectedEmployeeId: string | null;
  busy: boolean;
  onSelectEmployee: (employeeId: string) => void;
};

export default function B2bEmployeeSidebar({
  employees,
  selectedEmployeeId,
  busy,
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
        <div className={styles.sidebarTitleRow}>
          <h2 className={styles.sectionTitle}>{"\uc784\uc9c1\uc6d0 \ubaa9\ub85d"}</h2>
          <span className={styles.sidebarBadge}>
            {"\ucd1d " + employees.length.toLocaleString("ko-KR") + "\uba85"}
          </span>
        </div>
        <p className={styles.sidebarHeadMeta}>
          {"\uc2a4\ub0c5\uc0f7 " +
            totalSnapshots.toLocaleString("ko-KR") +
            "\uac74 \u00b7 \ub9ac\ud3ec\ud2b8 " +
            totalReports.toLocaleString("ko-KR") +
            "\uac74"}
        </p>
        {selectedEmployee ? (
          <p className={styles.sidebarHeadMeta}>
            {"\uc120\ud0dd: " + selectedEmployee.name}
          </p>
        ) : null}
      </div>

      <div className={`${styles.listWrap} ${styles.listWrapGrid}`}>
        {employees.map((employee) => (
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
            <span className={styles.listMeta}>
              {"\uc2a4\ub0c5\uc0f7 " +
                employee.counts.healthSnapshots.toLocaleString("ko-KR") +
                "\uac74 / \ub9ac\ud3ec\ud2b8 " +
                employee.counts.reports.toLocaleString("ko-KR") +
                "\uac74"}
            </span>
          </button>
        ))}
        {employees.length === 0 ? (
          <p className={styles.inlineHint}>
            {"\uc870\ud68c\ub41c \uc784\uc9c1\uc6d0 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
