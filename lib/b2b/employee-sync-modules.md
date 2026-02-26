# Employee Sync 모듈 가이드

`fetchAndStoreB2bHealthSnapshot` 관련 책임 분리 구조를 빠르게 파악하기 위한 문서입니다.

## 모듈 구성

- `lib/b2b/employee-service.ts`
  - B2B 직원 동기화 오케스트레이션
  - 캐시 우선 조회, 강제 갱신 분기, 스냅샷 저장/상태 갱신
- `lib/b2b/employee-sync-summary.ts`
  - NHIS 요약 payload 보정 로직
  - 누락 타겟 판별, 보정 fetch, payload 병합
  - `parseCachedPayload`, `patchSummaryTargetsIfNeeded`
- `lib/b2b/employee-sync-link-artifacts.ts`
  - Hyphen 원본 응답에서 `cookieData`/`stepData` 아티팩트 추출
  - NHIS 링크 세션 복구에 필요한 추출 전담

## 변경 포인트 가이드

- 요약 응답 누락 보정 규칙 변경: `employee-sync-summary.ts`
- 세션 아티팩트 추출 규칙 변경: `employee-sync-link-artifacts.ts`
- 동기화 플로우/에러 분기 변경: `employee-service.ts`

## 최소 검증

- `npm run audit:encoding`
- `npm run lint`
- `npx next build`

참고:
- `npm run build`가 Windows Prisma 엔진 파일 잠금(`EPERM rename`)으로 실패할 수 있음
