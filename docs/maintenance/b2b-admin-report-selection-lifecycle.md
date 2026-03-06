# B2B Admin Report Selection Lifecycle Refactor

## 목적
- `B2bAdminReportClient` 내부의 직원 목록 초기 로딩, 선택 보정, 상세 로딩 lifecycle을 별도 훅으로 분리해
  - 컴포넌트 본문 복잡도 감소
  - 선택/로딩 정책 변경 시 수정 범위 축소
  - 회귀 검증 자동화 기반 강화

## 적용 파일
- 신규 훅:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-selection-lifecycle.ts`
- 적용 클라이언트:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- QA:
  - `scripts/qa/check-b2b-admin-report-selection-lifecycle.cts`
  - `package.json` 스크립트: `qa:b2b:admin-report-selection-lifecycle`

## 훅 책임 범위
- 초기 직원 목록 로딩
- 직원 목록 변경 시 선택 ID 보정
- 선택 직원 상세 로딩 + 로딩 상태 관리
- 선택 전환 시 상세 상태 초기화 트리거

## 검증 명령
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-selection-lifecycle`
3. `npm run qa:b2b:admin-report-busy-action`
4. `npm run qa:b2b:admin-background-refresh`
5. `npm run lint`
6. `npm run build`

