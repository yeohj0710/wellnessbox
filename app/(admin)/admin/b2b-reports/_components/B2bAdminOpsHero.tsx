import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import styles from "@/components/b2b/B2bUx.module.css";

type B2bAdminOpsHeroProps = {
  search: string;
  busy: boolean;
  demoMode: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSeedDemo: () => void;
};

export default function B2bAdminOpsHero({
  search,
  busy,
  demoMode,
  onSearchChange,
  onSearchSubmit,
  onSeedDemo,
}: B2bAdminOpsHeroProps) {
  return (
    <header className={styles.heroCard}>
      <p className={styles.kicker}>B2B REPORT OPS</p>
      <h1 className={styles.title}>임직원 건강 리포트 관리</h1>
      <p className={styles.description}>
        임직원을 선택하면 해당 기간 리포트가 바로 열려요. 필요할 때만 설문,
        코멘트, 레이아웃을 수정하고 PDF까지 이어서 확인할 수 있어요.
      </p>
      <div className={styles.actionRow}>
        <input
          className={styles.input}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          disabled={busy}
          onKeyDown={(event) => {
            if (busy) return;
            if (event.key === "Enter") {
              event.preventDefault();
              onSearchSubmit();
            }
          }}
          placeholder="이름, 생년월일, 전화번호 검색"
          style={{ minWidth: 280 }}
        />
        <button
          type="button"
          onClick={onSearchSubmit}
          disabled={busy}
          className={styles.buttonPrimary}
        >
          {busy ? <InlineSpinnerLabel label="검색 중" /> : "검색"}
        </button>
        {demoMode ? (
          <button
            type="button"
            onClick={onSeedDemo}
            disabled={busy}
            className={styles.buttonSecondary}
          >
            {busy ? <InlineSpinnerLabel label="생성 중" /> : "데모 생성"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
