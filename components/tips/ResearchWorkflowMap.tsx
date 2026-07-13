"use client";

import styles from "./interim.module.css";

type WorkflowMapProps = {
  activeStage: number;
  agentState: string;
  safetyDecision: string;
  recommendationCount: number;
  consentCount: number;
  deviceConnected: boolean;
  onNavigate: (stage: number) => void;
};

const nodes = [
  { id:"data", number:"01", title:"데이터 레이크", role:"학습·검증 데이터 정제 및 분할", detail:"150,000건 · 입력 특성 93개 · 독립 시험 5,000건", stage:1 },
  { id:"safety", number:"02", title:"개인화 안전 검증 엔진", role:"질환·약물·알레르기 기반 후보 제외", detail:"추천 전후 금기·상호작용 규칙 적용", stage:3 },
  { id:"ite", number:"03", title:"개인화 효과 추론 모델", role:"사람별 성분 효과 점수 산출", detail:"14개 성분별 적합도와 기여 특성 계산", stage:4 },
  { id:"optimizer", number:"04", title:"다목적 조합 최적화 엔진", role:"효능·안전·복용 편의·예산을 함께 비교", detail:"안전 통과 후보에서 최종 조합 선택", stage:4 },
  { id:"agent", number:"05", title:"자기적응형 AI", role:"추천 이후 추적 기록과 상태 전이 관리", detail:"근거·후속 일정·PRO·이상사례 폐쇄루프", stage:5 },
  { id:"sensor", number:"06", title:"바이오센서·유전 데이터 연동", role:"기기·검사 측정값을 후속 평가에 연결", detail:"웨어러블 및 검사 결과 입력 경로", stage:5 },
] as const;

export default function ResearchWorkflowMap(props: WorkflowMapProps) {
  const live: Record<string,string> = {
    data:"데이터 준비 완료",
    safety:props.safetyDecision || "실행 전",
    ite:props.recommendationCount ? `${props.recommendationCount}개 후보 계산` : "실행 전",
    optimizer:props.recommendationCount ? `${props.recommendationCount}개 최종 후보` : "실행 전",
    agent:props.agentState === "NEW" ? "실행 전" : props.agentState,
    sensor:props.deviceConnected ? "기기 기록 연결" : "실행 전",
  };

  return <section className={`${styles.section} ${styles.workflowHub}`} aria-labelledby="workflow-map-title">
    <p className={styles.sectionLabel}>전체 연구개발 워크플로우</p>
    <h2 id="workflow-map-title" className={styles.sectionTitle}>데이터가 추천과 후속 평가로 처리되는 전체 구조</h2>
    <p className={styles.sectionBody}>각 기술 블록을 누르면 해당 데이터와 실행 결과 화면으로 이동합니다. 우측 상태는 현재 시험 세션의 실제 처리 상태입니다.</p>
    <div className={styles.workflowFlow}>
      {nodes.map((node,index)=><div className={styles.workflowNodeWrap} key={node.id}>
        <button type="button" className={styles.workflowNode} data-active={props.activeStage===node.stage} onClick={()=>props.onNavigate(node.stage)}>
          <span className={styles.workflowNumber}>{node.number}</span>
          <span className={styles.workflowText}><strong>{node.title}</strong><small>{node.role}</small><em>{node.detail}</em></span>
          <span className={styles.workflowLive} data-ready={live[node.id]!=="실행 전"}><b>{live[node.id]}</b><small>화면으로 이동 →</small></span>
        </button>
        {index<nodes.length-1&&<i aria-hidden="true">↓</i>}
      </div>)}
    </div>
    <div className={styles.workflowRuntime}>
      <div><span>현재 에이전트 상태</span><strong>{props.agentState}</strong></div>
      <div><span>안전 판정</span><strong>{props.safetyDecision||"미실행"}</strong></div>
      <div><span>추천 결과</span><strong>{props.recommendationCount}개</strong></div>
      <div><span>저장 허용 범위</span><strong>{props.consentCount}/4</strong></div>
    </div>
  </section>;
}
