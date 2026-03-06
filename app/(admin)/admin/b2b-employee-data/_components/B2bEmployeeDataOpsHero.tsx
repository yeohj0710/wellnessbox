import styles from "@/components/b2b/B2bUx.module.css";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";

type B2bEmployeeDataOpsHeroProps = {
  search: string;
  busy: boolean;
  busyMessage: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onRefresh: () => void;
};

export default function B2bEmployeeDataOpsHero({
  search,
  busy,
  busyMessage,
  onSearchChange,
  onSearchSubmit,
  onRefresh,
}: B2bEmployeeDataOpsHeroProps) {
  return (
    <header className={styles.heroCard}>
      <p className={styles.kicker}>{EMPLOYEE_DATA_COPY.hero.kicker}</p>
      <h1 className={styles.title}>{EMPLOYEE_DATA_COPY.hero.title}</h1>
      <p className={styles.description}>{EMPLOYEE_DATA_COPY.hero.description}</p>
      <div className={styles.actionRow}>
        <input
          className={styles.input}
          placeholder={EMPLOYEE_DATA_COPY.hero.searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          disabled={busy}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearchSubmit();
            }
          }}
          style={{ minWidth: 280 }}
        />
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={onSearchSubmit}
          disabled={busy}
        >
          {EMPLOYEE_DATA_COPY.hero.searchButton}
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onRefresh} disabled={busy}>
          {EMPLOYEE_DATA_COPY.hero.refreshButton}
        </button>
      </div>
      {busyMessage ? (
        <p className={styles.inlineHint}>
          {EMPLOYEE_DATA_COPY.hero.busyPrefix}: {busyMessage}
        </p>
      ) : null}
    </header>
  );
}
