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
            <path d="M170 75 C240 75 245 175 285 195"/><path d="M210 330 C255 330 250 245 285 235"/><path d="M285 260 C250 275 250 300 210 310"/>
            <path d="M455 190 C570 95 650 85 735 85"/><path d="M455 215 C565 215 650 215 735 215"/>
            <path d="M455 230 C490 230 500 215 520 215"/><path d="M520 240 C495 250 480 250 455 250"/>
            <path d="M670 215 L735 215"/><path d="M825 175 L825 130"/><path d="M920 105 C985 145 985 250 920 285"/><path d="M920 310 C965 285 965 230 920 230"/>
            <path d="M810 260 C760 290 700 320 665 335"/><path d="M595 290 L595 315"/><path d="M665 350 C730 350 770 330 825 315"/>
            <path d="M210 340 L285 365"/><path d="M455 365 L520 365"/><path d="M595 410 L595 475"/><path d="M520 520 C360 565 240 540 165 385"/>
            <path d="M165 500 L165 385"/><path d="M210 505 C250 470 260 295 300 260"/>
          </g>
          <g className={styles.archDashed}>
            <path d="M825 130 L825 175"/><path d="M665 335 C720 300 760 300 825 300"/>
          </g>
          <g className={styles.archLabels}>
            <text x="205" y="105">주기적 재평가</text><text x="225" y="300">대화·피드백</text><text x="525" y="112">판단 후 호출</text>
            <text x="480" y="202">RAG 저장·조회</text><text x="675" y="202">규칙 조회</text><text x="845" y="155">제약 강화</text>
            <text x="935" y="205">최적해 탐색</text><text x="705" y="325">검토·보정</text><text x="220" y="355">주문</text>
            <text x="470" y="355">중개</text><text x="610" y="455">소분·배송</text><text x="65" y="440">측정값</text><text x="225" y="455">정밀진단</text>
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
