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
      <h1 className={styles.title}>임직원 건강 레포트 운영</h1>
      <p className={styles.description}>
        임직원을 선택하면 해당 기간 레포트가 바로 열려요. 필요한 경우에만 설문, 코멘트,
        레이아웃을 수정한 뒤 PDF/PPTX로 내려받아 전달해 주세요.
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
          placeholder="이름, 생년월일, 휴대폰 번호 검색"
          style={{ minWidth: 280 }}
        />
        <button
          type="button"
          onClick={onSearchSubmit}
          disabled={busy}
          className={styles.buttonPrimary}
        >
          {busy ? "검색 중..." : "검색"}
        </button>
        {demoMode ? (
          <button
            type="button"
            onClick={onSeedDemo}
            disabled={busy}
            className={styles.buttonSecondary}
          >
            {busy ? "생성 중..." : "데모 생성"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
