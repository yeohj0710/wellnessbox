# 이 문서의 성격

- 본 문서는 `docs/rnd/06_closed_loop_ai.md`(요구사항)를 구현할 때 참고하는 “선택 가이드”다.
- 구현 방식(상태머신/룰+ML/오케스트레이션 방식, LLM 사용 전략, 워크플로 엔진 등)은 강제하지 않는다.
- 충돌 시 우선순위: AGENTS.md Guardrails > docs/rnd/_ > docs/rnd_impl/_

# 구현 관점의 최소 성공 조건

- 사용자 상태/이벤트/모듈 결과가 주어지면,
  1. 다음 수행 작업을 선택하고(Decision)
  2. 실제로 수행하거나 수행 요청을 생성하며(Execution)
  3. 성공 여부까지 기록하고
  4. KPI 평가(01 문서)의 정확도 계산이 가능하도록 테스트 케이스 기반 로그를 남길 수 있어야 한다.

# 데이터 불확실성 대응 원칙(중요)

- “다음 행동 후보(Action types)”는 늘어난다고 가정하고, 행동을 플러그인처럼 추가 가능하게 둔다.
- 외부 연동(알림, 상담, 재추천, 데이터 요청 등)은 “커넥터/어댑터”로 격리한다.
- 내부 코어는 “상태 + 이벤트 + 규칙/정책 + 모듈 결과”만으로 결정하도록 설계한다.

# 권장 구성요소(개념, 강제 아님)

- State Store: 사용자별 현재 상태(최근 효과, 복용 상태, 안전 상태, 목표 등)
- Event Stream: 사용자 행동/상호작용(노출, 클릭, 구매, 상담, 알림 반응 등)
- Policy/Decision: 다음 행동을 정하는 규칙/정책(룰 기반/혼합 가능)
- Executor: 행동을 실행(알림 발송, 재추천 트리거, 상담 생성 등)
- Logger: trace_id 기반으로 입력/결정/실행/결과를 남김(평가 재현성)

# 다음 수행 작업(Action) 카탈로그(예시)

- keep_plan: 현재 조합 유지
- adjust_plan: 용량/구성 조정
- change_plan: 다른 조합으로 변경(05 호출)
- stop_plan: 복용 중단 권고(안전 사유 포함 가능)
- request_more_info: 추가 정보 요청(측정/설문/복약 정보 등)
- trigger_counseling: 상담 유도/생성(약사/전문가/LLM)
- schedule_followup: 추적 측정/후속 설문/리마인드 알림
- safety_alert: 안전 경고 알림(03 근거 연결)
- monitor_only: 현재는 모니터링만

※ 어떤 항목을 쓰든, “정답 작업과 비교 가능한 라벨”로 남아야 01 KPI 평가가 가능하다.

# Decision 설계 힌트(강제 아님)

- 1단계: Safety Gate (안전 우선)
  - 안전 위반이면 stop_plan / safety_alert / trigger_counseling 우선
- 2단계: Effect Gate (효과 기반)
  - 효과가 개선되면 keep_plan, 미개선/악화면 adjust_plan/change_plan 또는 request_more_info
- 3단계: Engagement Gate (행동 기반)
  - 복용 순응도 낮으면 request_more_info / schedule_followup
  - 이탈 징후면 trigger_counseling / reminder
- 위 흐름은 “정책을 설명하기 위한 예시”이며, 요구사항은 KPI 평가 가능한 Decision/Execution/Logging이다.

# 상담(LLM) 모듈 연동 힌트

- LLM 답변 정확도 KPI(91%)는 “테스트 문항 기반”으로 평가된다.
- 구현 힌트:
  - 테스트 문항 세트(Q)와 기대 답/판정기준(g)을 별도 리소스로 관리
  - 대화 컨텍스트는 최소화하되, 근거/레퍼런스가 필요한 경우 Data Lake(02)에서 근거를 조회해 “근거 연결 로그”를 남김
- 중요한 점:
  - 답변 생성 방식은 자유지만, “평가 가능한 형태(문항→답변 저장)”를 반드시 남겨야 한다.

# Execution(수행) 설계 힌트

- 수행은 실패할 수 있다(알림 실패, 외부 API 실패, 사용자 응답 없음 등).
- KPI 정의에 “성공 플래그(e_s)”가 있으므로,
  - action 선택(a_s)뿐 아니라,
  - 수행 성공 여부(e_s)를 반드시 기록해야 한다.
- 권장:
  - idempotency_key(중복 실행 방지)
  - retry_policy(필요 시)
  - error_code/summary(실패 분석)

# 평가 케이스(테스트셋) 구성 힌트

- 01 문서에서 최소 100 case를 요구하므로, 아래처럼 케이스를 만들면 운영/확장이 쉽다.
  - case_id
  - input_state_snapshot(가명/요약)
  - input_events_snapshot(가명/요약)
  - expected_action_label(a\*)
  - expected_success_condition(가능하면)
  - notes(판정 근거)
- 실제 데이터가 없어도, “케이스 생성 규칙”과 “샘플 데이터 생성기”로 평가를 시작할 수 있다(나중에 실제 데이터로 교체).

# 로깅/버전(재현성 핵심)

- KPI 평가가 가능하려면 trace_id 기반으로 아래가 남아야 한다.
  - trace_id / case_id
  - inputs_used (state refs, event refs, module outputs refs)
  - chosen_action (a_s)
  - execution_result (e_s, success/failure)
  - policy_version (결정 정책 버전)
  - model_versions (05/04/03 등 호출된 모듈 버전)
  - timestamp
- 랜덤이 있다면 seed도 기록한다.

# 개인정보/민감정보

- 상담 로그/건강 정보는 민감정보가 될 수 있다.
- 권장:
  - 로그에는 원문 최소화(표준 키/요약/해시)
  - 평가 케이스에는 가명 처리된 스냅샷 사용
  - 접근 통제/감사 로그 유지

# 완료 체크리스트(구현팀용)

- Decision: 다음 행동 라벨을 산출한다.
- Execution: 행동을 수행하고 성공/실패를 기록한다.
- KPI 평가: case_id 기반으로 a_s와 a\* 비교 및 e_s 포함 정확도 계산이 가능하다.
- 상담 평가: 문항→답변 저장이 가능하고 91% 정확도 평가 루틴을 돌릴 수 있다.
- 버전/정책/모듈 버전이 결과에 함께 남아 재현 가능하다.
