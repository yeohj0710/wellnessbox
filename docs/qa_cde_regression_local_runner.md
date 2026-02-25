# C~E 로컬 회귀 러너

목적: 로컬에서 `next dev`를 직접 기동/종료하면서 C~E 회귀를 한 번에 실행한다.

## 명령

```bash
npm run qa:cde:regression:local
```

## 동작 방식

1. `.env`에서 `ADMIN_PASSWORD`를 로드한다.
2. `BASE_URL` 서버가 이미 살아 있으면 재사용한다.
3. 서버가 없으면 `.next` 빌드/캐시 산출물을 먼저 삭제해 `build`/`dev` 충돌을 방지한다.
4. 이어서 `node_modules/.bin/next dev --port 3107`로 내부 기동한다.
5. `scripts/qa/verify-cde-regression.cjs`를 실행한다.
6. 내부 기동한 dev 프로세스는 종료 시 자동 정리한다.

## 환경 변수

- `ADMIN_PASSWORD` (필수): 관리자 로그인 검증용 비밀번호
- `BASE_URL` (선택): 기본값 `http://localhost:3107`
- `QA_PORT` (선택): 기본값 `3107` (`BASE_URL` 미설정 시 사용)
- `QA_START_TIMEOUT_MS` (선택): 서버 준비 대기 시간 (기본 150000ms)

## 참고

- 기존 `npm run qa:cde:regression`은 이미 떠 있는 서버를 대상으로만 동작한다.
- 로컬 Prisma lock/포트 충돌로 검증이 자주 막히는 경우 `qa:cde:regression:local`을 우선 사용한다.
