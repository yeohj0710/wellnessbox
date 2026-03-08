# B2B Admin Employee Data Client Map

## 목적
- `/admin/b2b-employee-data` 유지보수 시 상태/핸들러/표시 블록 책임을 빠르게 파악합니다.
- 후속 세션에서 대규모 단일 컴포넌트 수정 대신 블록 단위 수정으로 회귀를 줄입니다.

## 엔트리
- 라우트 셸: `app/(admin)/admin/b2b-employee-data/page.tsx`
- 메인 오케스트레이션: `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`

## 현재 분리 구조
- 레코드 목록 UI 블록:
  - `app/(admin)/admin/b2b-employee-data/_components/RecordListSection.tsx`
- 레코드 행 빌더(순수 유틸):
  - `app/(admin)/admin/b2b-employee-data/_lib/record-row-builders.ts`
- API 경계:
  - `app/(admin)/admin/b2b-employee-data/_lib/api.ts`
- 클라이언트 타입/유틸:
  - `app/(admin)/admin/b2b-employee-data/_lib/client-types.ts`
  - `app/(admin)/admin/b2b-employee-data/_lib/client-utils.ts`

## 상태/핸들러 묶음
- 직원 목록/선택:
  - `employees`, `selectedEmployeeId`, `search`
  - `loadEmployeeList`, `loadEmployeeOps`, `refreshCurrentEmployee`
- 직원 생성:
  - `create*` 상태 + `handleCreateEmployee`
- 직원 기본정보 수정:
  - `edit*` 상태 + `handleSaveEmployeeProfile`
- 데이터 정리/삭제:
  - 기간 초기화 `handleResetPeriodData`
  - 전체 초기화 `handleResetAllData`
  - 하이픈 캐시 정리 `handleClearHyphenCache`
  - 직원 삭제 `handleDeleteEmployee`
  - 단일 레코드 삭제 `handleDeleteRecord`

## 편집 가이드
1. 레코드 리스트 표시/메타 문구 변경:
   - `_lib/record-row-builders.ts`를 먼저 수정합니다.
   - JSX 반복을 메인 파일에 다시 넣지 말고 `RecordListSection` 재사용을 유지합니다.
2. 요청/응답 계약 변경:
   - `_lib/client-types.ts` -> `_lib/api.ts` -> 메인 클라이언트 순서로 반영합니다.
3. 인증/권한 정책:
   - 이 화면은 관리자 영역이므로 서버 라우트(`app/api/admin/b2b/**`)의 가드 로직을 우회하지 않습니다.

## 회귀 체크리스트
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
- 수동 점검: `/admin/b2b-employee-data`
  - 직원 조회/선택
  - 단일 레코드 삭제
  - 기간 초기화/전체 초기화
  - 하이픈 캐시 정리
