# B2B Admin Report Busy Action Refactor

## 목적
- `B2bAdminReportClient` 내부의 busy/error/notice 공통 실행 로직을 훅으로 분리해
  - 인라인 중복 제거
  - 후속 기능 추가 시 충돌 범위 축소
  - 동일 패턴의 재사용성 확보

## 적용 파일
- 신규 훅:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-busy-action.ts`
- 적용 클라이언트:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- QA:
  - `scripts/qa/check-b2b-admin-report-busy-action.cts`
  - `package.json` 스크립트: `qa:b2b:admin-report-busy-action`

## 훅 책임
- `busy` 상태 단일 관리
- 작업 실행 전/후 공통 처리
  - 시작 시 `busy=true`, 에러 초기화
  - 옵션에 따라 notice 초기화
  - 실패 시 커스텀 `onError` 또는 기본 fallback 에러 적용
  - 종료 시 `busy=false`

## 검증 명령
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-busy-action`
3. `npm run qa:b2b:admin-background-refresh`
4. `npm run lint`
5. `npm run build`

