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

  return (
    <section className={`${styles.sectionCard} ${styles.employeeBrowserCard}`}>
      <div className={styles.employeeBrowserHead}>
        <div className={styles.sidebarTitleRow}>
          <h2 className={styles.sectionTitle}>{"\uc784\uc9c1\uc6d0 \ube0c\ub77c\uc6b0\uc800"}</h2>
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
            <p className={styles.inlineHint}>임직원을 선택하면 여기서 바로 요약해 보여드립니다.</p>
          )}
        </div>

        <div className={styles.employeeBrowserSummaryAside}>
          <span className={styles.employeeBrowserStatPill}>
            전체 스냅샷 {totalSnapshots.toLocaleString("ko-KR")}건
          </span>
          <span className={styles.employeeBrowserStatPill}>
            전체 리포트 {totalReports.toLocaleString("ko-KR")}건
          </span>
          <span className={styles.employeeBrowserStatHint}>
            이름, 생년월일, 전화번호 검색 결과를 여기서 바로 고를 수 있어요.
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
            <p className={styles.inlineHint}>
              {"\uc870\ud68c\ub41c \uc784\uc9c1\uc6d0 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
