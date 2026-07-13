"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./interim.module.css";

type Filter = "all" | "matched" | "mismatched" | "safety";
type BlindRow = {
  caseId: string;
  archetypeId: string;
  profile: Record<string, unknown>;
  gold: string[];
  predicted: string[];
  storedPredicted: string[];
  liveInference: { activeFeatureCount: number; predictedCount: number };
  exactMatch: boolean;
  setPrecisionPercent: number;
  nextAction: string;
  riskTier: number;
  abstain: boolean;
  avoid: string[];
  defer: string[];
  evidenceIds: string[];
  safetyRuleIds: string[];
  verifierDecision: string;
  teacherSession: string;
  labelClass: string;
  provenance: { seed: number; disclosure: string; bulk_expansion: string };
};
type Summary = {
  evaluated: number;
  exactMatches: number;
  mismatches: number;
  exactMatchPercent: number;
  correctRecommendationSlots: number;
  recommendationSlots: number;
  setPrecisionPercent: number;
  safetyCases: number;
};
type ListResult = {
  totalBlindTestRows: number;
  filteredRows: number;
  page: number;
  pages: number;
  summary: Summary;
  rows: BlindRow[];
};

const FILTERS: Array<[Filter, string]> = [
  ["all", "전체 5,000건"],
  ["matched", "정답 일치"],
  ["mismatched", "불일치"],
  ["safety", "안전 개입"],
];

const INGREDIENTS: Record<string, string> = {
  "ING:MAGNESIUM": "마그네슘", "ING:POTASSIUM": "칼륨", "ING:IRON": "철분",
  "ING:OMEGA3": "오메가3", "ING:PROTEIN": "단백질", "ING:LUTEIN": "루테인",
  "ING:VITAMIN_D": "비타민 D", "ING:CALCIUM": "칼슘", "ING:PROBIOTIC": "프로바이오틱스",
  "ING:VITAMIN_B": "비타민 B", "ING:ZINC": "아연", "ING:COQ10": "코엔자임 Q10",
  "ING:MULTIVITAMIN": "멀티비타민", "ING:FIBER": "식이섬유",
  "ING:VITAMIN_C": "비타민 C",
};
const label = (id: string) => INGREDIENTS[id] ? `${INGREDIENTS[id]} (${id})` : id;
const format = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
const PROFILE_LABELS: Record<string, string> = {
  age_band: "연령대", allergies: "알레르기", conditions: "질환",
  current_supplements: "현재 복용 영양성분", diet_patterns: "식이 특성",
  genetic_features: "유전 특성", goals: "관리 목표", labs: "검사 결과",
  medication_classes: "복용 약물", preferences: "복용 선호 조건",
  pregnancy_status: "임신 상태", sex: "성별", sex_at_birth: "성별", wearable_features: "기기 측정 특성",
  risk_flags: "주의 조건", symptoms: "주요 증상",
};
const VALUE_LABELS: Record<string, string> = {
  male: "남성", female: "여성", not_applicable: "해당 없음", not_pregnant: "비임신",
  bone_health: "뼈 건강", sleep_quality: "수면의 질", exercise_recovery: "운동 회복",
  low_fortified_food: "강화식품 섭취 부족", low_protein: "단백질 섭취 부족", low_fish: "생선 섭취 부족",
  capsule: "캡슐", powder: "분말", CONTINUE: "추천 절차 계속", STOP_AND_ESCALATE: "추천 중단 후 전문가 확인",
  ACCEPT: "기준 충족", REJECT: "기준 미충족",
};
const ARCHETYPE_LABELS: Record<string, string> = {
  athlete_low_protein: "운동량이 많고 단백질 섭취가 부족한 사례",
  eye_strain: "눈의 피로를 호소하는 사례",
  healthy_low_sun: "질환은 없지만 햇빛 노출이 부족한 사례",
  low_fish_intake: "생선 섭취가 부족한 사례",
  chest_pain: "흉통 위험 신호가 있는 사례",
  ckd: "만성 신장질환이 있는 사례",
  vegan_b12: "채식으로 비타민 B12 섭취가 부족한 사례",
  surgery_upcoming: "수술 예정인 사례",
};

async function callLab(action: "list_blind_tests" | "verify_blind_tests", payload: Record<string, unknown>) {
  const initialized = await fetch("/api/tips/lab", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "initialize" }),
  });
  if (!initialized.ok) throw new Error(`초기화 실패 (${initialized.status})`);
  const initial = await initialized.json();
  const response = await fetch("/api/tips/lab", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, stateToken: initial.stateToken, payload }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(String(result.error ?? `요청 실패 (${response.status})`));
  return result;
}

function renderValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map((item) => renderValue(item)).join(", ") : "없음";
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return "없음";
    return entries.map(([key, item]) => {
      const names: Record<string, string> = { max_daily_pills: "하루 최대 복용 수", monthly_budget_krw: "월 예산", preferred_form: "선호 제형" };
      const rendered: string = key === "monthly_budget_krw" && typeof item === "number" ? `${format(item)}원` : renderValue(item);
      return `${names[key] ?? key}: ${rendered}`;
    }).join(" · ");
  }
  const text = String(value ?? "없음");
  return VALUE_LABELS[text] ?? text;
}

export default function BlindTestExplorer() {
  const [filter, setFilter] = useState<Filter>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResult | null>(null);
  const [selected, setSelected] = useState<BlindRow | null>(null);
  const [verified, setVerified] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [explanationOpen, setExplanationOpen] = useState(false);
  const requestSequence = useRef(0);
  const detailRef = useRef<HTMLElement>(null);

  const load = useCallback(async (nextPage: number, nextFilter: Filter, nextQuery: string) => {
    const requestId = ++requestSequence.current;
    setBusy(true); setError("");
    try {
      const data = await callLab("list_blind_tests", { page: nextPage, pageSize: 12, filter: nextFilter, query: nextQuery });
      if (requestId !== requestSequence.current) return;
      const list = data.blindTest as ListResult;
      setResult(list); setPage(list.page); setSelected((current) => current && list.rows.some((row) => row.caseId === current.caseId) ? current : list.rows[0] ?? null);
    } catch (cause) { if (requestId === requestSequence.current) setError(cause instanceof Error ? cause.message : "블라인드 테스트 데이터 조회 실패"); }
    finally { if (requestId === requestSequence.current) setBusy(false); }
  }, []);

  useEffect(() => { void load(1, "all", ""); }, [load]);
  useEffect(() => {
    if (!explanationOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setExplanationOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [explanationOpen]);

  const profileEntries = useMemo(() => selected ? Object.entries(selected.profile).filter(([key]) => key !== "profile_id") : [], [selected]);

  async function verifyAll() {
    setBusy(true); setError("");
    try {
      const data = await callLab("verify_blind_tests", { filter: "all" });
      setVerified(data.verification.summary as Summary);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "전체 블라인드 테스트 재검증 실패"); }
    finally { setBusy(false); }
  }

  function changeFilter(next: Filter) {
    setFilter(next); setQuery(""); setQueryInput(""); setVerified(null); void load(1, next, "");
  }

  function search() { const next = queryInput.trim(); setQuery(next); void load(1, filter, next); }
  function randomCase() {
    const index = Math.floor(Math.random() * 5000);
    const id = `case_proxy_blind_test_${String(index).padStart(7, "0")}`;
    setFilter("all"); setQueryInput(id); setQuery(id); void load(1, "all", id);
  }

  function selectCase(row: BlindRow) {
    setSelected(row);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function selectNextCase() {
    if (!result || !selected) return;
    const index = result.rows.findIndex((row) => row.caseId === selected.caseId);
    const next = result.rows[index + 1];
    if (next) return selectCase(next);
    if (page < result.pages) {
      await load(page + 1, filter, query);
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <section className={`${styles.section} ${styles.blindExplorer}`} aria-labelledby="blind-test-title">
      <p className={styles.sectionLabel}>추천 결과 재현 시험</p>
      <div className={styles.explainedTitleRow}>
        <h2 id="blind-test-title" className={styles.sectionTitle}>5,000명의 조건으로 추천 결과를 다시 계산합니다</h2>
        <button type="button" className={styles.explanationButton} onClick={() => setExplanationOpen(true)}>이 시험은 무엇인가요?</button>
      </div>
      <p className={styles.sectionBody}>모델이 각 사람에게 추천한 영양성분 목록을 미리 정한 기준 추천과 비교합니다.</p>

      <div className={styles.replaySummary}>
        <div><span>검증 대상</span><strong>{format(verified?.evaluated ?? result?.summary.evaluated ?? 5000)}건</strong></div>
        <div><span>완전 일치</span><strong>{format(verified?.exactMatches ?? result?.summary.exactMatches ?? 0)} / {format(verified?.evaluated ?? result?.summary.evaluated ?? 5000)}</strong></div>
        <div><span>추천 항목 정밀도</span><strong>{(verified?.setPrecisionPercent ?? result?.summary.setPrecisionPercent ?? 0).toFixed(2)}%</strong></div>
        <button type="button" onClick={verifyAll} disabled={busy}>{busy ? "계산 중…" : "5,000건 전체 다시 계산"}</button>
      </div>
      {verified && <p className={styles.verifyNotice} role="status">원본 5,000건 모델 재추론 완료 · 완전 일치 {format(verified.exactMatches)}건 · 불일치 {format(verified.mismatches)}건 · 안전 개입 {format(verified.safetyCases)}건</p>}

      <div className={styles.testToolbar}>
        <div className={styles.testFilters} role="group" aria-label="테스트 결과 필터">
          {FILTERS.map(([value, text]) => <button key={value} type="button" disabled={busy} className={filter === value ? styles.filterActive : ""} aria-pressed={filter === value} onClick={() => changeFilter(value)}>{text}</button>)}
        </div>
        <div className={styles.testSearch}>
          <input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && search()} placeholder="case ID 또는 archetype 검색" aria-label="케이스 검색" />
          <button type="button" disabled={busy} onClick={search}>검색</button>
          <button type="button" disabled={busy} onClick={randomCase}>무작위 1건</button>
        </div>
      </div>

      {error && <p className={styles.testError} role="alert">{error}</p>}
      <div className={styles.testWorkspace} aria-busy={busy}>
        <aside className={styles.caseList} aria-label="블라인드 테스트 케이스 목록">
          <div className={styles.caseListHeader}><strong>{format(result?.filteredRows ?? 0)}건</strong><span>{page} / {result?.pages ?? 1}쪽</span></div>
          {result?.rows.map((row) => (
            <button key={row.caseId} type="button" aria-pressed={selected?.caseId === row.caseId} className={selected?.caseId === row.caseId ? styles.caseActive : ""} onClick={() => selectCase(row)}>
              <span>시험 사례 {Number(row.caseId.slice(-7)) + 1}</span><strong>{ARCHETYPE_LABELS[row.archetypeId] ?? row.archetypeId}</strong><i className={row.exactMatch ? styles.pass : styles.fail}>{row.exactMatch ? "통과" : "확인 필요"}</i>
            </button>
          ))}
          <div className={styles.pagination}><button type="button" disabled={page <= 1 || busy} onClick={() => load(page - 1, filter, query)}>이전</button><button type="button" disabled={page >= (result?.pages ?? 1) || busy} onClick={() => load(page + 1, filter, query)}>다음</button></div>
        </aside>

        <article ref={detailRef} className={styles.caseDetail}>
          {selected ? <>
            <div className={styles.caseHeading}><div><span>현재 평가 사례</span><h3>{ARCHETYPE_LABELS[selected.archetypeId] ?? selected.archetypeId}</h3></div><b className={selected.exactMatch ? styles.pass : styles.fail}>평가 결과: {selected.exactMatch ? "통과" : "확인 필요"}</b></div>
            <dl className={styles.profileFacts}>{profileEntries.map(([key, value]) => <div key={key}><dt>{PROFILE_LABELS[key] ?? key}</dt><dd>{renderValue(value)}</dd></div>)}</dl>
            <div className={styles.answerCompare}>
              <div><span>이 조건에서 나와야 하는 추천</span><strong>{selected.gold.length ? selected.gold.map(label).join(", ") : "추천 없음"}</strong></div>
              <div><span>현재 모델이 계산한 추천</span><strong>{selected.predicted.length ? selected.predicted.map(label).join(", ") : "추천 없음"}</strong></div>
            </div>
            <dl className={styles.caseAudit}>
              <div><dt>추천 항목 비교</dt><dd>{selected.setPrecisionPercent.toFixed(2)}% 일치</dd></div>
              <div><dt>안전 규칙 처리</dt><dd>{selected.riskTier > 0 ? `위험 단계 ${selected.riskTier} 적용` : "추가 제한 없음"}</dd></div>
              <div><dt>모델 처리 결과</dt><dd>{VALUE_LABELS[selected.nextAction] ?? selected.nextAction}</dd></div>
            </dl>
            <div className={styles.caseNextAction}>
              <p><strong>{selected.exactMatch ? "이 사례는 통과했습니다." : "추천 결과가 기준과 다릅니다."}</strong><span>{selected.exactMatch ? "다음 사례를 같은 방식으로 평가할 수 있습니다." : "입력 조건과 안전 규칙 적용 결과를 확인하세요."}</span></p>
              <button type="button" onClick={selectNextCase} disabled={busy || (page >= (result?.pages ?? 1) && result?.rows.at(-1)?.caseId === selected.caseId)}>다음 사례 평가</button>
            </div>
          </> : <p>조건에 맞는 케이스가 없습니다.</p>}
        </article>
      </div>
      {explanationOpen ? (
        <div className={styles.explanationOverlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setExplanationOpen(false)}>
          <section className={styles.explanationModal} role="dialog" aria-modal="true" aria-labelledby="blind-explanation-title">
            <div className={styles.explanationModalHeader}>
              <div><span>시험 설명</span><h3 id="blind-explanation-title">추천 모델이 기준대로 작동하는지 확인하는 시험</h3></div>
              <button type="button" onClick={() => setExplanationOpen(false)} aria-label="설명 닫기">×</button>
            </div>
            <p className={styles.explanationLead}>학습에 사용하지 않은 가상 시험 대상 5,000명의 건강 조건을 모델에 다시 넣고, 모델이 고른 영양성분이 사전에 정한 기준 추천과 같은지 확인합니다.</p>
            <ol className={styles.explanationSteps}>
              <li><b>입력</b><span>나이, 건강 목표, 질환, 복용 약물, 알레르기 등 한 사람의 조건을 모델에 넣습니다.</span></li>
              <li><b>모델 출력</b><span>모델이 그 사람에게 적합하다고 계산한 영양성분 목록을 만듭니다.</span></li>
              <li><b>비교 대상</b><span>현재 모델의 추천 목록을 데이터에 미리 저장된 기준 추천 목록과 비교합니다.</span></li>
              <li><b>통과 판정</b><span>두 목록의 성분과 개수가 모두 같으면 `완전 일치`, 하나라도 다르면 `불일치`입니다.</span></li>
            </ol>
            <div className={styles.explanationGlossary}>
              <div><b>완전 일치</b><span>5,000명 중 추천 목록 전체가 기준과 똑같은 사람 수</span></div>
              <div><b>추천 항목 정밀도</b><span>모델이 추천한 전체 성분 중 기준 추천에도 포함된 성분의 비율</span></div>
              <div><b>안전 개입</b><span>약물·질환·알레르기 조건 때문에 후보를 제외하거나 추천을 중단한 사례</span></div>
            </div>
            <button type="button" className={styles.explanationClose} onClick={() => setExplanationOpen(false)}>설명 확인</button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
