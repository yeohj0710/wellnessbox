# 이 문서의 성격

- 본 문서는 `docs/rnd/03_personal_safety_validation_engine.md`(요구사항)를 구현할 때 참고할 수 있는 “선택 가이드”다.
- 구현 방식(룰엔진 형태, DB 스키마, 인덱싱 방식, LLM 사용 여부 등)은 강제하지 않는다.
- 충돌 시 우선순위: AGENTS.md Guardrails > docs/rnd/_ > docs/rnd_impl/_

# 구현 관점의 최소 성공 조건

- 사용자 입력(개인 특성/복용약/질환/알레르기/습관 등)과 대상 성분/제품을 넣으면,
  1. 안전성 위반 여부를 판정하고
  2. 개인화 안전 범위 데이터(금기/주의/상한/복용 규칙)를 산출하며
  3. 각 결과에 근거 레퍼런스를 연결하고
  4. KPI 평가(레퍼런스 정확도/재현성)에 필요한 “근거 연결 로그”를 남길 수 있어야 한다.

# 데이터 불확실성(외부 DB/문헌 포맷 미확정) 대응 원칙

- 룰(규칙) 정의부와 룰(규칙) 실행부를 분리한다.
  - 룰 정의부: 외부 데이터 → 내부 규칙 표현으로 변환(어댑터/매퍼)
  - 룰 실행부: 내부 규칙 표현만 입력으로 사용(외부 원본 포맷에 직접 의존 금지)
- 근거(Evidence)는 반드시 “식별 가능한 최소 단위”로 연결한다(doi/pmid/db_key + chunk_id 등).

# 안전 규칙(룰) 분류(권장)

- 약물-성분 상호작용(Drug–Ingredient)
- 질환/상태-성분 금기 또는 주의(Condition–Ingredient)
- 알레르기/민감성-성분 주의(Allergy–Ingredient)
- 용량 상한(UL/Upper Limit) 및 중복 복용(duplicate ingredient)
- 복용 시간/주기/연속 복용 기간 관련 규칙(복용 규칙)
- 임신/수유/소아/고령 등 특수군 규칙(특수군 제약)

# 규칙 표현(내부 DSL/스키마) 설계 힌트

- 규칙은 “트리거(조건) + 액션(판정/권고) + 메타(근거/심각도/버전)”로 단순화하면 확장에 유리하다.
- 최소 권장 필드(예시, 강제 아님)
  - rule_id
  - rule_type (drug_ingredient, condition_ingredient, ul, duplicate, schedule, special_population 등)
  - severity (block / warn / info)
  - trigger
    - subject: (user.medication | user.condition | user.allergy | user.population | ingredient | product)
    - operator: (equals, in, contains, gte, lte, overlaps 등)
    - object: (표준 코드/표준 성분키/정규화 문자열)
    - optional: dose_range, frequency_range, duration_range
  - action
    - decision: (deny | allow_with_warning | allow)
    - message_template: 사용자 안내 문구(다국어 가능)
    - recommended_constraints: 허용 범위(상한/하한), 복용 규칙(시간/주기) 등
  - evidence_refs: [evidence_id, citation, chunk_id] 목록
  - version / effective_from / deprecated_at

# 정규화(매칭 품질의 대부분)

- 사용자 입력과 제품/성분/약물/질환을 동일 키 공간으로 맞추는 “정규화 레이어”가 중요하다.
- 권장:
  - 약물명/성분명/질환명에 대해 별칭(synonym) 사전 + 표준 키(코드)를 운영
  - 입력이 텍스트로 들어올 때는 가능한 한 “표준 키로 매핑한 결과”와 “원본 문자열”을 모두 보관(재현성/감사)
- 외부 DB 포맷이 달라도 정규화 레이어만 바꾸면 룰 실행부는 유지되도록 설계한다.

# 개인화 안전 범위 데이터 산출(출력 구조 힌트)

- 산출물은 “후속 모듈(최적화/추천)이 제약으로 사용”할 수 있어야 하므로, 다음처럼 구조화하면 편하다(강제 아님).
  - allowed_ingredients: 성분별 허용 범위(용량/빈도/기간)
  - forbidden_ingredients: 금지 성분 목록(+ 사유/근거)
  - forbidden_rules: 금지 복용 규칙(예: 특정 시간대/공복 등, 해당 시)
  - warnings: 주의 항목(허용은 되지만 경고 필요)
  - evidence_map: 각 항목이 참조한 근거 목록
  - generated_at / version

# 레퍼런스(근거) 연결 및 정확도 KPI를 위한 로그 설계

- `docs/rnd/01_kpi_and_evaluation.md`의 “레퍼런스 정확도(95%)” 평가를 위해,
  “각 판정 결과가 어떤 근거를 썼는지”가 기계적으로 비교 가능해야 한다.
- 최소 로그 필드(권장)
  - trace_id: 평가 케이스/요청을 식별(테스트 케이스 ID로도 사용 가능)
  - user_profile_ref: 사용자 입력 버전 또는 해시(개인정보 원문 노출 최소화)
  - inputs_normalized: 표준 키(약물/질환/성분)의 목록
  - applied_rule_ids: 적용된 rule_id 리스트
  - decisions: (ingredient_id/product_id 단위) deny/warn/allow 결과
  - evidence_refs: [citation, evidence_id, chunk_id] 리스트
  - timestamp, engine_version, rule_set_version, transform_version
- 주의:
  - “citation(doi/pmid/db_record_key)” 같은 외부 식별키가 없으면 평가 매칭이 어려워진다.
  - 원문 전체를 로그에 저장할 필요는 없고, 식별 가능한 참조키 + 최소 요약이면 충분할 수 있다.

# 규칙 세트 버전 관리(평가 재현성 핵심)

- rule_set_version: 특정 시점의 규칙 집합을 재현 가능하게 묶는 버전/스냅샷 ID를 둔다.
- transform_version: 외부 원본 → 내부 규칙 변환 로직 버전을 둔다.
- 평가 리포트/로그에 (rule_set_version, transform_version)을 함께 남기면 재현이 쉬워진다.

# Adverse Event(약물이상반응) 집계 KPI 대응 힌트

- KPI는 “약물이상반응 집계 보고 건수(5건/year 이하)”이다.
- 구현을 강제하지 않지만, 아래 최소 요소가 있으면 집계/감사가 쉬워진다.
  - 사용자 자가보고(신고) 이벤트 타입 정의
  - 이벤트에 연결되는: 복용 조합, 시점, 증상 분류(가능하면), 심각도(가능하면), 관련 성분/제품
  - 후속 조치(상담 유도/중단 권고/추가 정보 요청) 기록
- 단, “의학적 진단/치료”가 아니라 “보고/집계/안전 가이드” 범주로 다루고, 근거 연결을 유지한다.

# 성능/확장성(운영 관점 힌트)

- 룰 매칭은 (1) 정규화된 키 인덱스 기반 후보 축소 → (2) 세부 조건 평가 순으로 가면 확장에 유리하다.
- 사용자 입력이 많은 경우에도, 룰 타입별로 분리 실행하면(약물-성분, 질환-성분 등) 디버깅/평가가 쉬워진다.

# 개인정보/민감정보(구현 시 주의)

- 사용자 건강 정보/복용약/상담 로그는 민감정보가 될 수 있다.
- 최소 권장:
  - 권한 분리(역할/세션 기반)
  - 감사 로그(누가/언제/무엇을)
  - 로그에는 원문 최소화(표준 키/해시/요약 중심)
  - 보관기간/삭제 정책은 필요 시 별도 정책 문서로 분리 가능

# 완료 체크리스트(구현팀용)

- 사용자 입력 → 정규화 → 룰 매칭 → 개인화 안전 범위 산출 흐름이 동작한다.
- 결과마다 근거(evidence)가 연결되고, trace_id 기반 로그가 남는다.
- rule_set_version/transform_version을 통해 동일 조건 재현이 가능하다.
- 평가 케이스(최소 100 rule/시나리오 표본)에 대해 레퍼런스 정확도 평가가 가능하다.
