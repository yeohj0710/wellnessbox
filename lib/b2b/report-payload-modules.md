# B2B Report Payload 모듈 가이드

`buildB2bReportPayload` 주변의 책임 경계를 빠르게 파악하기 위한 문서입니다.

## 목적

- 리포트 payload 생성 로직의 진입점과 helper 책임을 분리해서 찾기 쉽게 유지한다.
- 후속 세션에서 payload 필드 수정, wellness fallback 조정, 건강/복약 파싱 수정 지점을 빠르게 찾게 한다.

## 모듈 구성

- `lib/b2b/report-payload.ts`
  - 진입점
  - 직원/건강/설문/분석/약사 노트 조회
  - 최종 `B2bReportPayload` 조립
- `lib/b2b/report-payload-survey.ts`
  - 설문 질문 lookup 캐시
  - 답변 텍스트 정규화
  - 기간별 설문 fallback 선택
  - 설문 기반 wellness fallback 계산
- `lib/b2b/report-payload-analysis.ts`
  - 분석 payload에서 summary / survey / health / trend / external cards / AI evaluation 추출
- `lib/b2b/report-payload-analysis-helpers.ts`
  - 분석 payload 내부 row 정규화 helper
  - top issue / section score / health metric / risk flag / trend / external card 파싱
- `lib/b2b/report-payload-health.ts`
  - 건강 지표 추출
  - fetch 상태 플래그 파싱
- `lib/b2b/report-payload-health-medication.ts`
  - normalized medication / medical 컨테이너에서 리포트용 복약 행 추출
- `lib/b2b/report-payload-health-medication-helpers.ts`
  - 복약 이름/효능/방문키/방문 제한/derived label 판정 helper
- `lib/b2b/report-payload-medication.ts`
  - 리포트용 복약 행 조립
  - 최신 snapshot + history backfill 오케스트레이션
- `lib/b2b/report-payload-medication-helpers.ts`
  - raw envelope 파싱
  - visit merge / named-row 우선순위 / history snapshot row 병합 규칙
- `lib/b2b/report-payload-issues.ts`
  - 복약 상태 판정
  - credible top issue 생성
- `lib/b2b/report-payload-wellness.ts`
  - wellness 출력 구조 정규화
- `lib/b2b/report-payload-shared.ts`
  - 공통 JSON / 문자열 helper
- `lib/b2b/report-payload-types.ts`
  - `B2bReportPayload` 타입 SSOT

## 수정 가이드

- 설문 질문 문구/응답 라벨 정규화 변경:
  - `report-payload-survey.ts`
- 기간 fallback 규칙 변경:
  - `report-payload-survey.ts`
- 건강/복약 원천 데이터 파싱 변경:
  - `report-payload-health.ts`
  - `report-payload-health-medication.ts`
  - `report-payload-health-medication-helpers.ts`
  - `report-payload-medication.ts`
- raw envelope / visit merge 규칙 변경:
  - `report-payload-medication-helpers.ts`
- 분석 payload 내부 row 정규화 규칙 변경:
  - `report-payload-analysis-helpers.ts`
- top issue / medication status 판단 변경:
  - `report-payload-issues.ts`
- 최종 payload 필드 추가/삭제:
  - `report-payload.ts`
  - `report-payload-types.ts`

## 검증

- 최소 검증
  - `npm run qa:b2b:report-payload-survey-helpers`
  - `npm run qa:b2b:report-payload-analysis-helpers`
  - `npm run qa:b2b:report-payload-health-medication-helpers`
  - `npm run qa:b2b:report-payload-medication-helpers`
  - `npm run audit:encoding`
  - `npm run lint`
  - `npm run build`

- 관련 회귀 확인이 필요하면
  - `npm run qa:medication:resilience`
