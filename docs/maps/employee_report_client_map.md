# Employee Report Client Map

## 목적

- `/employee-report` 후속 작업 시 진입점을 빠르게 찾을 수 있게 클라이언트 경계를 고정합니다.
- 페이지 셸, 파생 상태, 이벤트 어댑터, 실제 동기화 작업을 분리해서 다음 세션 에이전트가 수정 지점을 바로 찾게 합니다.

## 진입 순서

- 오케스트레이션:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`
- 페이지 엔트리:
  - `app/(features)/employee-report/page.tsx`
- 주요 UI 패널:
  - `app/(features)/employee-report/_components/EmployeeReportInputFlowPanel.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportReadyPanel.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportAdminOnlySection.tsx`

## 클라이언트 경계

- 안정적 facade:
  - `app/(features)/employee-report/_lib/client-utils.ts`
- identity/localStorage:
  - `app/(features)/employee-report/_lib/client-utils.identity.ts`
- request/network resilience:
  - `app/(features)/employee-report/_lib/client-utils.request.ts`
- sync guidance/report helpers:
  - `app/(features)/employee-report/_lib/client-utils.guidance.ts`
- PDF helper:
  - `app/(features)/employee-report/_lib/client-utils.pdf.ts`
- format helper:
  - `app/(features)/employee-report/_lib/client-utils.format.ts`

## 페이지 레벨 분리

- 파생 view-model:
  - `app/(features)/employee-report/_lib/use-employee-report-page-derived-state.ts`
- input/dialog 이벤트 어댑터:
  - `app/(features)/employee-report/_lib/use-employee-report-page-handlers.ts`
- 부트스트랩:
  - `app/(features)/employee-report/_lib/use-employee-report-session-bootstrap.ts`
- auth-sync/session effect:
  - `app/(features)/employee-report/_lib/use-employee-report-session-effects.ts`
- 기존 기록 찾기:
  - `app/(features)/employee-report/_lib/use-employee-report-existing-record-actions.ts`
- sync action 조립:
  - `app/(features)/employee-report/_lib/use-employee-report-sync-actions.ts`
- report load/download/logout:
  - `app/(features)/employee-report/_lib/use-employee-report-report-loading.ts`
  - `app/(features)/employee-report/_lib/use-employee-report-report-actions.ts`

## 다른 의존 경계

- 타입 계약:
  - `app/(features)/employee-report/_lib/client-types.ts`
- API 경계:
  - `app/(features)/employee-report/_lib/api.ts`
- 공통 문구/상수:
  - `app/(features)/employee-report/_lib/employee-report-copy.ts`
- 오버레이 copy:
  - `app/(features)/employee-report/_lib/overlay-copy.ts`
- PDF 다운로드 오케스트레이션:
  - `app/(features)/employee-report/_lib/pdf-download.ts`
- NHIS/동기화 오케스트레이션:
  - `app/(features)/employee-report/_lib/sync-flow.ts`

## 수정 가이드

1. 입력 정규화나 force-sync 확인 다이얼로그 동작:
   - `use-employee-report-page-handlers.ts`
2. 기간 옵션, overlay 설명, force-sync 가능 여부:
   - `use-employee-report-page-derived-state.ts`
3. 세션 자동 복구, 저장된 신원 기반 자동 로그인:
   - `use-employee-report-session-bootstrap.ts`
4. auth-sync 반응이나 재조회 effect:
   - `use-employee-report-session-effects.ts`
5. 실제 조회/동기화/로그아웃/PDF:
   - 각 `use-employee-report-*` operational hook

## 빠른 검증

- `npm run qa:employee-report:page-hooks`
- `npm run qa:employee-report:panel-extraction`
- `npm run qa:employee-report:report-actions-extraction`
- `npm run qa:employee-report:sync-actions-extraction`
- `npm run qa:employee-report:session-bootstrap-extraction`
- `npm run qa:employee-report:session-effects-extraction`
- `npm run qa:auth-sync:contract`
- `npm run lint`
- `npm run build`
