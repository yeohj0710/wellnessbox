# Client ↔ AppUser 연동 정책

## 연결/첨부 시점
- 카카오 로그인 완료(`kakao-login`), 전화번호 인증 완료(`phone-link`), 로그인된 상태의 API 접근(`session-sync`), 프로필 저장(`profile-sync`) 시에 서버가 `attachClientToAppUser`를 호출합니다.
- 연동은 서버가 확인한 세션/OTP 성공을 전제로 하며, 클라이언트가 body/query로 임의의 `clientId`를 주입해도 자동으로 검증/보정합니다.

## 우선순위 및 충돌 처리
- AppUser에 기존 `clientId`가 없다면 현재 브라우저(`wb_cid`)를 바로 연결합니다.
- 기존 값과 다른 `clientId`가 들어오면 **마지막 활동 시간(lastSeenAt)이 최신인 Client**를 우선 사용합니다. 동률 시에는 현재 브라우저의 값을 채택합니다.
- 동일한 `clientId`가 다른 AppUser에 이미 연결되어 있으면 교차 노출을 막기 위해 기존 AppUser의 `clientId`를 유지하고 신규 연결은 거부(새로운 `clientId` 발급)합니다.

## 데이터 이관(merge)
- `AppUser.clientId`가 변경되면 다음 데이터를 트랜잭션으로 새 `clientId`로 이동합니다.
  - `AssessmentResult`, `CheckAiResult`, `ChatSession`(연결된 `ChatMessage`는 세션 ID로 유지), `UserProfile`, `Order.endpoint`
- `UserProfile`이 양쪽에 있으면 `updatedAt`이 최신인 데이터를 보존하며, 나머지는 삭제합니다.

## 조회 규칙
- 로그인된 요청에서는 AppUser에 연결된 `clientId`를 우선 사용하여 결과/프로필을 조회하며, 쿠키가 없으면 서버가 자동 발급 후 설정합니다. `GET` 요청에서는 DB 병합/첨부 없이 읽기만 수행합니다.
- 비회원 흐름은 기존처럼 `wb_cid` 쿠키를 그대로 사용합니다.
- 로그인 상태에서 `body`/`query`로 넘어온 `clientId` 값은 신뢰하지 않으며, 서버가 확인 가능한 쿠키/헤더 또는 새로 발급한 값만 사용합니다.

## 로깅
- 연동/이관 시에는 `kakaoId`, 최종 `clientId`, 병합된 ID 목록, 전화번호(마스킹) 등을 서버 로그에 남깁니다.
