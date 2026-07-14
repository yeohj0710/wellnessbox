"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./interim.module.css";

type WorkflowMapProps = {
  activeStage: number; agentState: string; safetyDecision: string;
  recommendationCount: number; consentCount: number; deviceConnected: boolean;
  dataLake?: { connected?:boolean; storedEventCount?:number; evidenceQueryCount?:number; proRecordCount?:number; deviceRecordCount?:number; adverseEventCount?:number; lastAction?:string } | null;
  onNavigate: (stage: number) => void;
  onExecuteNode: (nodeId:string) => Promise<Record<string,unknown>|null>;
};

type WorkflowNodeDetail = {
  title:string; role:string; status:string; receives:string[]; sends:string[]; implementation:string;
  evaluation:string; kpis:string[]; stage?:number;
};
type NodeProps = { className:string; title:string; subtitle:string; status?:string; detail:WorkflowNodeDetail; onOpen:(detail:WorkflowNodeDetail)=>void };
function Node({ className,title,subtitle,status,detail,onOpen }:NodeProps) {
  const content=<><strong>{title}</strong><span>{subtitle}</span>{status&&<em>{status}</em>}</>;
  return <button type="button" className={`${styles.archNode} ${className}`} onClick={()=>onOpen(detail)}>{content}<small>연결·상태 확인 →</small></button>;
}

const OUTPUT_LABELS:Record<string,string>={decision:"안전 판정",selectedTask:"선택 작업",targetState:"다음 상태",selectedCount:"선택 성분 수",evaluatedCandidates:"평가 후보 수",acceptedMeasurementCount:"수용 측정값 수",eventCount:"저장 작업 수",artifactCount:"노드 산출물 수",queuedWorkCount:"대기 작업 수",queued:"작업 큐 생성",workType:"작업 종류",dueAt:"실행 예정",connectionVerified:"서비스 경로 확인",inputFieldCount:"입력 묶음 수",status:"처리 상태",recommendationBlocked:"추천 차단"};
function outputText(value:unknown){if(typeof value==="boolean")return value?"예":"아니오";if(Array.isArray(value))return `${value.length}건`;if(value&&typeof value==="object")return `${Object.keys(value as Record<string,unknown>).length}개 항목`;return String(value??"없음");}

function ServiceFlowNode({ onNavigate }:{ onNavigate:(stage:number)=>void }) {
  return <div className={`${styles.archNode} ${styles.archFulfillment}`}>
    <strong>정밀진단 → 영양제 소분·배송 → 대화·재검사·배합 조정</strong>
    <span>결과가 다시 소비자와 자기적응형 AI로 환류</span>
    <nav aria-label="실제 웰니스박스 서비스 연결">
      <Link href="/assess">정밀진단</Link>
      <Link href="/explore">추천·구매</Link>
      <Link href="/my-orders">주문·배송</Link>
      <Link href="/chat">대화 상담</Link>
      <button type="button" onClick={()=>onNavigate(5)}>후속평가·배합 조정</button>
    </nav>
  </div>;
}

export default function ResearchWorkflowMap(props: WorkflowMapProps) {
  const [selectedNode,setSelectedNode]=useState<WorkflowNodeDetail|null>(null);
  const [nodeExecution,setNodeExecution]=useState<Record<string,unknown>|null>(null);
  const [nodeBusy,setNodeBusy]=useState(false);
  const safety=props.safetyDecision||"평가 전";
  const agent=props.agentState==="NEW"?"실행 전":props.agentState;
  const inference=props.recommendationCount>0?`${props.recommendationCount}개 계산`:"평가 전";
  const lakeConnected=props.dataLake?.connected===true;
  const lakeStatus=lakeConnected?`영속 저장 확인 · ${props.dataLake?.storedEventCount??0}건`:"영속 저장 미확인";
  useEffect(()=>{
    if(!selectedNode)return;
    setNodeExecution(null);
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setSelectedNode(null);};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[selectedNode]);
  const openStage=(stage:number)=>{setSelectedNode(null);props.onNavigate(stage);};
  const executeNode=async()=>{if(!selectedNode||nodeBusy)return;const nodeId=Object.entries(details).find(([,detail])=>detail===selectedNode)?.[0];if(!nodeId)return;setNodeBusy(true);setNodeExecution(null);try{setNodeExecution(await props.onExecuteNode(nodeId));}finally{setNodeBusy(false);}};
  const details:Record<string,WorkflowNodeDetail>={
    cron:{title:"CronJob",role:"정해진 주기에 평가 세션을 다시 호출합니다.",status:"주기 호출 경로 정의",receives:["평가 주기","활성 계획 식별자"],sends:["재평가 요청","후속평가 기한 신호"],implementation:"자기적응형 AI가 현재 상태를 다시 판단하도록 호출하는 운영 경로입니다.",evaluation:"후속평가 기한 도래 시 다음 작업 선택과 상태 전이를 재현합니다.",kpis:["KPI-3"],stage:5},
    consumer:{title:"소비자",role:"진단, 주문, 복용, 대화와 후속평가의 시작점입니다.",status:"서비스 입력 경로 연결",receives:["추천 결과","배송 상태","후속평가 요청"],sends:["건강 조건","대화·복용 피드백","재검사 결과"],implementation:"정밀진단·추천·주문·대화 상담 화면이 실제 서비스 경로로 연결되어 있습니다.",evaluation:"복용 전후 PRO 변화와 상담·후속 기록 경로를 확인합니다.",kpis:["KPI-2","KPI-4"],stage:2},
    agent:{title:"자기적응형 AI",role:"상태에 따라 다음 작업과 호출 도구를 결정합니다.",status:agent,receives:["사용자 요청","프로필·근거","PRO·웨어러블·이상사례"],sends:["안전검사 요청","추천·최적화 요청","후속 작업"],implementation:"다음 작업 결정, 허용 상태전이, 중복 방지와 사후조건 검증을 실행합니다.",evaluation:"시나리오별 다음 작업, 상태 전이와 실행 사후조건을 평가합니다.",kpis:["KPI-3"],stage:5},
    wellness:{title:"웰니스박스",role:"추천을 구매·소분·배송 서비스로 연결합니다.",status:"서비스 경로 연결",receives:["추천 조합","소비자 주문"],sends:["약사 검토 요청","주문·배송 상태"],implementation:"추천·구매, 주문 조회, 대화 상담과 정밀진단 경로를 제공합니다.",evaluation:"상담 응답과 추천 이후 이상사례 기록 경로를 확인합니다.",kpis:["KPI-4","KPI-6"],stage:6},
    lake:{title:"Data Lake",role:"프로필과 평가 작업의 입력·출력·상태 전이를 PostgreSQL에 순서대로 저장합니다.",status:lakeStatus,receives:["정규화 프로필·동의 범위",`평가 작업 ${props.dataLake?.storedEventCount??0}건`,`PRO ${props.dataLake?.proRecordCount??0}건 · 웨어러블 ${props.dataLake?.deviceRecordCount??0}건`],sends:[`근거 조회 이력 ${props.dataLake?.evidenceQueryCount??0}건`,"작업별 이전·다음 상태","실행 결과·사후조건"],implementation:lakeConnected?`현재 세션의 프로필과 ${props.dataLake?.storedEventCount??0}개 작업 기록이 DB에 저장되었습니다. 마지막 저장 작업은 ${props.dataLake?.lastAction??"없음"}입니다.`:"현재 브라우저 세션에서 DB 저장 성공 응답을 아직 받지 않았습니다. ‘다음’을 눌러 평가 세션을 생성하면 저장 결과를 확인합니다.",evaluation:"DB에 저장된 입력, 실행 결과, 상태 전이와 사후조건 건수를 현재 세션 기준으로 확인합니다.",kpis:["KPI-1","KPI-3"],stage:1},
    pharmacy:{title:"약사",role:"추천과 사용자 데이터를 검토하고 조정합니다.",status:"검토 경로 연결",receives:["추천 조합","안전 판정","주문 정보"],sends:["검토·보정 결과","소분·배송 지시","에스컬레이션 처리"],implementation:"고위험·중대한 이상사례가 발생하면 추천을 중단하고 약사 검토 상태로 전환합니다.",evaluation:"안전 판정 근거와 중대한 이상사례의 추천 중단 전이를 평가합니다.",kpis:["KPI-5","KPI-6"],stage:5},
    optimizer:{title:"다목적 조합 최적화 엔진",role:"효능·안전·복용량·예산 제약을 함께 적용합니다.",status:`${props.recommendationCount}개 선택`,receives:["후보별 효과 점수","안전 제약","예산·복용 선호"],sends:["최종 추천 조합","최적화 선택 근거"],implementation:"모델 후보를 안전 규칙으로 제한한 뒤 허용된 조합을 산출합니다.",evaluation:"입력 조건을 바꿔 최종 추천 조합과 제외 결과를 재계산합니다.",kpis:["KPI-1","KPI-3"],stage:3},
    safety:{title:"개인화 안전 검증 엔진",role:"금기, 상호작용, 알레르기와 응급 신호를 판정합니다.",status:safety,receives:["사용자 질환·약물·알레르기","Data Lake 안전 규칙","ITE 제약 강화"],sends:["허용·제외 성분","추천 중단·약사 검토"],implementation:"결정적 안전 규칙을 적용하고 고위험 상태에서는 추가 추천을 차단합니다.",evaluation:"질환·약물·알레르기·위험 신호별 안전 label과 근거를 재현합니다.",kpis:["KPI-5","KPI-6"],stage:3},
    ite:{title:"개인화 효과 추론 모델(ITE)",role:"개인 조건별 성분 효과 점수를 계산합니다.",status:inference,receives:["93개 입력 특성","최적화 탐색 후보","후속평가 결과"],sends:["성분별 효과 점수","안전 제약 강화 신호"],implementation:"학습 모델의 성분별 점수와 특성 기여도를 재현 가능한 방식으로 계산합니다.",evaluation:"성분별 추론 점수와 입력 특성 기여도가 추천 결과에 반영되는지 확인합니다.",kpis:["KPI-1","KPI-2"],stage:4},
    sensor:{title:"바이오센서·유전 데이터",role:"웨어러블 측정값과 정밀진단 결과를 후속 판단에 제공합니다.",status:props.deviceConnected?"연동 확인":"연동 시험 전",receives:["기기 측정값","검사·유전 결과","사용자 동의 범위"],sends:["소비자 상태 표시","AI 재평가 입력","Data Lake 기록"],implementation:"동의 범위를 확인한 뒤 기기 입력을 활성 계획과 다음 행동 평가에 반영합니다.",evaluation:"동의 범위와 측정값이 세션 기록 및 다음 행동 판단에 연결되는지 확인합니다.",kpis:["KPI-7"],stage:5},
  };
  const executionOutput=nodeExecution?.output&&typeof nodeExecution.output==="object"?nodeExecution.output as Record<string,unknown>:{};
  const postconditions=Array.isArray(nodeExecution?.postconditions)?nodeExecution.postconditions as Array<{label?:string;met?:boolean}>:[];
  return <section className={`${styles.section} ${styles.workflowHub}`} aria-labelledby="workflow-map-title">
    <p className={styles.sectionLabel}>전체 서비스 아키텍처</p>
    <h2 id="workflow-map-title" className={styles.sectionTitle}>데이터·판단·주문·후속평가가 순환하는 폐쇄루프 구조</h2>
    <p className={styles.sectionBody}>기술 블록을 선택하면 입력 데이터, 처리 결과, 현재 실행 상태와 연결된 평가 항목을 확인할 수 있습니다.</p>

    <div className={styles.archScroll}>
      <div className={styles.archCanvas}>
        <svg className={styles.archLinks} viewBox="0 0 1040 760" aria-label="기술 블록 연결 관계">
          <defs><marker id="arch-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
          <g className={styles.archSolid}>
            <path d="M158 75 H208 V180 H238"/>
            <path className={styles.archBidirectional} d="M100 300 V275 H214 V215 H238"/>
            <path d="M388 195 H431" className={styles.archBidirectional}/>
            <path d="M320 150 V135 H752 V175"/>
            <path d="M350 150 V20 H928 V40"/>
            <path d="M581 205 H669"/>
            <path className={styles.archBidirectional} d="M510 250 V350"/>
            <path d="M572 395 H800 V350 H845"/>
            <path d="M176 365 H238"/><path d="M388 395 H440"/><path d="M506 440 V570"/>
            <path d="M100 580 V390"/><path d="M176 640 H264"/><path d="M176 610 H190 V245 H238"/>
            <path d="M264 705 H205 V430 H100 V390"/>
          </g>
          <g className={styles.archDashed}>
            <path className={styles.archBidirectional} d="M1012 85 H1028 V350 H1012"/>
            <path d="M900 300 V284 H752 V270"/>
          </g>
          <g className={styles.archLabels}>
            <text x="164" y="66">주기적 재평가</text><text x="180" y="315">대화·피드백</text>
            <text x="393" y="186">RAG 저장·조회</text><text x="535" y="126">안전 조건부 호출</text><text x="615" y="14">판단 후 최적화 호출</text>
            <text x="602" y="196">규칙 조회</text><text x="520" y="305">검토·보정</text><text x="660" y="386">효과 추론 결과 보정</text>
            <text x="190" y="341">주문</text><text x="399" y="386">중개</text><text x="516" y="520">소분·배송</text>
            <text x="56" y="490">측정값</text><text x="182" y="570">정밀진단 입력</text><text x="108" y="724">복용·재검사 결과 환류</text>
            <text x="968" y="218">최적해 탐색</text><text x="790" y="279">제약 강화</text>
          </g>
        </svg>

        <Node className={styles.archCron} title="CronJob" subtitle="주기적 API 호출" status={details.cron.status} detail={details.cron} onOpen={setSelectedNode}/>
        <Node className={styles.archConsumer} title="소비자" subtitle="대화·주문·복용·피드백" status={details.consumer.status} detail={details.consumer} onOpen={setSelectedNode}/>
        <Node className={styles.archAgent} title="자기적응형 AI" subtitle="상태 판단과 폐쇄루프 제어" status={agent} detail={details.agent} onOpen={setSelectedNode}/>
        <Node className={styles.archWellness} title="웰니스박스" subtitle="추천·주문·소분 서비스" status={details.wellness.status} detail={details.wellness} onOpen={setSelectedNode}/>
        <Node className={styles.archLake} title="Data Lake" subtitle="프로필·작업·상태전이 영속 저장" status={lakeStatus} detail={details.lake} onOpen={setSelectedNode}/>
        <Node className={styles.archPharmacy} title="약사" subtitle="데이터 검토·보정·중개" status={details.pharmacy.status} detail={details.pharmacy} onOpen={setSelectedNode}/>
        <Node className={styles.archOptimizer} title="다목적 조합 최적화 엔진" subtitle="효능·안전·복용·예산 균형" status={`${props.recommendationCount}개 선택`} detail={details.optimizer} onOpen={setSelectedNode}/>
        <Node className={styles.archSafety} title="개인화 안전 검증 엔진" subtitle="금기·상호작용·알레르기" status={safety} detail={details.safety} onOpen={setSelectedNode}/>
        <Node className={styles.archIte} title="개인화 효과 추론 모델(ITE)" subtitle="개인별 성분 효과 추론" status={inference} detail={details.ite} onOpen={setSelectedNode}/>
        <Node className={styles.archSensor} title="바이오센서·유전 데이터" subtitle="웨어러블·검사·유전 입력" status={details.sensor.status} detail={details.sensor} onOpen={setSelectedNode}/>
        <ServiceFlowNode onNavigate={props.onNavigate}/>
      </div>
    </div>
    <div className={styles.archLegend}><span><i/>운영 데이터·업무 흐름</span><span><i/>반복 탐색·제약 강화</span><small>상태 표시는 구현 여부가 아니라 현재 평가 세션의 실행 결과입니다.</small></div>

    <div className={styles.workflowRuntime}><div><span>에이전트</span><strong>{agent}</strong></div><div><span>안전 판정</span><strong>{safety}</strong></div><div><span>추천 결과</span><strong>{props.recommendationCount}개</strong></div><div><span>저장 허용</span><strong>{props.consentCount}/4</strong></div></div>
    {selectedNode&&<div className={styles.helpOverlay} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setSelectedNode(null);}}><section className={`${styles.stageHelpModal} ${styles.workflowNodeModal}`} role="dialog" aria-modal="true" aria-labelledby="workflow-node-title"><header><div><span>기술 블록 실행</span><h2 id="workflow-node-title">{selectedNode.title}</h2></div><button type="button" aria-label="모달 닫기" onClick={()=>setSelectedNode(null)}>×</button></header><p className={styles.helpPurpose}>{selectedNode.role}</p><div className={styles.workflowNodeStatus}><span>현재 실행 상태</span><strong>{selectedNode.status}</strong></div><div className={styles.workflowDataGrid}><section><h3>받는 데이터</h3><ul>{selectedNode.receives.map(item=><li key={item}>{item}</li>)}</ul></section><section><h3>보내는 데이터</h3><ul>{selectedNode.sends.map(item=><li key={item}>{item}</li>)}</ul></section></div><div className={styles.workflowNodeEvidence}><div className={styles.workflowImplementation}><span>현재 구현</span><p>{selectedNode.implementation}</p></div><div className={styles.workflowEvaluationLink}><div><span>연결된 성과지표</span><p>{selectedNode.kpis.map(kpi=><b key={kpi}>{kpi}</b>)}</p></div><strong>{selectedNode.evaluation}</strong></div></div>{nodeExecution&&<div className={styles.workflowNodeExecution} aria-live="polite"><div><span>실행 결과</span><strong>{String(nodeExecution.status??"확인 필요")}</strong></div><dl>{Object.entries(executionOutput).slice(0,8).map(([key,value])=><div key={key}><dt>{OUTPUT_LABELS[key]??key}</dt><dd>{outputText(value)}</dd></div>)}</dl><ul>{postconditions.map((item,index)=><li key={`${item.label}-${index}`}>{item.met?"충족":"미충족"} · {item.label}</li>)}</ul></div>}<footer><button type="button" onClick={()=>setSelectedNode(null)}>회로로 돌아가기</button><button type="button" className={styles.primaryButton} onClick={executeNode} disabled={nodeBusy}>{nodeBusy?"실행 중":"노드 실행"}</button>{selectedNode.stage!==undefined&&<button type="button" onClick={()=>openStage(selectedNode.stage!)}>{selectedNode.kpis.join(" · ")} 평가 열기</button>}</footer></section></div>}
  </section>;
}
