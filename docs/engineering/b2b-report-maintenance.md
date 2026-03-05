# B2B 레포트 유지보수 가이드

## 목적
- `/admin/b2b-reports` 및 `/employee-report` 관련 후속 작업 시
  - 코드 위치를 빠르게 찾고
  - 레이아웃/검증 이슈를 재현 가능하게 점검하며
  - 안전하게 수정/배포하기 위한 운영 문서입니다.

## 핵심 파일 맵
- UI 오케스트레이션: `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- 검증 패널: `app/(admin)/admin/b2b-reports/_components/B2bLayoutValidationPanel.tsx`
- 클라이언트 유틸: `app/(admin)/admin/b2b-reports/_lib/client-utils.ts`
- 파일명/쿼리 유틸: `app/(admin)/admin/b2b-reports/_lib/export-filename.ts`
- 설문 응답 병합 유틸: `app/(admin)/admin/b2b-reports/_lib/survey-answer-merge.ts`
- 설문 섹션/포커스 유틸: `app/(admin)/admin/b2b-reports/_lib/survey-editor-sections.ts`
- 레이아웃 생성: `lib/b2b/export/layout-dsl.ts`
- 레이아웃 파이프라인: `lib/b2b/export/pipeline.ts`
- 레이아웃 검증 엔진: `lib/b2b/export/validation.ts`
- 검증 이슈 공용 유틸: `lib/b2b/export/validation-issues.ts`

## 레이아웃 검증 파이프라인 정리
- 자동 시도 스테이지: `base -> shorten -> compact -> fallback`
- 각 스테이지에서 `static` + `runtime` 검증을 실행합니다.
- 동일 이슈는 중복 제거 후(`dedupe`) 최종 이슈 목록과 점수 계산에 사용합니다.
- 운영 화면의 검증 요약은 `static/runtime/중복제거` 기준으로 확인합니다.

## 최근 반영된 유지보수 개선 포인트
- `validation issue dedupe` 로직을 서버/클라이언트 공용 유틸로 통합
  - 중복 집계 기준이 분리되어 드리프트 나는 문제 방지
- 긴 섹션 텍스트의 페이지 단위 자동 분할 로직 적용
  - 한 섹션이 페이지를 넘겨도 내부 라인을 나눠 다음 페이지로 이월
  - `BOUNDS` 오류를 줄이고 재배치 성공률 개선
- PDF 파일명 생성 로직 중복 제거
  - admin 클라이언트 내 중복 코드 제거 및 규칙 일원화
- 관리자 리포트 액션 핸들러 패턴 통합
  - `runBusyAction`으로 로딩/에러/알림 처리 중복을 단일 경로로 정리
  - 핸들러별 try/catch 드리프트를 줄여 후속 기능 추가 시 회귀 가능성 축소
- 설문 답변 병합 로직 분리
  - 기존 `survey-progress.ts` 내 미사용 로직 제거
  - 실제 사용 중인 `mergeSurveyAnswers`만 독립 유틸로 분리해 추적성 개선

## 레이아웃 이슈 디버깅 순서
1. `/admin/b2b-reports`에서 `레이아웃 검증 실행`
2. `검증 결과 요약`에서 선택된 스테이지/스타일 확인
3. `검증 이슈 상세`에서 `page/node/bounds` 확인
4. `A4 프리뷰 보기`로 실제 위치 시각 검증
5. 필요 시 아래 QA 스크립트로 재현/회귀 확인

## 권장 QA 명령
- 인코딩 가드: `npm run audit:encoding`
- 정적 점검: `npm run lint`
- 빌드 점검: `npm run build`
- 레포트 overflow 점검: `npm run qa:b2b:report-overflow`
- 복약 항목 전체 행 점검: `npm run qa:b2b:report-medication-all-rows`
- PDF 시각 스모크: `npm run qa:b2b:capture-pdf-visual`
- 관리자 설문 동기화 점검: `npm run qa:b2b:admin-survey-sync`

## 후속 리팩토링 우선순위(핫스팟 기준)
- `SurveyPageClient` (`app/survey/survey-page-client.tsx`)
- `EmployeeReportClient` (`app/(features)/employee-report/EmployeeReportClient.tsx`)
- `B2bAdminReportClient` (`app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`)
- `ReportSummaryCards` (`components/b2b/ReportSummaryCards.tsx`)
- `SurveyResultPanel` (`app/survey/_components/SurveyResultPanel.tsx`)

위 파일은 기능 안정성을 유지하면서 “상태/네트워크/프레젠테이션 분리” 방식으로 단계적으로 분해하는 것을 권장합니다.

## 작업 원칙
- 인증/권한 경로는 `lib/server/route-auth.ts` 가드 사용
- 주문/재고 무결성 로직은 `lib/order/mutations.ts` 트랜잭션 유지
- Prisma 클라이언트는 `lib/db.ts` 싱글턴 유지
- 변경 후 `lint -> build -> 관련 QA` 순서로 확인
