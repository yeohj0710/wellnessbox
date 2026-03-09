# 인증/로그인 동기화 맵
최종 갱신: 2026-03-08

사이트 전반에서 인증 상태가 서로 어긋나지 않도록, 어떤 화면이 어떤 auth-sync 이벤트를 발행하고 구독하는지 정리한 문서입니다.

## 목적

- `my-orders`, `cart`, `survey`, `employee-report`, `health-link`, `admin/b2b` 보조 UI에서 인증 상태를 일관되게 반영합니다.
- 한 화면에서 로그인, 로그아웃, 연동 상태 변경이 발생하면 다른 화면도 즉시 같은 상태를 반영합니다.
- 카카오 본인인증 같은 외부 인증 상태와 로컬 세션 상태가 무엇을 보장하고 무엇을 보장하지 않는지 경계를 분명히 합니다.

## 인증 도메인

1. `user-session`
- 일반 사용자 로그인 세션
- 주 경로: `/api/auth/login-status`, `/api/auth/logout`

2. `phone-link`
- 휴대폰 OTP 연동 상태
- 주 경로: `/api/me/link-phone`, `/api/me/unlink-phone`, `/api/me/phone-status`

3. `b2b-employee-session`
- B2B 임직원 조회/설문 세션
- 주 경로: `/api/b2b/employee/session`, `/api/b2b/employee/sync`

4. `nhis-link`
- 건강보험 연동 세션
- 주 경로: `/api/health/nhis/init`, `/api/health/nhis/sign`, `/api/health/nhis/unlink`, `/api/health/nhis/status`

## 이벤트 계약

공통 클라이언트 이벤트 버스:
- [`auth-sync.ts`](/c:/dev/wellnessbox/lib/client/auth-sync.ts)

- 이벤트명: `wb:auth-sync`
- storage key: `wb:auth-sync:v1`
- scope:
1. `user-session`
2. `phone-link`
3. `b2b-employee-session`
4. `nhis-link`
5. `all`

## 발행 위치

1. 일반 로그인/로그아웃
- [`topBar.tsx`](/c:/dev/wellnessbox/components/common/topBar.tsx)
- [`logoutButton.tsx`](/c:/dev/wellnessbox/app/me/logoutButton.tsx)

2. 휴대폰 연동/해제
- [`usePhoneLinkSectionState.ts`](/c:/dev/wellnessbox/app/me/usePhoneLinkSectionState.ts)
- [`useMeProfileMutations.ts`](/c:/dev/wellnessbox/app/me/useMeProfileMutations.ts)
- [`usePhoneStatus.ts`](/c:/dev/wellnessbox/components/order/hooks/usePhoneStatus.ts)
- [`useLinkedPhoneStatus.ts`](/c:/dev/wellnessbox/app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts)

3. B2B 임직원 세션
- [`use-survey-auth-bootstrap.ts`](/c:/dev/wellnessbox/app/survey/_lib/use-survey-auth-bootstrap.ts)
- [`survey-page-client.tsx`](/c:/dev/wellnessbox/app/survey/survey-page-client.tsx)
- [`EmployeeReportClient.tsx`](/c:/dev/wellnessbox/app/(features)/employee-report/EmployeeReportClient.tsx)

4. NHIS 연동 상태 변경
- [`useNhisHealthLink.ts`](/c:/dev/wellnessbox/app/(features)/health-link/useNhisHealthLink.ts)
- [`EmployeeReportClient.tsx`](/c:/dev/wellnessbox/app/(features)/employee-report/EmployeeReportClient.tsx)

## 구독 위치

1. 로그인 상태 반영
- [`topBar.hooks.ts`](/c:/dev/wellnessbox/components/common/topBar.hooks.ts)
- [`useCartLoginStatus.ts`](/c:/dev/wellnessbox/components/order/hooks/useCartLoginStatus.ts)
- [`use-admin-login-status.ts`](/c:/dev/wellnessbox/app/(features)/employee-report/_lib/use-admin-login-status.ts)
- [`ColumnAdminWriteButton.tsx`](/c:/dev/wellnessbox/app/column/_components/ColumnAdminWriteButton.tsx)

2. 휴대폰 연동 상태 반영
- [`usePhoneStatus.ts`](/c:/dev/wellnessbox/components/order/hooks/usePhoneStatus.ts)
- [`useLinkedPhoneStatus.ts`](/c:/dev/wellnessbox/app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts)

3. B2B 임직원 세션 반영
- [`use-survey-auth-bootstrap.ts`](/c:/dev/wellnessbox/app/survey/_lib/use-survey-auth-bootstrap.ts)
- [`use-employee-report-session-effects.ts`](/c:/dev/wellnessbox/app/(features)/employee-report/_lib/use-employee-report-session-effects.ts)

4. NHIS 연동 상태 반영
- [`useNhisHealthLink.status.ts`](/c:/dev/wellnessbox/app/(features)/health-link/useNhisHealthLink.status.ts)
- [`use-employee-report-session-effects.ts`](/c:/dev/wellnessbox/app/(features)/employee-report/_lib/use-employee-report-session-effects.ts)

## 동기화 경계

1. 카카오 본인인증, 카카오 로그인 같은 외부 인증 상태는 외부 공급자의 실제 인증 완료를 통과해야 합니다.
- 클라이언트 코드가 임의로 외부 인증 완료 상태를 만들면 안 됩니다.
- OTP 성공이나 세션 복구가 카카오 본인인증 자체를 대체하지는 않습니다.

2. auth-sync는 화면 상태 반영 계약입니다.
- 다른 화면에서 로그인 완료나 연동 상태 변경이 발생하면, 현재 화면은 그 결과를 다시 조회해서 반영해야 합니다.
- 이벤트가 외부 인증 자체를 대신 보장하지는 않습니다.

## 테스트 케이스

1. `survey`에서 B2B 인증 완료 후 `employee-report` 진입
- 기대: 추가 인증 없이 세션 재사용 또는 자동 조회

2. `employee-report`에서 로그아웃 후 `survey` 재진입
- 기대: 설문 화면이 인증 해제를 반영하고 재인증을 요구

3. `my-page`에서 휴대폰 연동 완료 후 `my-orders` 또는 `cart`로 이동
- 기대: 연동 상태가 새로고침 없이 반영

4. `health-link`에서 unlink 후 `employee-report`로 이동
- 기대: NHIS 연동 상태가 최신 상태로 반영

5. `TopBar` 로그아웃 후 관리자/일반 로그인 보조 UI 확인
- 기대: 로그인 상태 UI가 즉시 업데이트

## 체크리스트

1. 변경 전후 검증
- `npm run qa:auth-sync:contract`
- `npm run lint`
- `npm run build`

2. auth-sync 관련 화면 수정 시
- 이 문서의 emit/subscribe 위치를 같이 갱신합니다.
- 외부 인증 보장 범위를 침범하지 않았는지 확인합니다.
