# Employee Report Client Map

## 목적
- `/employee-report` 유지보수 시 수정 범위를 빠르게 파악하고 회귀를 줄입니다.
- 인증/연동 플로우와 UI 표현 블록의 책임을 분리해 후속 세션 생산성을 높입니다.

## 엔트리
- 메인 오케스트레이션: `app/(features)/employee-report/EmployeeReportClient.tsx`
- 라우트 페이지: `app/(features)/employee-report/page.tsx`

## UI 컴포넌트 경계
- 부트 스켈레톤: `app/(features)/employee-report/_components/EmployeeReportBootSkeleton.tsx`
- 강제 재조회 확인 모달: `app/(features)/employee-report/_components/ForceRefreshConfirmDialog.tsx`
- 동기화 가이드 알림: `app/(features)/employee-report/_components/EmployeeReportSyncGuidanceNotice.tsx`
- 본인확인 입력 카드: `app/(features)/employee-report/_components/EmployeeReportIdentitySection.tsx`
- 리포트 상단 제어 카드: `app/(features)/employee-report/_components/EmployeeReportSummaryHeaderCard.tsx`

## 클라이언트 유틸/타입 경계
- 타입 계약: `app/(features)/employee-report/_lib/client-types.ts`
- API 경계: `app/(features)/employee-report/_lib/api.ts`
  - `fetchEmployeeReport`, `postEmployeeSync`
  - `fetchEmployeeSession`, `upsertEmployeeSession`, `deleteEmployeeSession`
  - `requestNhisInit`, `requestNhisSign`, `requestNhisUnlink`
- 요청 공통/포맷/저장/가이드 유틸: `app/(features)/employee-report/_lib/client-utils.ts`
  - `requestJson`, `ApiRequestError`
  - `readStoredIdentity`, `saveStoredIdentity`
  - `resolveCooldownUntilFromPayload`
  - `resolveMedicationStatusMessage`
  - `buildSyncGuidance`

## 수정 가이드
1. UI 텍스트/레이아웃 변경:
   - 먼저 `_components/*`를 수정하고, 오케스트레이션 파일은 가급적 건드리지 않습니다.
2. 인증/연동 분기 변경:
   - `EmployeeReportClient.tsx`의 핸들러(`handleRestartAuth`, `handleSignAndSync`)를 수정합니다.
   - 엔드포인트/헤더/요청 바디 변경은 `_lib/api.ts`에서 먼저 반영합니다.
   - 서버 응답 구조가 바뀌면 `client-types.ts`를 먼저 갱신합니다.
3. 에러/대기/안내 문구 정책 변경:
   - `buildSyncGuidance`와 `resolveMedicationStatusMessage`를 우선 수정합니다.

## 빠른 검증
- `npm run lint`
- `npm run build`
- `npm run qa:cde:regression:local`
