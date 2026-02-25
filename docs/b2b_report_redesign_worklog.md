# B2B 임직원 건강레포트 재설계 작업 로그

## 작업 시작 체크리스트
- [x] 1) 웹 레포트 UI를 일반 읽기 페이지로 전환
- [x] 2) 직원 화면 인쇄/프린트 흐름 제거, PDF 다운로드 중심으로 정리
- [x] 3) 관리자 화면 PPTX/PDF 다운로드 + 레이아웃 검증 디버그 제공
- [x] 4) export 전용 A4 렌더/검증 파이프라인 유지
- [x] 5) overlap validator에서 background/allowOverlap 예외 반영
- [x] 6) metrics line spacing 안정화(재발 방지)
- [x] 7) 하이픈 연동 호출 최소화(초회 fetch + DB 재사용 + 강제 재연동 버튼)
- [x] 8) 하이픈 동시요청 dedupe 적용
- [x] 9) 복약 상태를 `available/none/fetch_failed/unknown`으로 구분
- [x] 10) 설문 템플릿 v1 재작성(공통 1~27 + Q27 + S01~S24)
- [x] 11) 설문 점수화(선택지 score 기반) 반영
- [x] 12) 템플릿 버전/질문 key 기반 응답 보존 구조 반영
- [x] 13) periodKey/reportCycle 기반 월별 누적 구조 반영
- [x] 14) 분석 엔진(`lib/b2b/analyzer.ts`) + AnalysisResult 저장 반영
- [x] 15) 약사 코멘트 가공 노출(요약/권장/주의/복용가이드)
- [x] 16) AI 종합평가 생성/재생성/캐시 반영
- [x] 17) 불필요 배치 ZIP Export UI 제거(운영 기본값 비활성)
- [x] 18) demo 데이터(2명, 3개월) + admin/demo 미리보기 경로 제공
- [x] 19) runbook/문서 업데이트
- [x] 20) 인코딩 감사 + lint 통과
- [ ] 21) build 통과 (현재 로컬 DB 환경 변수 이슈로 차단)

## 변경 로그 (PR/커밋 요약용)
### 무엇을 바꿨는지
- 임직원 화면(`/employee-report`)을 읽기 중심 페이지로 재구성하고 PDF 다운로드 단일 산출 흐름으로 정리.
- 관리자 화면(`/admin/b2b-reports`)에 period 선택, 분석 재계산, AI 재생성, 검증 디버그, PPTX/PDF 다운로드를 통합.
- export 파이프라인을 `generateLayout -> static/runtime validation -> audit -> render` 구조로 정리.
- validator에서 배경 노드/허용 overlap 노드(`allowOverlap`) 겹침은 오류 제외.
- 하이픈 데이터 연동은 fetch cache + dedupe를 우선 사용하고, 강제 재연동시에만 외부 재호출.
- 설문 템플릿 JSON v1을 운영 구조(공통 1~27 + Q27 기반 선택 섹션)로 재작성하고 점수 필드 반영.
- 분석 엔진(`lib/b2b/analyzer.ts`)을 추가해 설문/검진/복약/약사/AI/추이 데이터를 종합 계산.
- 분석 저장 서비스(`lib/b2b/analysis-service.ts`)로 periodKey 단위 누적 저장 및 재계산 구현.
- 리포트 payload(`lib/b2b/report-payload.ts`)에 점수/지표/리스크/추이/약사/AI 카드 반영.
- AI 종합평가(`lib/b2b/ai-evaluation.ts`)를 기존 OpenAI 연동 기반으로 캡슐화하고 결과 캐싱.
- periodKey/reportCycle 필드를 주요 B2B 모델에 추가하는 Prisma 마이그레이션 적용.
- demo seed 서비스(`lib/b2b/demo-seed.ts`) 추가: 2명, 3개월 누적 샘플 자동 생성.
- admin 전용 demo seed API 추가: `POST /api/admin/b2b/demo/seed`.
- CLI seed 스크립트 추가: `npm run b2b:seed:demo-reports`.

### 무엇을 제거/비활성화했는지
- 관리자 UI에서 “선택 대상 배치 Export(zip)” 노출 제거.
- 배치 ZIP API는 운영 기본값에서 비활성(`B2B_ENABLE_BATCH_EXPORT !== "1"` 시 410)로 유지.
- 직원 화면 인쇄 버튼/프린트 UX 제거.

## 실행 로그
- `npm run audit:encoding` 통과.
- `npm run lint` 통과.
- `npm run build` 실패:
  - 원인: 로컬 `DATABASE_URL`이 현재 Prisma 요구 형식(`prisma://` 또는 `prisma+postgres://`)과 맞지 않아 `/` 프리렌더 단계에서 DB 조회 실패.
  - 코드 타입 오류는 수정 완료 상태이며, 환경 변수 정합 시 재검증 필요.
