"use client";

import Link from "next/link";
import styles from "./interim.module.css";

type WorkflowMapProps = {
  activeStage: number; agentState: string; safetyDecision: string;
  recommendationCount: number; consentCount: number; deviceConnected: boolean;
  onNavigate: (stage: number) => void;
};

type NodeProps = { className:string; title:string; subtitle:string; status?:string; stage?:number; onNavigate:(stage:number)=>void };
function Node({ className,title,subtitle,status,stage,onNavigate }:NodeProps) {
  const content=<><strong>{title}</strong><span>{subtitle}</span>{status&&<em>{status}</em>}</>;
  return stage===undefined?<div className={`${styles.archNode} ${className}`}>{content}</div>:<button type="button" className={`${styles.archNode} ${className}`} onClick={()=>onNavigate(stage)}>{content}<small>관련 화면 열기 →</small></button>;
}

function ServiceFlowNode({ onNavigate }:{ onNavigate:(stage:number)=>void }) {
  return <div className={`${styles.archNode} ${styles.archFulfillment}`}>
    <strong>정밀진단 → 영양제 소분·배송 → 대화·재검사·배합 조정</strong>
    <span>결과가 다시 소비자와 자기적응형 AI로 환류</span>
    <nav aria-label="실제 웰니스박스 서비스 연결">
      <Link href="/survey">정밀진단</Link>
      <Link href="/explore">추천·구매</Link>
      <Link href="/my-orders">주문·배송</Link>
      <Link href="/chat">대화 상담</Link>
      <button type="button" onClick={()=>onNavigate(5)}>후속평가·배합 조정</button>
    </nav>
  </div>;
}

export default function ResearchWorkflowMap(props: WorkflowMapProps) {
  const safety=props.safetyDecision||"평가 전";
  const agent=props.agentState==="NEW"?"실행 전":props.agentState;
  const inference=props.recommendationCount>0?`${props.recommendationCount}개 계산`:"평가 전";
  return <section className={`${styles.section} ${styles.workflowHub}`} aria-labelledby="workflow-map-title">
    <p className={styles.sectionLabel}>전체 서비스 아키텍처</p>
    <h2 id="workflow-map-title" className={styles.sectionTitle}>데이터·판단·주문·후속평가가 순환하는 폐쇄루프 구조</h2>
    <p className={styles.sectionBody}>번호 순서대로 한 번씩 실행되는 구조가 아닙니다. 자기적응형 AI가 상황에 따라 각 엔진과 데이터를 반복 호출합니다. 기술 블록을 누르면 해당 검증 화면으로 이동합니다.</p>

    <div className={styles.archScroll}>
      <div className={styles.archCanvas}>
        <svg className={styles.archLinks} viewBox="0 0 1040 760" aria-label="기술 블록 연결 관계">
          <defs><marker id="arch-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
          <g className={styles.archSolid} transform="scale(.88 1)">
            <path d="M180 75 H220 V185 H270"/>
            <path d="M200 310 H225 V210 H270"/><path d="M270 235 H240 V345 H200"/>
            <path d="M440 185 H490" className={styles.archBidirectional}/>
            <path d="M440 170 V120 H760 V175"/>
            <path d="M440 155 V80 H960"/>
            <path d="M660 205 H760"/>
            <path className={styles.archBidirectional} d="M575 250 V350"/>
            <path d="M650 395 H875 V350 H960"/>
            <path d="M200 350 H270"/><path d="M440 395 H500"/><path d="M575 440 V580"/>
            <path d="M115 580 V390"/><path d="M200 625 H300"/><path d="M200 600 H225 V250 H270"/>
            <path d="M300 685 H230 V735 H115 V390"/>
          </g>
          <g className={styles.archDashed} transform="scale(.88 1)">
            <path className={styles.archBidirectional} d="M1050 130 H1135 V300 H1150"/>
            <path d="M960 325 H915 V235 H950"/>
          </g>
          <g className={styles.archLabels} transform="scale(.88 1)">
            <text x="188" y="66">주기적 재평가</text><text x="205" y="296">대화·피드백</text>
            <text x="455" y="176">RAG 저장·조회</text><text x="570" y="111">안전 조건부 호출</text><text x="610" y="70">판단 후 최적화 호출</text>
            <text x="680" y="196">규칙 조회</text><text x="585" y="304">검토·보정</text><text x="735" y="385">효과 추론 결과 보정</text>
            <text x="220" y="341">주문</text><text x="458" y="386">중개</text><text x="585" y="520">소분·배송</text>
            <text x="55" y="490">측정값</text><text x="212" y="570">정밀진단 입력</text><text x="155" y="725">복용·재검사 결과 환류</text>
            <text x="1070" y="218">최적해 탐색</text><text x="905" y="275">제약 강화</text>
          </g>
        </svg>

        <Node className={styles.archCron} title="CronJob" subtitle="주기적 API 호출" onNavigate={props.onNavigate}/>
        <Node className={styles.archConsumer} title="소비자" subtitle="대화·주문·복용·피드백" onNavigate={props.onNavigate}/>
        <Node className={styles.archAgent} title="자기적응형 AI" subtitle="상태 판단과 폐쇄루프 제어" status={agent} stage={5} onNavigate={props.onNavigate}/>
        <Node className={styles.archWellness} title="웰니스박스" subtitle="추천·주문·소분 서비스" stage={3} onNavigate={props.onNavigate}/>
        <Node className={styles.archLake} title="Data Lake" subtitle="프로필·근거·규칙·후속기록" status="데이터 준비 완료" stage={1} onNavigate={props.onNavigate}/>
        <Node className={styles.archPharmacy} title="약사" subtitle="데이터 검토·보정·중개" stage={5} onNavigate={props.onNavigate}/>
        <Node className={styles.archOptimizer} title="다목적 조합 최적화 엔진" subtitle="효능·안전·복용·예산 균형" status={`${props.recommendationCount}개 선택`} stage={4} onNavigate={props.onNavigate}/>
        <Node className={styles.archSafety} title="개인화 안전 검증 엔진" subtitle="금기·상호작용·알레르기" status={safety} stage={3} onNavigate={props.onNavigate}/>
        <Node className={styles.archIte} title="개인화 효과 추론 모델(ITE)" subtitle="개인별 성분 효과 추론" status={inference} stage={4} onNavigate={props.onNavigate}/>
        <Node className={styles.archSensor} title="바이오센서·유전 데이터" subtitle="웨어러블·검사·유전 입력" status={props.deviceConnected?"연동 확인":"연동 시험 전"} stage={5} onNavigate={props.onNavigate}/>
        <ServiceFlowNode onNavigate={props.onNavigate}/>
      </div>
    </div>
    <div className={styles.archLegend}><span><i/>운영 데이터·업무 흐름</span><span><i/>반복 탐색·제약 강화</span><small>상태 표시는 구현 여부가 아니라 현재 평가 세션의 실행 결과입니다.</small></div>

    <div className={styles.workflowRuntime}><div><span>에이전트</span><strong>{agent}</strong></div><div><span>안전 판정</span><strong>{safety}</strong></div><div><span>추천 결과</span><strong>{props.recommendationCount}개</strong></div><div><span>저장 허용</span><strong>{props.consentCount}/4</strong></div></div>
  </section>;
}
