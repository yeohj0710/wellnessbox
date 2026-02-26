# B2B Report Payload 모듈 가이드

`buildB2bReportPayload` 흐름을 빠르게 파악하기 위한 내부 문서입니다.

## 목적

- 리포트 payload 생성 로직의 책임 분리 지점을 명확히 한다.
- 후속 리팩토링/버그 수정 시 탐색 범위를 줄인다.

## 모듈 구성

- `lib/b2b/report-payload.ts`
  - 오케스트레이션 진입점
  - DB 조회, 점수 엔진 호출, 최종 payload 조립
- `lib/b2b/report-payload-analysis.ts`
  - 분석 payload(`latestAnalysis.payload`)에서 summary/survey/health/trend/cards/AI 평가 추출
- `lib/b2b/report-payload-health.ts`
  - 건강지표/복약 데이터 추출
  - fetch 실패 대상 파싱(`parseFetchFlags`, `extractFailedTargets`)
- `lib/b2b/report-payload-wellness.ts`
  - wellness 섹션(`wellness`) 파싱 전담
- `lib/b2b/report-payload-issues.ts`
  - 복약 상태 판정(`resolveMedicationStatus`)
  - 신뢰 기반 top issue 생성(`buildCredibleTopIssues`)
- `lib/b2b/report-payload-shared.ts`
  - 공통 JSON 유틸(`asRecord`, `asArray`, `toText`)
- `lib/b2b/report-payload-types.ts`
  - `B2bReportPayload` 타입 정의

## 수정 가이드

- 점수 산출 규칙 변경: `report-score-engine.ts` + `report-payload-issues.ts`
- wellness 출력 구조 변경: `report-payload-wellness.ts`
- 건강/복약 원천 파싱 변경: `report-payload-health.ts`
- 최종 payload 필드 추가/삭제: `report-payload.ts` + `report-payload-types.ts`

## 안전 체크

- 변경 후 최소 검증:
  - `npm run audit:encoding`
  - `npm run lint`
  - `npx next build`
- 전체 빌드(`npm run build`)가 Windows Prisma 파일 잠금으로 실패하면:
  - Prisma Studio/Node 프로세스 종료 후 재실행
