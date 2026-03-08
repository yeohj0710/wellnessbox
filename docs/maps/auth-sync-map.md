# 인증/로그인 동기화 맵

최종 갱신: 2026-03-05

사이트 전체에서 인증 상태가 서로 어긋나지 않도록, 페이지 간 동기화 규칙과 한계를 정리한 문서입니다.

## 목적

- `내 주문 조회`, `내페이지(프로필)`, `survey`, `employee-report`, `health-link`, `admin/b2b` 보조 UI에서 인증 상태를 일관되게 반영한다.
- 한 페이지에서 인증/로그아웃/연동 변경이 발생하면, 다른 페이지도 즉시 같은 상태를 보도록 한다.
- 외부 인증(카카오 본인인증/카카오 로그인) 특성상 임의 통과가 불가능한 경계는 명확히 유지한다.

## 인증 축

1. `user-session`
- 카카오 로그인 기반 일반 사용자 세션 (`/api/auth/login-status`, `/api/auth/logout`)

2. `phone-link`
- 휴대폰 OTP 인증/연동 상태 (`/api/me/link-phone`, `/api/me/unlink-phone`, `/api/me/phone-status`)

3. `b2b-employee-session`
- B2B 임직원 세션 (`/api/b2b/employee/session`, `/api/b2b/employee/sync`)

4. `nhis-link`
- 건강보험 연동 세션 (`/api/health/nhis/init|sign|unlink|status`)

## 이벤트 계약

공통 클라이언트 이벤트 버스: [`lib/client/auth-sync.ts`](/c:/dev/wellnessbox/lib/client/auth-sync.ts)

- 이벤트명: `wb:auth-sync` (same-tab)
- 스토리지 키: `wb:auth-sync:v1` (cross-tab `storage` 이벤트 전파)
- Scope:
1. `user-session`
2. `phone-link`
3. `b2b-employee-session`
4. `nhis-link`
5. `all` (전체 수신)

### 발행(emit) 지점

1. 사용자 로그아웃
- [`components/common/topBar.tsx`](/c:/dev/wellnessbox/components/common/topBar.tsx)
- [`app/me/logoutButton.tsx`](/c:/dev/wellnessbox/app/me/logoutButton.tsx)

2. 휴대폰 연동/해제
- [`app/me/usePhoneLinkSectionState.ts`](/c:/dev/wellnessbox/app/me/usePhoneLinkSectionState.ts)
- [`app/me/useMeProfileMutations.ts`](/c:/dev/wellnessbox/app/me/useMeProfileMutations.ts)
- [`components/order/hooks/usePhoneStatus.ts`](/c:/dev/wellnessbox/components/order/hooks/usePhoneStatus.ts)
- [`app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts`](/c:/dev/wellnessbox/app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts)

3. B2B 임직원 인증/세션 전환
- [`app/survey/survey-page-client.tsx`](/c:/dev/wellnessbox/app/survey/survey-page-client.tsx)
- [`app/(features)/employee-report/EmployeeReportClient.tsx`](/c:/dev/wellnessbox/app/(features)/employee-report/EmployeeReportClient.tsx)

4. NHIS 연동 상태 변경
- [`app/(features)/health-link/useNhisHealthLink.ts`](/c:/dev/wellnessbox/app/(features)/health-link/useNhisHealthLink.ts)
- [`app/(features)/employee-report/EmployeeReportClient.tsx`](/c:/dev/wellnessbox/app/(features)/employee-report/EmployeeReportClient.tsx)

### 구독(subscribe) 지점

1. 로그인 상태 반영
- [`components/common/topBar.hooks.ts`](/c:/dev/wellnessbox/components/common/topBar.hooks.ts)
- [`components/order/cart.tsx`](/c:/dev/wellnessbox/components/order/cart.tsx)
- [`app/(features)/employee-report/_lib/use-admin-login-status.ts`](/c:/dev/wellnessbox/app/(features)/employee-report/_lib/use-admin-login-status.ts)
- [`app/column/_components/ColumnAdminWriteButton.tsx`](/c:/dev/wellnessbox/app/column/_components/ColumnAdminWriteButton.tsx)

2. 휴대폰 연동 상태 반영
- [`components/order/hooks/usePhoneStatus.ts`](/c:/dev/wellnessbox/components/order/hooks/usePhoneStatus.ts)
- [`app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts`](/c:/dev/wellnessbox/app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts)

3. B2B 임직원 세션 반영
- [`app/survey/survey-page-client.tsx`](/c:/dev/wellnessbox/app/survey/survey-page-client.tsx)
- [`app/(features)/employee-report/EmployeeReportClient.tsx`](/c:/dev/wellnessbox/app/(features)/employee-report/EmployeeReportClient.tsx)

4. NHIS 연동 반영
- [`app/(features)/health-link/useNhisHealthLink.status.ts`](/c:/dev/wellnessbox/app/(features)/health-link/useNhisHealthLink.status.ts)
- [`app/(features)/employee-report/EmployeeReportClient.tsx`](/c:/dev/wellnessbox/app/(features)/employee-report/EmployeeReportClient.tsx)

## 동기화 한계 (중요)

1. 카카오 본인인증, 카카오 로그인은 외부 OAuth/인증 절차를 반드시 통과해야 한다.
- 내부 코드에서 임의로 “인증 완료” 상태를 만들지 않는다.
- 다른 인증(OTP 등)이 성공해도 카카오 본인인증 자체를 자동 우회하지 않는다.

2. 동기화는 “상태 반영”에 집중한다.
- 한 페이지에서 외부 인증 완료/세션 변경이 발생하면, 다른 페이지가 그 결과를 재조회하여 반영한다.
- 외부 제공자의 인증 절차 자체를 대체하지 않는다.

## 테스트 케이스

### 자동 검증

신규 계약 점검 스크립트:
- [`scripts/qa/check-auth-sync-contract.cts`](/c:/dev/wellnessbox/scripts/qa/check-auth-sync-contract.cts)

검증 항목:
1. 공통 이벤트 유틸 존재/스코프 정의
2. 핵심 emit 지점 존재
3. 핵심 subscribe 지점 존재
4. 본 문서 필수 섹션 존재

### 수동 시나리오

1. `survey`에서 B2B 인증 완료 후 `employee-report` 진입
- 기대: 추가 인증 없이 세션 재사용 상태로 진입 또는 자동 조회

2. `employee-report`에서 로그아웃 후 `survey` 탭 유지
- 기대: `survey`에서 인증 상태가 해제되어 재인증 요구

3. `내페이지`에서 휴대폰 연동 완료 후 `my-orders`/`cart` 화면 유지
- 기대: 전화번호 연동 상태가 새로고침 없이 반영

4. `health-link`에서 unlink 후 `employee-report` 유지
- 기대: NHIS 연동 안내/상태가 최신으로 반영

5. `TopBar` 로그아웃 후 관리자/일반 로그인 의존 UI
- 기대: 로그인 상태 의존 버튼/표시가 즉시 업데이트

## 운영 체크리스트

1. 배포 전:
- `npm run qa:auth-sync:contract`
- `npm run lint`
- `npm run build`

2. 인증 플로우 수정 시:
- 본 문서의 emit/subscribe 지점을 함께 업데이트한다.
- 외부 인증 우회가 생기지 않았는지 확인한다.
