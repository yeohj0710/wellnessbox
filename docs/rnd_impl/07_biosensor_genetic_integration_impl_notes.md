# 이 문서의 성격

- 본 문서는 `docs/rnd/07_biosensor_genetic_integration.md`(요구사항)를 구현할 때 참고하는 “선택 가이드”다.
- 구현 방식(연동 파트너/표준, 데이터 수집 방법, 저장소, 전처리, 모델 반영 방식)은 강제하지 않는다.
- 충돌 시 우선순위: AGENTS.md Guardrails > docs/rnd/_ > docs/rnd_impl/_

# 구현 관점의 최소 성공 조건

- (1) 웨어러블/CGM 및 유전자 검사 결과를 “원본(Raw) 보존 + 표준(Canonical) 매핑” 방식으로 수집·적재할 수 있다.
- (2) 연동 성공률/데이터 품질/정합성 등 평가 가능한 지표(01 문서)의 산출이 가능하도록 로그/메타를 남긴다.
- (3) 안전(03)/최적화(05)/Closed-loop(06)가 “스키마 변경에 덜 민감하게” 센서·유전 데이터를 활용할 수 있다(어댑터 경계 유지).

# 데이터가 불확실할 때(파트너·포맷 미확정) 설계 원칙(중요)

- Raw(원본)과 Canonical(표준)을 분리한다.
- 연동 소스별 커넥터/어댑터를 분리해, 특정 업체/포맷 의존을 코어로 전파하지 않는다.
- “유전 데이터/센서 데이터는 계속 바뀔 수 있다”고 가정하고,
  내부 모듈은 Canonical 계약만 보고 개발한다.
- 개인정보/민감정보가 매우 강하므로, 저장/전송/접근/감사/삭제 정책을 초기에 구조로 박아둔다(나중에 붙이면 비용 폭증).

# 권장 데이터 레이어(개념)

- Raw Layer
  - 파트너에서 받은 원본 payload(가능하면 그대로)
  - 수집 시점, 장치/키트 메타, 단위/타임존, 서명/무결성(가능하면)
- Canonical Layer
  - 서비스가 사용하는 표준 스키마로 변환된 관측치/파라미터
  - 단위 통일, 시간 정규화, 기본 품질검사(QC) 결과 포함
- Serving/Feature Layer(선택)
  - 모델/추천/대시보드에 바로 쓰는 집계치(일/주/월 통계, 윈도우 특징량 등)
  - 재학습/평가를 위해 버전 관리되는 feature set

# 바이오센서(웨어러블/CGM) 연동: 구현 힌트(강제 아님)

## 1) 커넥터 형태(선택)

- Pull(주기적 조회): 외부 API에서 주기적으로 가져옴
- Push(Webhook): 외부에서 이벤트/데이터를 밀어줌
- App-mediated(모바일): 사용자 디바이스가 중계(권한/동의 관리를 쉽게 할 수 있음)
- 어떤 방식이든 “연동 성공/실패”와 “수집 범위/누락”을 로그로 남겨 KPI 산출 가능하게 한다.

## 2) 시간/단위 정규화(실무 핵심)

- 웨어러블/CGM은 타임존, 샘플링 빈도, 단위가 제각각인 경우가 많다.
- 권장:
  - timestamp는 표준(UTC) + 원본 타임존을 함께 보관
  - unit은 Canonical에서 통일(원본 단위도 함께 저장)
  - sampling_rate / device_model / firmware_version 같은 메타를 보관(이상치 분석에 중요)

## 3) 품질검사(QC) 최소 규칙(예시)

- 결측 구간 길이/비율
- 비현실적 값 범위(예: 심박, 혈당의 물리적 한계)
- 센서 교체/보정 이벤트 감지(가능하면)
- QC 결과는 “feature 생성/모델 반영” 전에 필터로 쓰되, 원본은 삭제하지 않는다(Raw 보존).

## 4) Canonical 관측치(예시, 강제 아님)

- WearableObservation
  - user_id (또는 가명키)
  - metric_id (steps, sleep_duration, resting_hr 등)
  - value, unit
  - measured_at (UTC), timezone_original
  - source (device/vendor)
  - qc_flags (missing/outlier 등)
  - version
- CGMObservation
  - user_id
  - glucose_value, unit
  - measured_at
  - derived_metrics (TIR 등은 별도 파생 레이어로 분리 가능)
  - qc_flags
  - version

# 유전자 검사 연동: 구현 힌트(강제 아님)

## 1) 포맷 다양성 대응

- 기관마다 결과 포맷이 다를 수 있다:
  - SNP 리스트(예: rsid, genotype)
  - 해석 결과(예: “카페인 민감도 높음”)
  - 벡터 형태의 점수/확률(x = [..])
- 권장:
  - Raw: 기관 원본 결과를 그대로 보관(계약/감사/재해석 대비)
  - Canonical: 서비스가 쓰는 “해석 가능한 최소 단위”로 변환
    - variant_id(rsid) + genotype + interpretation_code
    - trait_id(대사/흡수/위험경향) + score/level

## 2) Canonical 유전 파라미터(예시, 강제 아님)

- GeneticVariant
  - user_id
  - variant_id (rsid 등)
  - genotype (AA/AG 등)
  - confidence (가능하면)
  - source (lab/vendor)
  - version
- GeneticTrait
  - user_id
  - trait_id (folate_metabolism, lactose_intolerance, caffeine_sensitivity 등)
  - level/score (정규화된 값)
  - explanation (요약 텍스트는 선택, 근거/출처 링크 가능)
  - version

## 3) “알고리즘 조정” 연결점(요구사항에 맞춘 최소 계약)

- 안전(03)과 연결:
  - 특정 trait/variant가 특정 성분의 상한/주의/금기에 영향을 준다면,
    “제약 조정 파라미터”로 변환되어 안전 엔진 입력에 합류할 수 있어야 한다.
- 최적화(05)와 연결:
  - 특정 trait/variant가 추천 우선순위/가중치에 영향을 준다면,
    “가중치 조정 파라미터”로 변환되어 최적화 입력에 합류할 수 있어야 한다.
- 이때 핵심은:
  - 유전 원본 포맷이 바뀌어도, “trait_id/score 같은 Canonical”만 유지되면 코어 로직은 유지된다.

# Data Lake(02)와의 통합(반드시 해야 하는 것)

- 센서/유전 데이터도 “단일 저장소 집약” 원칙을 따른다.
- Raw/Canonical/Feature 레이어와 버전 관리(canonical_version/source_version/transform_version)를 적용한다.
- 후속 모듈(04/05/06)이 조회 가능한 형태(표준 키 + 기간 조회 + 로그 추적)를 제공한다.

# 평가/KPI 산출을 위한 로그(01 문서 대응)

(구체 정의/목표치는 01 문서를 따름. 여기서는 “기록해야 평가가 가능해진다”에 집중.)

## 1) 연동 성공률/연동률(예시 항목)

- integration_attempt_log
  - attempt_id, user_id(가명 가능), source_type(wearable/cgm/genetic)
  - attempted_at, result(success/fail), error_code
  - scope_requested(기간/지표), scope_received(기간/지표)
  - vendor/app_version
- 위 로그가 있으면 “성공률/실패율/원인 분포”를 산출할 수 있다.

## 2) 데이터 품질/정합성(예시 항목)

- qc_report
  - user_id, source_type, metric_id
  - period_start/end
  - missing_rate, outlier_rate, unit_mismatch_count
  - qc_rules_version
- QC는 절대 원본을 지우기 위한 근거가 아니라, “사용 가능/불가/주의”를 구분하기 위한 메타다.

## 3) 모델/추천 성능 기여 추적(선택)

- feature_usage_log
  - trace_id, module(04/05/06)
  - features_used(sensor/genetic 여부)
  - model_version/policy_version
- 나중에 “연동이 실제로 성능 향상에 기여했는지” 분석할 때 유용하다.

# 개인정보/민감정보/보안(강한 권장 사항)

- 유전 데이터는 특히 민감도가 높아, 최소 원칙을 강하게 권장한다.
  - 접근 권한 분리(역할 기반) + 감사 로그
  - 암호화(전송/저장) 및 키 관리(가능하면)
  - 최소 수집/최소 보관(원본 보관이 필요하면 범위를 명확히)
  - 삭제/철회(동의 철회) 시나리오를 고려한 식별/삭제 경로 설계
- 분석/평가용 데이터는 가명화/집계 중심으로 분리하는 것이 안전하다.

# “나중에 스키마가 바뀌면 쉽게 바꾸는” 체크포인트

- 커넥터/어댑터가 소스별로 분리되어 있는가?
- Canonical 스키마로 변환하는 transform_version이 존재하는가?
- 내부 모듈(03/04/05/06)은 Canonical만 의존하는가?
- Raw가 남아 재처리(리플레이)가 가능한가?
- KPI 산출을 위한 attempt/qc/log가 남는가?

# 완료 체크리스트(구현팀용)

- 웨어러블/CGM/유전 데이터 각각에 대해:
  - Raw 적재 OK
  - Canonical 변환 OK(버전/단위/시간 정규화 포함)
  - QC 리포트 OK(결측/이상치/정합성)
  - KPI 산출 가능한 로그 OK(연동 시도/성공/실패/범위)
- 안전/최적화/Closed-loop에서 “연동 데이터 유무에 관계없이” 동작한다(없을 때도 graceful).
- 동의 철회/삭제/접근 감사 경로가 설계되어 있다.
