# 이 문서의 성격

- 본 문서는 `docs/rnd/02_data_lake.md`(요구사항)를 구현할 때 참고할 수 있는 “선택 가이드”다.
- 구현 방식(스택/DB/인덱싱/ETL 도구/LLM 사용 여부 등)은 강제하지 않는다.
- 충돌 시 우선순위: AGENTS.md Guardrails > docs/rnd/_ > docs/rnd_impl/_

# 목표 재정의(구현 관점의 최소 성공 조건)

- (1) 외부/내부 데이터를 “추후 스키마 변경에 견디도록” 적재할 수 있다.
- (2) 안전/근거 KPI(레퍼런스 정확도) 평가를 위해 “근거 단위 식별 + 연결 로그”를 남길 수 있다.
- (3) Closed-loop/추천/상담이 조회할 때 “일관된 조회 계약”으로 접근할 수 있다.

# 데이터가 아직 불확실할 때의 설계 원칙(중요)

- Raw(원본 보존)과 Canonical(서비스 표준)를 분리한다.
- 외부 소스 스키마가 바뀌는 건 정상으로 가정하고, 바뀌는 곳은 “어댑터/매퍼”로 격리한다.
- 내부 모듈은 Canonical 계약만 믿고 개발한다(외부 원본 포맷 직접 의존 금지).
- “근거(Evidence)”는 반드시 최소 단위(문단/표/레코드 등)로 식별 가능해야 한다(평가 재현성 때문).

# 권장 데이터 레이어(개념)

- Raw: 외부/내부 원본을 최대한 그대로 보관(재처리/감사 용도)
- Canonical: 서비스가 쓰는 공통 표준 모델(도메인 키/코드 체계 포함)
- Serving/Index: 조회/검색/추천/상담에 최적화된 형태(예: 검색 인덱스/벡터 인덱스/요약 캐시 등)

# 최소 Canonical 모델(예시, 강제 아님)

- 아래는 “평가와 제품 개발이 가능해지는 최소 필드” 예시다. 실제 소스에 맞춰 확장/수정 가능.

## User(개인 특성)

- user_id (내부 키)
- demographics (성별/연령대 등)
- conditions (질환/상태)
- medications (복용약; 가능한 경우 표준 성분키/코드)
- allergies
- lifestyle (수면/활동/식이 등 요약)
- created_at / updated_at
- version (canonical 버전)

## Product / Ingredient(영양제 도메인)

- product_id, name, brand, form
- ingredient_id, standard_name
- product_ingredient_map (제품→성분, 함량/단위/1회/1일 정보)
- price (가능한 경우)
- version

## Evidence(근거 단위; 레퍼런스 정확도 KPI 핵심)

- evidence_id (내부 키)
- source_type (pubmed/db/regulatory/internal 등)
- citation (doi/pmid/url/db_record_key 중 1개 이상)
- chunk_id (분할 단위 식별자: 문단/표/레코드 등)
- text_or_payload (원문/요약/메타; 라이선스 준수)
- tags (성분/질환/상호작용/안전성 등)
- license_ref
- version

## Rule(규칙; 안전/상호작용/상한/주의 등)

- rule_id
- rule_type (drug-ingredient / condition-ingredient / UL / duplicate 등)
- trigger (대상 성분/약물/질환/조건)
- effect (severity/statement template/권고)
- evidence_refs (근거 연결)
- version

## Event / Log(서비스 이벤트)

- event_id
- user_id
- event_type (노출/클릭/구매/재구매/복용/중단/상담/피드백/알림반응 등)
- payload (유연 JSON)
- occurred_at
- version

## ComputationResult(연산 결과)

- result_id
- user_id
- module (safety/effect/optimization/closed_loop/chat 등)
- input_ref (plan_hash 등)
- output_ref (결과 위치/요약)
- evidence_links (사용 근거 목록)
- created_at
- version

# 근거 분할/태깅/인덱싱(구현 힌트)

- 분할(Chunking): 문헌/DB 레코드를 “평가 가능한 최소 단위”로 쪼갠다(문단/표/항목).
- 태깅(Tagging): 성분/질환/약물/상호작용/주의/금기 등 도메인 태그를 부여(자동/반자동/수동 가능).
- 인덱싱(Indexing): 키워드 검색과(정확 매칭) 의미 기반 검색(유사도)을 모두 고려할 수 있다.
- 주의: 어떤 방식이든 “evidence_id + chunk_id + citation”의 연결이 유지되어야 한다(재현성/감사).

# 평가 재현을 위한 “근거 연결 로그” 가이드

- 안전 엔진/상담/추천이 어떤 근거를 썼는지 아래 최소 정보를 남기면, 01 문서의 레퍼런스 정확도 평가가 쉬워진다.
  - trace_id (요청/세션/평가 케이스 식별)
  - module (어떤 모듈이 사용했는지)
  - inputs_used (표준화된 입력 키 목록)
  - evidence_refs (evidence_id / citation / chunk_id)
  - rule_refs (해당 시 rule_id)
  - timestamp
- “정답 레퍼런스와 매칭 가능한 키”가 반드시 포함되어야 한다(doi/pmid/db_key 등).

# 스키마 버전/변경 대응(운영 힌트)

- canonical_version: Canonical 모델 버전(예: v1, v2…)
- source_version: 외부 소스 버전(업데이트 날짜/릴리즈)
- transform_version: 변환/정제 로직 버전
- 평가 결과 리포트에는 최소 (canonical_version, source_version, transform_version)을 함께 기록하는 것을 권장한다.

# 개인정보/민감정보(구현 시 흔한 함정)

- Raw에는 민감정보가 섞일 수 있다(특히 상담 로그/검사 수치/유전 데이터).
- 최소 권장:
  - 접근 권한 분리(역할/세션 기반)
  - 감사 로그(누가/언제/무엇을)
  - 데이터 보관기간/삭제 정책(필요 시)
- “평가 재현성” 때문에 로그가 필요하더라도, 원문 전체 저장이 불필요하면 최소화/가명화한다.

# 이 레이어에서 모듈들이 기대하는 것(조회 계약 힌트)

- 안전(03): 사용자 상태 + 제품/성분 + Rule/Evidence를 조회할 수 있어야 함
- 효과(04): 전/후 측정치 + 개입(복용/추천) + 기간 정의를 조회할 수 있어야 함
- 최적화(05): 후보 아이템 + 사용자 목표 + 안전 제약 + (가능 시) 효과 신호를 조회할 수 있어야 함
- Closed-loop(06): 이벤트/로그 + 모듈 결과 + 최신 상태를 조회할 수 있어야 함
- 연동(07): 센서/유전 원본을 Raw로 받고 Canonical로 매핑할 수 있어야 함

# 완료 체크리스트(구현팀용)

- Raw 적재가 가능하고 재처리(리플레이)가 가능하다.
- Canonical로 변환하는 어댑터 경계가 명확하다(외부 스키마 변경의 영향 최소화).
- Evidence는 chunk 단위로 식별 가능하고, citation 키를 보존한다.
- “근거 연결 로그(trace_id 기준)”가 남는다.
- KPI 평가를 위해 필요한 데이터(표본/쿼리/스크립트)가 재현 가능하게 정리된다.
