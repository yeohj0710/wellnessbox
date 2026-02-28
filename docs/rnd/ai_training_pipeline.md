# R&D AI 통합 학습 파이프라인

## 연계 문서

- 세션 인수인계: `docs/rnd/SESSION_HANDOFF.md`
- R&D 문서/코드 인덱스: `docs/rnd/RND_DOCS_INDEX.md`
- KPI 기준 원문: `docs/rnd/01_kpi_and_evaluation.md`

## 1회 명령어

```bash
npm run rnd:train:all
```

- 기본값은 `--profile auto`이며, KPI 게이트를 통과할 때까지 시드/스케일을 자동 탐색합니다.
- `--profile auto`는 기본적으로 `standard` 다중 시도 후, 통과하더라도 `max` 프로필을 추가 탐색(기본 2회)해 더 높은 objective 런이 있으면 자동 선택합니다.
- `--profile auto`의 기본 objective 하한(`--auto-min-weighted-objective-score`)은 `125.9`로 설정되어 있습니다.
- 기본 동작에서 KPI 목표/데이터 조건을 충족하지 못하면 명령이 실패(exit 1)합니다.

## 주요 옵션

```bash
node scripts/rnd/train-all-ai.cjs --profile auto
node scripts/rnd/train-all-ai.cjs --profile standard --max-attempts 4 --seed-step 97
node scripts/rnd/train-all-ai.cjs --profile auto --data-scale 1.5 --auto-max-data-scale 4
node scripts/rnd/train-all-ai.cjs --profile auto --auto-min-weighted-objective-score 128
node scripts/rnd/train-all-ai.cjs --profile auto --auto-post-pass-max-attempts 3
node scripts/rnd/train-all-ai.cjs --profile auto --require-stability-buffer true --require-objective-target true
```

## 학습되는 모델

- 추천 모델: `Two-Tower + GBDT Reranker`
- 안전성 분류 모델: `allow/limit/block`
- Data Lake 레퍼런스 분류 모델
- ITE(효과 추정) 회귀 모델
- Closed-loop 다음 액션 분류 모델
- 상담 모듈(LLM 응답 키) 분류 모델
- 바이오센서/유전자 연동 성공 분류 모델

## Closed-loop 보정 단계

- 액션 모델 1차 학습 후, `closed-loop-feedback-samples.jsonl` 기반 온라인 보정(fine-tuning)을 추가 수행합니다.
- 보정 전/후 지표는 `closed-loop-action-finetune-summary.json`에 기록됩니다.

## PRO 표준화(z-score) 데이터

- 효과 KPI(#2)는 PRO 원점수 기반 샘플을 먼저 생성한 뒤 z-score로 정규화하여 산출합니다.
- 원점수/정규화 기록은 `pro-assessment-samples.jsonl`에 저장됩니다.

## ITE 온라인 보정 샘플

- 슬라이드 23의 실측 데이터(바이오센서/혈당) 기반 재학습 구조를 반영해 ITE 모델 보정 샘플을 생성합니다.
- 산출 파일:
  - `ite-feedback-samples.jsonl`
  - `ite-finetune-summary.json`
- 핵심 지표:
  - `iteRmseBeforeFineTune`
  - `iteFeedbackRmse`
  - `iteFineTuneGain`
- 성능 악화 시 자동 롤백(`rollbackApplied`)으로 비악화(non-regression) 보정만 반영합니다.

## 최적화 제약 샘플

- 슬라이드 20의 다목적 최적화 구조와 정합되도록 예산/리스크/개수 제약 충족 여부를 샘플로 저장합니다.
- 산출 파일: `optimization-constraint-samples.jsonl`

## One-Stop 워크플로우 샘플

- 슬라이드 13~15의 `건강데이터 연동·분석 -> 소분·배송 -> 추적·관리` 흐름을 단계 플래그로 저장합니다.
- 산출 파일: `workflow-samples.jsonl`
- 핵심 지표: `workflowCompletionRatePercent` (전체 단계 완료 비율)

## Closed-loop 노드/CRAG 샘플

- 슬라이드 21~22의 노드 기반 오케스트레이션 흐름(상담 -> 엔진 호출 -> 검사/실행 -> 알림/추적)을 트레이스로 저장합니다.
- 슬라이드 21의 CRAG 구조(Data Lake 검색 + Web fallback)의 grounding 품질 샘플을 저장합니다.
- 슬라이드 22의 주기적 API 호출/알림/재주문 자동화 루프를 스케줄 트레이스로 저장합니다.
- 산출 파일:
  - `closed-loop-schedule-samples.jsonl`
  - `closed-loop-node-trace-samples.jsonl`
  - `crag-grounding-samples.jsonl`
- 핵심 지표:
  - `closedLoopScheduleExecutionPercent`
  - `closedLoopNodeFlowSuccessPercent`
  - `cragGroundingAccuracyPercent`

## 평가 기준

- `docs/rnd/01_kpi_and_evaluation.md`의 25~26 슬라이드 기준 공식을 그대로 사용합니다.
- 구현 커버리지 게이트는 슬라이드 13~26의 핵심 모듈(One-Stop, Data Lake, 안전 검증, ITE, 최적화, Closed-loop, 바이오센서·유전자 연동)을 파일/샘플/정확도 기준으로 자동 검증합니다.
- 슬라이드 24의 유전자 검사 연동 구조를 반영해 `genetic-adjustment-samples.jsonl`(유전자 파라미터 벡터 -> 안전 제약/최적화 가중치 조정 trace)을 생성하고, 커버리지 게이트에서 `샘플 수`, `조정 trace 비율`, `룰 카탈로그 커버리지`를 함께 검증합니다.
- 바이오센서·유전자 연동 게이트는 슬라이드 26의 데이터 조건을 반영해 `전체 샘플 >= 100`, `W/C/G 소스 커버리지`, `소스별 최소 샘플(>=10)`까지 함께 검증합니다.
- 약물이상반응(KPI #6) 게이트는 슬라이드 26의 `직전 12개월` 조건을 반영해 윈도우 커버리지 일수를 산출하고(기본 300일 이상) 판정 근거로 함께 저장합니다.
- KPI 요약/제출 번들(`tips-kpi-evaluation-summary.json`, `tips-evaluation-submission-bundle.json`)에는 슬라이드 26 최소 데이터 조건 충족 여부를 `dataRequirements` 매트릭스로 함께 기록합니다.
- 산출 KPI:
  - 추천 정확도(%)
  - 효과 개선도(pp)
  - Closed-loop 액션 정확도(%)
  - 상담 모듈 정확도(%)
  - 안전/레퍼런스 정확도(%)
  - 약물이상반응 건수(건/year)
  - 바이오센서·유전자 연동율(%)

## 산출물 경로

- 학습 데이터: `tmp/rnd/ai-training-data/<runId>/`
- 모델/리포트: `tmp/rnd/ai-model-artifacts/<runId>/`

대표 파일:

- `train-report.json`
- `attempt-selection-report.json`
- `tips-kpi-evaluation-summary.json`
- `tips-implementation-coverage.json`
- `tips-evaluation-submission-bundle.json`
- `tips-evaluation-submission-verify.json`
- `recommender-two-tower.json`
- `recommender-reranker-gbdt.json`
- `closed-loop-action-finetune-summary.json`
- `ite-finetune-summary.json`
- `pro-assessment-samples.jsonl`
- `optimization-constraint-samples.jsonl`
- `workflow-samples.jsonl`
- `reranker-samples.jsonl`
- `data-lake-samples.jsonl`
- `safety-samples.jsonl`
- `ite-samples.jsonl`
- `ite-feedback-samples.jsonl`
- `closed-loop-feedback-samples.jsonl`
- `closed-loop-schedule-samples.jsonl`
- `closed-loop-node-trace-samples.jsonl`
- `crag-grounding-samples.jsonl`
- `integration-samples.jsonl`
- `genetic-adjustment-samples.jsonl`
- `tmp/rnd/latest-train-all-run.json`

## 배포 안전성

- 대용량 학습 산출물은 `.gitignore`의 `tmp/` 규칙(하위 `tmp/rnd/**`, `tmp/pdfs/**` 포함)으로 추적에서 제외됩니다.
- Vercel 업로드 경로는 `.vercelignore`의 `tmp/` 규칙(하위 `tmp/rnd/`, `tmp/pdfs/` 포함)으로 차단되어 배포 번들 용량 리스크를 줄입니다.
