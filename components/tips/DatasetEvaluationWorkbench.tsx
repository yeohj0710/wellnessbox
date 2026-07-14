"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./interim.module.css";

type SplitId = "train" | "validation" | "calibration" | "blind_test";
type Split = { id: SplitId; label: string; records: number; use: string; scoring: string };
type CaseRow = { caseId: string; archetypeId: string; profile: Record<string, unknown>; gold: string[]; teacherSession: string; verifierDecision: string };
type Verification = { split: SplitId; evaluated: number; exactMatches: number; mismatches: number; exactMatchPercent: number };

async function callLab(action: "dataset_registry" | "list_dataset_cases" | "verify_dataset_split", payload: Record<string, unknown> = {}) {
  const initialized = await fetch("/api/tips/lab", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"initialize"}) });
  if (!initialized.ok) throw new Error("평가 세션 초기화 실패");
  const initial = await initialized.json();
  const response = await fetch("/api/tips/lab", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action,stateToken:initial.stateToken,payload}) });
  const result = await response.json();
  if (!response.ok) throw new Error(String(result.error ?? "데이터 요청 실패"));
  return result;
}

const format = (value:number) => new Intl.NumberFormat("ko-KR").format(value);

export default function DatasetEvaluationWorkbench() {
  const [splits,setSplits]=useState<Split[]>([]);
  const [active,setActive]=useState<SplitId>("blind_test");
  const [cases,setCases]=useState<CaseRow[]>([]);
  const [page,setPage]=useState(1);
  const [pages,setPages]=useState(1);
  const [results,setResults]=useState<Partial<Record<SplitId,Verification>>>({});
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");

  const loadCases=useCallback(async(split:SplitId,nextPage=1)=>{
    setBusy("cases"); setError("");
    try { const data=await callLab("list_dataset_cases",{split,page:nextPage,pageSize:8}); setCases(data.datasetCases.rows); setPage(data.datasetCases.page); setPages(data.datasetCases.pages); }
    catch(e){setError(e instanceof Error?e.message:"데이터 조회 실패");}
    finally{setBusy("");}
  },[]);

  useEffect(()=>{void (async()=>{try{const data=await callLab("dataset_registry");setSplits(data.dataset.splits);await loadCases("blind_test",1);}catch(e){setError(e instanceof Error?e.message:"데이터 계보 조회 실패");}})();},[loadCases]);
  async function select(split:SplitId){setActive(split);await loadCases(split,1);}
  async function verify(split:SplitId){setBusy(split);setError("");try{const data=await callLab("verify_dataset_split",{split});setResults(current=>({...current,[split]:data.datasetVerification}));}catch(e){setError(e instanceof Error?e.message:"재채점 실패");}finally{setBusy("");}}
  async function verifyHeldOut(){setBusy("heldout");setError("");for(const split of ["validation","calibration","blind_test"] as SplitId[]){try{const data=await callLab("verify_dataset_split",{split});setResults(current=>({...current,[split]:data.datasetVerification}));}catch(e){setError(e instanceof Error?e.message:"전체 재채점 실패");break;}}setBusy("");}

  const selected=splits.find(item=>item.id===active);
  return <section className={styles.datasetWorkbench} aria-labelledby="dataset-workbench-title">
    <header><div><span>DATA LINEAGE & REPLAY</span><h3 id="dataset-workbench-title">학습·평가 데이터 원문과 전체 재채점</h3><p>각 분할의 사례를 페이지 단위로 확인하고, 고정 모델을 전체 사례에 다시 실행합니다.</p></div><button type="button" onClick={verifyHeldOut} disabled={Boolean(busy)}>{busy==="heldout"?"평가 데이터 재채점 중…":"평가 데이터 30,000건 재채점"}</button></header>
    <div className={styles.datasetSplitTabs}>{splits.map(split=><button key={split.id} type="button" data-active={active===split.id} onClick={()=>select(split.id)}><span>{split.label}</span><strong>{format(split.records)}건</strong><small>{split.use}</small><em>{results[split.id]?`${results[split.id]!.exactMatchPercent.toFixed(2)}% 재계산 완료`:split.scoring}</em></button>)}</div>
    <div className={styles.datasetActions}><div><strong>{selected?.label} 데이터</strong><span>{active==="train"?"학습 데이터 적합도이며 독립 성능이 아닙니다.":"학습에 사용하지 않은 분할의 재현 결과입니다."}</span></div><button type="button" onClick={()=>verify(active)} disabled={Boolean(busy)}>{busy===active?"전체 사례 계산 중…":`${format(selected?.records??0)}건 전체 재채점`}</button></div>
    {results[active]&&<div className={styles.datasetScore}><div><span>채점 대상</span><strong>{format(results[active]!.evaluated)}건</strong></div><div><span>완전 일치</span><strong>{format(results[active]!.exactMatches)}건</strong></div><div><span>불일치</span><strong>{format(results[active]!.mismatches)}건</strong></div><div><span>추천 목록 일치율</span><strong>{results[active]!.exactMatchPercent.toFixed(2)}%</strong></div></div>}
    {error&&<p className={styles.datasetError}>{error}</p>}
    <div className={styles.datasetCases}><div className={styles.datasetCaseHead}><strong>원문 사례</strong><span>{page} / {pages}쪽</span><nav><button type="button" disabled={page<=1||Boolean(busy)} onClick={()=>loadCases(active,page-1)}>이전</button><button type="button" disabled={page>=pages||Boolean(busy)} onClick={()=>loadCases(active,page+1)}>다음</button></nav></div>{busy==="cases"?<p>사례를 불러오는 중입니다.</p>:cases.map(row=><article key={row.caseId}><div><span>{row.caseId}</span><strong>{row.archetypeId}</strong></div><dl><div><dt>입력</dt><dd>{Object.entries(row.profile).filter(([,value])=>Array.isArray(value)?value.length:Boolean(value)&&typeof value!=="object").slice(0,6).map(([key,value])=>`${key}: ${Array.isArray(value)?value.join(", "):String(value)}`).join(" · ")||"기본 조건"}</dd></div><div><dt>기준 추천</dt><dd>{row.gold.join(", ")||"추천 보류"}</dd></div><div><dt>검증</dt><dd>{row.teacherSession} · {row.verifierDecision}</dd></div></dl></article>)}</div>
  </section>;
}
