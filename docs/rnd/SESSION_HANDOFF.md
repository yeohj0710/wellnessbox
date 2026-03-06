# R&D 세션 핸드오프 (Codex 이어받기용)

## 1) 문서 목적
- 새 세션에서 이전 작업 맥락을 빠르게 복원하고 즉시 이어서 구현/검증하기 위한 운영 문서.
- 기준 문서는 `docs/rnd/01_kpi_and_evaluation.md`이며, 본 문서는 현재 구현 상태와 실행 방법을 요약한다.

## 2) 현재 기준 시점
- 작성/검증 기준일: 2026-03-06
- 기준 명령:
  - `npm run rnd:train:all`
  - `npm run lint`
  - `npm run build`
  - `npm run audit:encoding`

## 3) 현재 구현 상태 요약

### 공통
- R&D 구현은 기존 주문/권한/관리자 인증 코어를 건드리지 않는 별도 경로(`lib/rnd`, `scripts/rnd`)로 구성됨.
- 통합 학습/평가/제출 번들을 단일 명령으로 재현 가능.

### 핵심 완료 항목
- 단일 명령 통합 학습: `npm run rnd:train:all`
- 슬라이드 25~26 KPI 수식 기반 평가 게이트 적용
- 데이터 최소 조건(샘플 수, 윈도우 커버리지, 소스 커버리지) 자동 판정
- 구현 커버리지(슬라이드 13~26) 자동 판정 리포트 생성
- 제출 번들 + 체크섬 검증 리포트 자동 생성
- 대용량 산출물 Git/Vercel 업로드 제외 설정 적용
- 슬라이드 24 보강:
  - `genetic-adjustment-samples.jsonl` 추가
  - 유전자 파라미터 -> 안전 제약/최적화 가중치 조정 trace
  - `geneticAdjustmentTraceCoveragePercent`, `geneticRuleCatalogCoveragePercent` 지표 추가

## 4) 최근 검증 결과 (요약)

### 최근 성공 실행
- runId: `rnd-ai-2026-03-06T07-57-02-131Z-standard-scale-1_2`
- 결과:
  - `allTargetsSatisfied: true`
  - `allDataRequirementsSatisfied: true`
  - `implementationCoverageSatisfied: true`
  - `slideEvidenceSatisfied: true`
  - `weightedPassScorePercent: 100`
  - `weightedObjectiveScore: 125.971`

### 주요 KPI 값
- 추천 정확도: `91.69%`
- 효과 개선도(SCGI): `15.9099pp`
- Closed-loop 액션 정확도: `93.22%`
- LLM 답변 정확도: `100%`
- 레퍼런스 정확도: `98.7%`
- 약물이상반응 건수: `4건/year`
- 약물이상반응 윈도우 커버리지: `365일`
- 연동율: `93.89%`

### 슬라이드 24 관련 지표
- `geneticAdjustmentSampleCount: 1800`
- `geneticAdjustmentTraceCoveragePercent: 100`
- `geneticRuleCatalogCoveragePercent: 100`

### 슬라이드 13~26 구현 커버리지 재검증
- PDF 렌더링 확인:
  - `tmp/pdf_render_13_24/tips-13.png` ~ `tips-24.png`
  - `tmp/pdf_render/tips-25.png`
  - `tmp/pdf_render/tips-26.png`
- 구현 커버리지 결과:
  - `one_stop_workflow`: pass
  - `data_lake_engine`: pass
  - `safety_validation_engine`: pass
  - `two_tower_reranker`: pass
  - `ite_quantification_model`: pass
  - `optimization_constraints`: pass
  - `closed_loop_node_orchestration`: pass
  - `crag_grounding_quality`: pass
  - `closed_loop_schedule_automation`: pass
  - `closed_loop_online_finetune`: pass
  - `biosensor_genetic_integration`: pass
  - `genetic_parameter_adjustment`: pass
  - `kpi_eval_gate`: pass

### 슬라이드 증빙 아티팩트
- `tips-slide-evidence-map.json` 생성
- 슬라이드 13~26 각각에 대해:
  - 연결된 구현 체크 ID
  - 연결된 데이터 조건 ID
  - 연결된 KPI ID
  - 관련 산출물 경로
  를 한 파일에서 확인 가능

### 최신 품질 검증
- `npm run lint`: 성공
- `npm run build`: 성공
- `npm run audit:encoding`: 성공

### 인코딩 가드 운영 메모
- `data/b2b/backups/`는 운영 백업 스냅샷 디렉터리로 간주해 `audit:encoding` 스캔에서 제외됨
- 이유:
  - 의약품 원문 데이터에 한자+한글 혼용 표현이 포함되어 인코딩 깨짐이 아닌 정상 데이터가 오탐될 수 있음
  - 소스/문서/설정 파일 인코딩 검사는 그대로 유지

## 5) 반드시 먼저 읽을 파일
1. `AGENTS.md`
2. `docs/rnd/01_kpi_and_evaluation.md`
3. `docs/rnd/RND_DOCS_INDEX.md`
4. 현재 작업 대상 모듈 문서 1개 (`docs/rnd/02~07`)
5. 필요 시 해당 구현 노트 1개 (`docs/rnd_impl/02~07`)

## 6) 주요 코드 위치

### 통합 파이프라인
- `lib/rnd/ai-training/pipeline.ts`
- `scripts/rnd/train-all-ai.ts`
- `scripts/rnd/train-all-ai.reporting.ts`
- `scripts/rnd/train-all-ai.cjs`

### KPI 평가 함수
- `lib/rnd/module02-data-lake/evaluation.ts` (KPI #5 일부)
- `lib/rnd/module03-personal-safety/evaluation.ts` (KPI #5 일부 + KPI #6)
- `lib/rnd/module04-efficacy-quantification/evaluation.ts` (KPI #2)
- `lib/rnd/module05-optimization/evaluation.ts` (KPI #1)
- `lib/rnd/module06-closed-loop-ai/evaluation.ts` (KPI #3/#4)
- `lib/rnd/module07-biosensor-genetic-integration/evaluation.ts` (KPI #7 + KPI #5 일부)

## 7) 실행 명령 (재현 절차)

```bash
npm run audit:encoding
npm run rnd:train:all
npm run lint
npm run build
```

## 8) 산출물 확인 체크리스트

### 데이터 산출물 (`tmp/rnd/ai-training-data/<runId>/`)
- 필수 샘플:
  - `kpi01-samples.jsonl`
  - `kpi02-samples.jsonl`
  - `kpi03-samples.jsonl`
  - `kpi04-samples.jsonl`
  - `kpi05-module02-samples.jsonl`
  - `kpi05-module03-samples.jsonl`
  - `kpi05-module07-samples.jsonl`
  - `kpi06-samples.jsonl`
  - `kpi07-samples.jsonl`
- 구현/커버리지 샘플:
  - `workflow-samples.jsonl`
  - `closed-loop-schedule-samples.jsonl`
  - `closed-loop-node-trace-samples.jsonl`
  - `crag-grounding-samples.jsonl`
  - `optimization-constraint-samples.jsonl`
  - `ite-feedback-samples.jsonl`
  - `genetic-adjustment-samples.jsonl`

### 모델/리포트 산출물 (`tmp/rnd/ai-model-artifacts/<runId>/`)
- `train-report.json`
- `attempt-selection-report.json`
- `tips-kpi-evaluation-summary.json`
- `tips-implementation-coverage.json`
- `tips-slide-evidence-map.json`
- `tips-evaluation-submission-bundle.json`
- `tips-evaluation-submission-verify.json`

## 9) 배포 관련 주의사항
- 대용량 R&D 산출물은 저장소/배포 번들에 포함되면 안 됨.
  - `.gitignore`: `tmp/` (하위 `tmp/rnd/`, `tmp/pdfs/` 포함)
  - `.vercelignore`: `tmp/` (하위 `tmp/rnd/`, `tmp/pdfs/` 포함)
- 배포 가능성 검증은 최소 `npm run build` 성공을 기준으로 판단.

## 9-1) 배포 검증 결과 (2026-02-28)
- `npm run build`: 성공
- Vercel CLI 로컬 검증:
  - 명령: `npx vercel build --yes`
  - 상태: 실패(인증 토큰 이슈)
  - 오류: `The specified token is not valid. Use vercel login to generate a new token.`
- 조치:
  - 코드/설정 측면 배포 리스크는 `tmp/` 전체 ignore로 완화
  - 실제 Vercel 빌드 검증을 위해 유효한 Vercel 토큰으로 재실행 필요

## 10) 새 세션에서 바로 할 일
1. `git status`로 작업 트리 상태 확인
2. `npm run audit:encoding` 실행
3. `docs/rnd/PROGRESS.md` 최신 항목 확인
4. `tmp/rnd/latest-train-all-run.json`가 가리키는 최신 run과 `tips-kpi-evaluation-summary.json` / `tips-implementation-coverage.json` / `tips-slide-evidence-map.json`를 먼저 확인
5. 필요 시 `npm run rnd:train:all` 재실행해 최신 리포트 생성
6. 필요 변경 적용 후 `lint/build` 재검증
7. 변경 내용을 `docs/rnd/PROGRESS.md`와 본 문서에 동기화
