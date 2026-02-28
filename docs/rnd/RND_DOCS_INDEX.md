# R&D 문서/코드 인덱스

## 목적
- TIPS R&D 관련 문서가 분산되어 있어도, 새 세션에서 바로 이어서 작업할 수 있게 위치를 고정한다.
- 문서(요구사항/참고/운영)와 코드(모듈/스크립트/산출물)의 연결 관계를 한 번에 보여준다.

## 1) 문서 계층

### 필수 요구사항 계층 (`docs/rnd/`)
- `00_readme_how_to_use.md`: 문서 우선순위와 로딩 규칙
- `01_kpi_and_evaluation.md`: 슬라이드 25~26 평가 기준(최상위)
- `02~07_*.md`: 모듈별 요구사항
- `ai_training_pipeline.md`: 단일 명령 학습 실행/산출물 가이드
- `PROGRESS.md`: 누적 작업 이력
- `SESSION_HANDOFF.md`: 새 세션 이어받기 문서

### 선택 참고 계층 (`docs/rnd_impl/`)
- `02~07_*_impl_notes.md`: 구현 힌트 문서
- 충돌 시 `docs/rnd/*` 기준 우선

## 2) R&D 코드 위치

### 모듈 구현
- `lib/rnd/module02-data-lake/*`
- `lib/rnd/module03-personal-safety/*`
- `lib/rnd/module04-efficacy-quantification/*`
- `lib/rnd/module05-optimization/*`
- `lib/rnd/module06-closed-loop-ai/*`
- `lib/rnd/module07-biosensor-genetic-integration/*`

### 통합 학습/평가 파이프라인
- `lib/rnd/ai-training/pipeline.ts`
- `scripts/rnd/train-all-ai.ts`
- `scripts/rnd/train-all-ai.cjs`
- `package.json` 스크립트: `rnd:train:all`

### 모듈별 실행 스크립트
- `scripts/rnd/module02/*`
- `scripts/rnd/module03/*`
- `scripts/rnd/module04/*`
- `scripts/rnd/module05/*`
- `scripts/rnd/module06/*`
- `scripts/rnd/module07/*`

## 3) 산출물 위치

### 학습 데이터/모델 산출물
- 학습 데이터: `tmp/rnd/ai-training-data/<runId>/`
- 모델/리포트: `tmp/rnd/ai-model-artifacts/<runId>/`
- 최신 포인터: `tmp/rnd/latest-train-all-run.json`

### 핵심 리포트 파일
- `train-report.json`
- `attempt-selection-report.json`
- `tips-kpi-evaluation-summary.json`
- `tips-implementation-coverage.json`
- `tips-evaluation-submission-bundle.json`
- `tips-evaluation-submission-verify.json`

## 4) 슬라이드-구현 매핑 (핵심)

- 슬라이드 13~15: One-Stop 워크플로우
  - `workflow-samples.jsonl`
- 슬라이드 16: Data Lake
  - `data-lake-softmax.json`, `data-lake-samples.jsonl`
- 슬라이드 17: 개인화 안전 검증 엔진
  - `safety-softmax.json`, `safety-samples.jsonl`
- 슬라이드 18~19: Two-Tower+Reranker, ITE 수치화
  - `recommender-two-tower.json`, `recommender-reranker-gbdt.json`, `ite-linear-regression.json`
- 슬라이드 20: 제약 기반 최적화
  - `optimization-constraint-samples.jsonl`
- 슬라이드 21~22: Closed-loop 노드/CRAG/스케줄 자동화
  - `closed-loop-node-trace-samples.jsonl`, `crag-grounding-samples.jsonl`, `closed-loop-schedule-samples.jsonl`
- 슬라이드 23: ITE 온라인 보정
  - `ite-feedback-samples.jsonl`, `ite-finetune-summary.json`
- 슬라이드 24: 바이오센서/유전자 연동
  - `integration-samples.jsonl`, `genetic-adjustment-samples.jsonl`
- 슬라이드 25~26: KPI 평가 기준/데이터 조건
  - `tips-kpi-evaluation-summary.json`의 KPI 및 `dataRequirements`

## 5) 빠른 점검 명령

```bash
npm run audit:encoding
npm run rnd:train:all
npm run lint
npm run build
```

## 6) 배포 안전성 관련 파일
- `.gitignore`: `tmp/rnd/`, `tmp/pdfs/` 제외
- `.vercelignore`: `tmp/rnd/`, `tmp/pdfs/` 업로드 제외

## 7) 누락 점검 방법
- 문서 누락 점검:
  - `Get-ChildItem -Path docs -Recurse -File`
- R&D 코드 누락 점검:
  - `Get-ChildItem -Path lib/rnd -Recurse -File`
  - `Get-ChildItem -Path scripts/rnd -Recurse -File`
