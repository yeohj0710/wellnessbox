# Hyphen NHIS Integration Guide

이 문서는 WellnessBox의 하이픈 연동(`health-link`) 구현/운영 기준을 정리합니다.

## 1) 현재 구현 범위

- 상품: 국민건강보험 `진료정보` (seq 79)
- 사용 엔드포인트:
  - `/in0002000065` 진료정보 조회 (init/sign 포함)
  - `/in0002000066` 투약정보 조회
  - `/in0002000072` 건강나이 조회
- 화면:
  - `GET /health-link`
  - 상태 조회: `GET /api/health/nhis/status`
  - 인증 요청: `POST /api/health/nhis/init`
  - 인증 완료: `POST /api/health/nhis/sign`
  - 데이터 조회: `POST /api/health/nhis/fetch`
  - 연동 해제: `POST /api/health/nhis/unlink`

모든 API route는 `requireUserSession`(`lib/server/route-auth.ts`) 가드를 사용합니다.

## 2) 환경 변수

- `HYPHEN_USER_ID`
- `HYPHEN_HKEY`
- `HYPHEN_EKEY` (현재 호출 경로에서는 미사용, 보관용)
- `HYPHEN_USE_GUSTATION`
  - `true`/`1`/`Y`이면 `Hyphen-Gustation: Y` 헤더를 포함
  - 테스트베드 전용, 실운영 전환 시 비활성화 권장
- Optional (OAuth 모드):
  - `HYPHEN_AUTH_MODE=oauth`
  - `HYPHEN_ACCESS_TOKEN`

인증 헤더 분기 지점: `lib/server/hyphen/client.ts`의 `resolveHyphenAuthHeaders()`

## 3) 연동 흐름

1. `init`  
   `/api/health/nhis/init` -> 하이픈 `/in0002000065` (`stepMode=step`, `step=init`, `showCookie=Y`)
2. `sign`  
   `/api/health/nhis/sign` -> 하이픈 `/in0002000065` (`step=sign`, `step_data`, `cookieData`)
3. `fetch`  
   `/api/health/nhis/fetch` -> `/0065`, `/0066`, `/0072` 병렬 조회 후 부분 성공 허용

`stepData/cookieData`는 서버(DB/session)에서만 다루고 클라이언트에 노출하지 않습니다.

## 4) 자주 발생하는 오류와 대응

- `[LOGIN-001] ... 기관(...) 검색에 실패`
  - loginOrg/입력값 불일치 또는 테스트 계정 조건 미충족 가능성
  - 현재 UI는 `KAKAO` 단일 채널만 지원
- `[LOGIN-002] ... 인증서가 없습니다`
  - PASS/인증서 기반 경로에서 자주 발생 (현재 배포 UI는 PASS 미노출)
- `[C0012-001] 건강iN 검진현황서비스 사용자 연동 후 조회 가능`
  - NHIS 건강iN 측 선행 연동(1회)이 필요한 계정 상태
  - UI에서 사전설정 안내 카드로 노출

## 5) 과금/호출량 메모

- `fetch` 1회 = 최대 3개 엔드포인트 호출(`/0065`,`/0066`,`/0072`)
- 과금/포인트 차감 정책은 하이픈 계약/콘솔 설정 기준이므로 운영 계정에서 반드시 재확인
- 실패 응답도 계약에 따라 과금될 수 있어, 불필요한 반복 호출을 피하도록 UI에서 상태 가드를 둠

## 6) 운영 팁

- 코드 변경만 있을 때는 서버 재시작이 필수는 아님(Next dev hot reload)
- `.env` 변경 시에는 개발 서버 재시작 필요
- Prisma schema 변경 후:
  - `npx prisma migrate dev`
  - `npx prisma generate`
  - 테이블 누락(P2021) 발생 시 DB URL/마이그레이션 적용 DB가 동일한지 확인

## 7) 참고 (공개 페이지)

- Hyphen 상품 소개/테스트 관련 공개 페이지:
  - https://www.hyphen.im/product-api/view?seq=79

일부 상세 API 명세(파라미터/오류코드 테이블)는 로그인된 콘솔 문서에서만 확인 가능한 경우가 있습니다.
