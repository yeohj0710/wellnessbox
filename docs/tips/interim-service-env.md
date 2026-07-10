# TIPS 중간 시뮬레이션 서비스 설정

> 이 기능은 `PROXY_GOLD_SIMULATION` 전용이다. 실제 약사 판정이나 실제 임상 효과로 표시하지 않는다.

## 서버 환경 변수

```dotenv
WB_RND_INTERIM_ENABLED=false
WB_RND_INTERIM_BASE_URL=http://127.0.0.1:8000
WB_RND_INTERIM_TIMEOUT_MS=7500
WB_RND_INTERIM_TOKEN=replace-with-shared-internal-token
WB_RND_INTERIM_PSEUDONYM_SALT=replace-with-long-random-secret
```

- `BASE_URL`은 서버 설정에서만 읽는다. 사용자 입력으로 바꾸지 않는다.
- `TOKEN`은 R&D의 `WB_RND_INTERIM_INTERNAL_TOKEN`과 같아야 한다.
- `PSEUDONYM_SALT` 교체 시 같은 사용자의 가명 ID가 바뀐다. 운영 전 회전 정책을 확정한다.
- 기능을 켜도 사용자·약사·관리자 route는 각각 세션을 다시 확인한다.

## 화면

- 사용자: `/tips`
- 약사: `/pharm/tips`
- 관리자: `/admin/tips`

외부 시험, 실제 약사 라벨, 실제 PRO, 12개월 ADR, 생산 기기 세션이 준비되기 전에는
시뮬레이션 배지를 제거하지 않는다.
