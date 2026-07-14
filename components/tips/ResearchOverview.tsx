"use client";

import researchJson from "@/data/tips/interim-research-summary.json";
import type { ResearchSummary } from "./research-types";
import styles from "./interim.module.css";
import DatasetEvaluationWorkbench from "./DatasetEvaluationWorkbench";
import { useState } from "react";

const research = researchJson as ResearchSummary;
const splits = [
  ["학습", research.dataset.splits.train, "train"],
  ["검증", research.dataset.splits.validation, "validation"],
  ["보정", research.dataset.splits.calibration, "calibration"],
  ["Blind D", research.dataset.splits.blindTest, "blind"],
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

const evaluationPaths: Record<string, { target: string; method: string; stage: number; action: string }> = {
  "KPI-1": { target: "추천 성분 목록의 프록시 기준 일치", method: "독립 시험 5,000건을 현재 모델로 재계산", stage: 1, action: "독립 시험 실행" },
  "KPI-2": { target: "복용 전후 표준화 PRO 변화량", method: "PSQI·ISI·PSS-10 점수를 입력해 변화량 계산", stage: 2, action: "효과 평가 실행" },
  "KPI-3": { target: "다음 작업 선택·상태 전이·사후조건", method: "정상·응급·동의 누락·중복·시간초과 시나리오 평가", stage: 5, action: "Agent 평가 실행" },
  "KPI-4": { target: "상담 응답의 기준 답변 일치와 중대 안전 오류", method: "상담 평가 표본과 저장 산출물 확인", stage: 6, action: "산출물 확인" },
  "KPI-5": { target: "안전 판정 label·근거 연결과 hard FN", method: "질환·약물·알레르기·위험 신호를 바꿔 판정 재현", stage: 3, action: "안전 판정 실행" },
  "KPI-6": { target: "추천 관련 이상사례 포착 건수", method: "중대한 이상사례 기록 후 추천 중단 상태 확인", stage: 5, action: "ADR 경로 실행" },
  "KPI-7": { target: "웨어러블·CGM·유전 데이터 연결 성공", method: "데이터 동의와 측정값 수집 상태 확인", stage: 5, action: "연동 경로 실행" },
};

export default function ResearchOverview({ onNavigate }: { onNavigate: (stage: number) => void }) {
  const [currentResults,setCurrentResults]=useState<Record<string,{display:string;passed:boolean;evaluated:number;detail:string}>>({});
  const [verifying,setVerifying]=useState(false);
  const [verificationError,setVerificationError]=useState("");
  async function verifyAll(){
    setVerifying(true);setVerificationError("");
    try{
      const initialized=await fetch("/api/tips/lab",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"initialize"})});
      if(!initialized.ok)throw new Error("평가 세션 초기화 실패");
      const initial=await initialized.json();
      const response=await fetch("/api/tips/lab",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"verify_all_kpis",stateToken:initial.stateToken})});
      const payload=await response.json();
      if(!response.ok)throw new Error(String(payload.error??"KPI 재평가 실패"));
      setCurrentResults(Object.fromEntries(payload.kpiVerification.results.map((item:{id:string;display:string;passed:boolean;evaluated:number;detail:string})=>[item.id,item])));
    }catch(error){setVerificationError(error instanceof Error?error.message:"KPI 재평가 실패");}
    finally{setVerifying(false);}
  }
  return (
    <section className={`${styles.section} ${styles.researchOverview}`} aria-labelledby="research-overview-title">
      <p className={styles.sectionLabel}>회로 연계 평가</p>
      <h2 id="research-overview-title" className={styles.sectionTitle}>기술 블록과 연결된 연구 데이터·성과지표</h2>
      <p className={styles.sectionBody}>위 회로의 기술 블록에서 확인한 데이터 흐름을 독립 시험, 효과 변화, 안전 판정과 후속 기록 평가로 검증합니다.</p>
      <div className={styles.researchStats}>
        <article><strong>{formatNumber(research.dataset.total)}</strong><span>Proxy gold 전체 데이터</span></article>
        <article><strong>7개</strong><span>평가 대상 KPI</span></article>
        <article><strong>{formatNumber(research.dataset.splits.blindTest)}</strong><span>독립 teacher D blind 평가</span></article>
        <article><strong>{research.provenance.fileCount}</strong><span>검증 산출물</span></article>
      </div>

      <div className={styles.researchPanel}>
        <div className={styles.panelHeading}>
          <div><span>DATASET</span><h3>데이터셋 분할 구성</h3></div>
          <p>41개 시나리오군 · 생성/검증 불일치 {formatNumber(research.dataset.generatorVerifierDisagreements)}건 · 전건 adjudication</p>
        </div>
        <div className={styles.splitBar} aria-label="데이터셋 분할 비율">
          {splits.map(([label, value, key]) => (
            <span key={key} className={styles[key]} style={{ width: `${(value / research.dataset.total) * 100}%` }} title={`${label} ${formatNumber(value)}건`} />
          ))}
        </div>
        <div className={styles.splitLegend}>
          {splits.map(([label, value, key]) => <div key={key}><i className={styles[key]} /><strong>{label}</strong><span>{formatNumber(value)}건</span></div>)}
        </div>
        <div className={styles.teacherFlow}>
          <span>A/B 생성</span><b>→</b><span>C 검증</span><b>→</b><span>C2 중재</span><b>→</b><span>D 독립 blind</span>
        </div>
      </div>

      <DatasetEvaluationWorkbench />

      <div className={styles.kpiHeading}>
        <div><span>KPI EVALUATION</span><h3>성과지표별 평가 실행</h3></div>
        <div className={styles.kpiHeadingAction}><p>직전 산출물과 현재 재실행 결과를 구분해 확인합니다.</p><button type="button" onClick={verifyAll} disabled={verifying}>{verifying?"전체 데이터 채점 중…":"7개 KPI 전체 데이터 재평가"}</button></div>
      </div>
      {verificationError&&<p className={styles.datasetError}>{verificationError}</p>}
      <div className={styles.kpiEvaluationTable}>
        <div className={styles.kpiEvaluationHead} aria-hidden="true"><span>성과지표</span><span>측정·평가 방법</span><span>판정 기준</span><span>이번 실행 결과</span><span>직접 평가</span></div>
        {research.kpis.map((kpi) => {
          const path = evaluationPaths[kpi.id];
          const current=currentResults[kpi.id];
          return <article key={kpi.id} className={styles.kpiEvaluationRow}>
            <div className={styles.kpiIdentity}><span>{kpi.id}</span><strong>{kpi.name}</strong><small>n={formatNumber(kpi.n)}</small></div>
            <div className={styles.kpiMethod}><strong>{path.target}</strong><span>{path.method}</span></div>
            <div className={styles.kpiCriterion}><small>계획 기준</small><strong>{kpi.threshold}</strong><span>평가 기준 {kpi.guardband}</span></div>
            <div className={styles.kpiObserved}><small>{current?`${formatNumber(current.evaluated)}건 현재 재계산`:`직전 산출물 ${kpi.displayValue}`}</small><strong>{current?current.display:"실행 전"}</strong><span data-pass={current?.passed??false} data-pending={!current}>{current?(current.passed?"기준 충족":"기준 미충족"):"재평가 필요"}</span>{current&&<small>{current.detail}</small>}</div>
            <button type="button" onClick={() => onNavigate(path.stage)}>{path.action}</button>
          </article>;
        })}
      </div>
      <p className={styles.kpiFootnote}>KPI-1의 100.00%는 독립 프록시 시험 5,000건의 추천 목록 일치율입니다. KPI-3의 Agent 판단·실행 성능과는 별도로 산출됩니다.</p>
    </section>
  );
}
