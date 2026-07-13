# TIPS Conversational Agent Evaluator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연구계획서의 자기적응형 AI가 사용자 상태를 읽고 다음 작업을 선택·실행·검증하는 전 과정을 평가자가 직접 입력해 재현할 수 있게 한다.

**Architecture:** 서버의 결정 엔진은 현재 상태와 관측값으로 허용 작업을 계산하고 하나의 다음 작업과 목표 상태를 반환한다. 웹 평가기는 모든 관측값을 수정할 수 있으며, 선택 후보·선택 이유·호출 도구·사후조건·상태 전이를 한 화면에 표시한다. 기존 추천·PRO·독립시험과 연결하되 저장된 정답 일치율을 에이전트 성능처럼 표시하지 않는다.

**Tech Stack:** Next.js 15, React, TypeScript, deterministic server-side policy engine, existing signed TIPS lab state token.

---

### Task 1: 다음 작업 결정 엔진

**Files:**
- Create: `lib/tips/agent-decision-engine.ts`
- Modify: `lib/server/tips-lab/runtime.ts`
- Modify: `lib/server/tips-lab/state.ts`
- Test: `scripts/qa/check-tips-web-lab.cts`

- [ ] 관측값, 후보 작업, 결정 결과 타입과 우선순위 규칙을 테스트에 명시한다.
- [ ] 응급 신호, 안전검사, 후보 생성, 근거 조회, 계획 확정, 후속 일정, PRO, 기기 이상, 순응도 순서로 다음 작업을 결정한다.
- [ ] `decide_next_action` API 작업을 추가하고 선택 이유, 호출 도구, 기대 사후조건, 목표 상태를 반환한다.
- [ ] 상태별 허용 작업을 명시해 무조건 실행 가능한 기존 상태 검사를 강화한다.

### Task 2: 사람이 조작하는 대화형 에이전트 평가기

**Files:**
- Create: `components/tips/AgentDecisionWorkbench.tsx`
- Modify: `components/tips/InterimUserConsole.tsx`
- Modify: `components/tips/interim.module.css`
- Test: `scripts/qa/check-tips-web-lab.cts`

- [ ] 사용자 메시지와 현재 세션 상태를 입력할 수 있게 한다.
- [ ] 안전검사·추천후보·근거·활성계획·후속평가·PRO·순응도·이상사례·웨어러블 이상 값을 모두 직접 바꿀 수 있게 한다.
- [ ] 기본값으로 즉시 평가하고, 값 변경 후 다시 평가할 수 있게 한다.
- [ ] 후보 작업 전체, 선택된 다음 작업, 결정 이유, 실행 도구, 사후조건, 상태 전이를 연구자용 문구로 표시한다.
- [ ] 고정 `다음` 버튼이 해당 단계에서 기본 에이전트 결정을 실제 호출하고 다음 단계로 이동하게 한다.

### Task 3: 에이전트 평가 의미 교정

**Files:**
- Modify: `components/tips/ResearchOverview.tsx`
- Modify: `components/tips/ResearchEvidencePanel.tsx`
- Test: `scripts/qa/check-tips-web-lab.cts`

- [ ] 독립시험의 100%는 저장된 프록시 기준과의 재현 일치율임을 지표명에 명시한다.
- [ ] 에이전트 평가는 정답 일치율과 분리해 다음 작업 선택, 고위험 오동작, 사후조건 충족으로 표시한다.
- [ ] 사람이 입력한 단일 사례 결과와 전체 프록시 회귀평가 결과를 혼동하지 않게 구획한다.

### Task 4: 검증·배포

**Files:**
- Test: `scripts/qa/check-tips-web-lab.cts`
- Test: `scripts/qa/check-tips-interim-modules.cts`

- [ ] `npm run qa:tips:web-lab`에서 결정 우선순위와 UI 계약을 검증한다.
- [ ] `npm run qa:tips:interim`, `npx tsc --noEmit`, `npm run audit:encoding`, `git diff --check`를 통과시킨다.
- [ ] 관련 파일만 커밋·푸시한다.
- [ ] Vercel 프로덕션 배포가 Ready이고 `wellnessbox.kr/tips` 별칭이 연결됐는지 확인한다.
