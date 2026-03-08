# Employee Report Client Map

## 목적
- `/employee-report` 후속 작업 시 진입점을 빠르게 찾을 수 있게 클라이언트 경계를 고정합니다.
- 대형 유틸 파일을 책임별 모듈로 분리해, 다음 세션 에이전트가 필요한 블록만 읽고 수정할 수 있게 합니다.

## 진입 순서
- 오케스트레이션: `app/(features)/employee-report/EmployeeReportClient.tsx`
- 페이지 엔트리: `app/(features)/employee-report/page.tsx`
- UI 블록:
  - `app/(features)/employee-report/_components/EmployeeReportInputFlowPanel.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportReadyPanel.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportAdminOnlySection.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportIdentitySection.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportSummaryHeaderCard.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportSyncGuidanceNotice.tsx`

## 클라이언트 유틸 경계
- 안정적 facade: `app/(features)/employee-report/_lib/client-utils.ts`
  - 기존 import 호환성 유지용 export surface입니다.
- identity/localStorage: `app/(features)/employee-report/_lib/client-utils.identity.ts`
  - `normalizeDigits`, `toIdentityPayload`, `isValidIdentityInput`
  - `readStoredIdentityWithSource`, `saveStoredIdentity`, `clearStoredIdentity`
  - `resolveIdentityPrimaryActionLabel`
- request/network resilience: `app/(features)/employee-report/_lib/client-utils.request.ts`
  - `ApiRequestError`, `requestJson`
- sync guidance/report helpers: `app/(features)/employee-report/_lib/client-utils.guidance.ts`
  - `toSyncNextAction`, `resolveSyncCompletionNotice`
  - `resolveCooldownUntilFromPayload`
  - `resolveMedicationStatusMessage`
  - `parseLayoutDsl`, `buildSyncGuidance`
- PDF helper: `app/(features)/employee-report/_lib/client-utils.pdf.ts`
  - `downloadPdf`, `PdfDownloadError`, `isPdfEngineUnavailableFailure`
- format helper: `app/(features)/employee-report/_lib/client-utils.format.ts`
  - `formatDateTime`, `formatRelativeTime`

## 다른 핵심 경계
- 타입 계약: `app/(features)/employee-report/_lib/client-types.ts`
- API 경계: `app/(features)/employee-report/_lib/api.ts`
- 공통 문구/상수: `app/(features)/employee-report/_lib/employee-report-copy.ts`
- PDF 다운로드 오케스트레이션: `app/(features)/employee-report/_lib/pdf-download.ts`
- NHIS/동기화 오케스트레이션: `app/(features)/employee-report/_lib/sync-flow.ts`

## 수정 순서 가이드
1. 입력값/로컬 저장소 문제:
   - `client-utils.identity.ts` -> `use-employee-report-session-bootstrap.ts` -> `EmployeeReportClient.tsx`
2. 네트워크/timeout/서버 에러 처리:
   - `client-utils.request.ts` -> `api.ts` -> 관련 action hook
3. 재연동 안내/쿨다운/복약 상태 문구:
   - `client-utils.guidance.ts` -> `EmployeeReportSyncGuidanceNotice.tsx` -> sync action hooks
4. PDF 저장 동작:
   - `client-utils.pdf.ts` -> `pdf-download.ts`

## 빠른 검증
- `npm run qa:employee-report:client-utils-modules`
- `npm run qa:employee-report:auth-ux`
- `npm run qa:employee-report:sync-notice`
- `npm run lint`
- `npm run build`
