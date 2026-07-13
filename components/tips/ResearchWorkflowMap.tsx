"use client";

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

export default function ResearchWorkflowMap(props: WorkflowMapProps) {
  const safety=props.safetyDecision||"미실행";
  const agent=props.agentState==="NEW"?"실행 전":props.agentState;
  return <section className={`${styles.section} ${styles.workflowHub}`} aria-labelledby="workflow-map-title">
    <p className={styles.sectionLabel}>전체 서비스 아키텍처</p>
    <h2 id="workflow-map-title" className={styles.sectionTitle}>데이터·판단·주문·후속평가가 순환하는 폐쇄루프 구조</h2>
    <p className={styles.sectionBody}>번호 순서대로 한 번씩 실행되는 구조가 아닙니다. 자기적응형 AI가 상황에 따라 각 엔진과 데이터를 반복 호출합니다. 기술 블록을 누르면 해당 검증 화면으로 이동합니다.</p>

    <div className={styles.archScroll}>
      <div className={styles.archCanvas}>
        <svg className={styles.archLinks} viewBox="0 0 1040 640" aria-label="기술 블록 연결 관계">
          <defs><marker id="arch-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
          <g className={styles.archSolid}>
            <path d="M170 75 L225 75 L285 195"/>
            <path d="M210 320 C250 305 255 255 285 235"/><path d="M285 255 C255 280 250 340 210 350"/>
            <path d="M455 180 C545 95 650 85 735 85"/>
            <path d="M455 205 L480 140 L700 140 L735 190"/>
            <path className={styles.archBidirectional} d="M455 225 L520 225"/>
            <path d="M670 220 L735 220"/>
            <path d="M830 130 C850 175 875 235 900 285"/>
            <path d="M825 285 C790 285 775 270 810 270"/>
            <path className={styles.archBidirectional} d="M595 260 L595 315"/>
            <path d="M670 360 C735 360 770 335 825 335"/>
            <path d="M210 345 L285 365"/><path d="M455 365 L520 365"/><path d="M595 410 L595 475"/>
            <path d="M300 530 C205 560 130 505 125 385"/>
            <path d="M125 475 L125 385"/><path d="M210 510 C250 455 245 315 285 255"/>
          </g>
          <g className={styles.archDashed}>
            <path d="M900 285 C970 250 970 135 925 105"/><path d="M670 345 C735 315 775 315 825 315"/>
          </g>
          <g className={styles.archLabels}>
            <text x="185" y="66">주기적 재평가</text><text x="220" y="295">대화·피드백</text><text x="545" y="102">판단 후 호출</text>
            <text x="475" y="216">RAG 저장·조회</text><text x="675" y="210">규칙 조회</text><text x="840" y="205">제약 강화</text>
            <text x="942" y="200">최적해 탐색</text><text x="705" y="350">검토·보정</text><text x="230" y="356">주문</text>
            <text x="470" y="356">중개</text><text x="610" y="450">소분·배송</text><text x="65" y="435">측정값</text><text x="220" y="445">정밀진단</text>
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
        <Node className={styles.archIte} title="개인화 효과 추론 모델(ITE)" subtitle="개인별 성분 효과 추론" status={`${props.recommendationCount}개 계산`} stage={4} onNavigate={props.onNavigate}/>
        <Node className={styles.archSensor} title="바이오센서·유전 데이터" subtitle="웨어러블·검사·유전 입력" status={props.deviceConnected?"연결됨":"미연결"} stage={5} onNavigate={props.onNavigate}/>
        <Node className={styles.archFulfillment} title="정밀진단 → 영양제 소분·배송 → 대화·재검사·배합 조정" subtitle="결과가 다시 소비자와 자기적응형 AI로 환류" onNavigate={props.onNavigate}/>
      </div>
    </div>

    <div className={styles.workflowRuntime}><div><span>에이전트</span><strong>{agent}</strong></div><div><span>안전 판정</span><strong>{safety}</strong></div><div><span>추천 결과</span><strong>{props.recommendationCount}개</strong></div><div><span>저장 허용</span><strong>{props.consentCount}/4</strong></div></div>
  </section>;
}
