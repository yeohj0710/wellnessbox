# C~E 회귀 점검 자동화 가이드

목적: 새 세션에서 Codex/개발자가 `Column + Employee Report + B2B Export` 핵심 동작을 빠르게 재검증할 수 있도록 최소 필수 플로우를 자동화합니다.

## 1) 실행 전 준비

- 개발 서버 실행: `npm run dev` (기본 `http://localhost:3001`)
- 관리자 비밀번호 환경변수(선택)
  - PowerShell: `$env:ADMIN_PASSWORD="비밀번호"`
- 포트가 다르면 `BASE_URL` 지정
  - 예: `$env:BASE_URL="http://localhost:3107"`

## 2) 실행 명령

```bash
npm run qa:cde:regression
```

## 3) 스크립트가 확인하는 항목

- `C1`
  - `/column` 200
  - `/_next/static/chunks/app/layout.js` 200 응답 확인
  - `/column/tag/...` 200
- `C2`
  - admin 로그인 후 전역 메뉴 `칼럼`, `글쓰기` 노출
  - 칼럼 생성(초안) -> 발행 -> 목록/상세 액션 확인 -> 삭제 -> 상세 404 확인
- `D/E` 스모크
  - 데모 임직원 seed 및 employee session 로그인
  - `/employee-report?debug=1` 요약 섹션 노출
  - `인증 다시하기` 클릭 시 `/api/health/nhis/init` 호출 발생
  - `강제 재조회 실행` 버튼 노출(debug/admin 조건)

## 4) 결과 해석

- 성공: `ok: true`
- 실패: `ok: false`와 함께 `failures[]`에 실패 코드/세부정보가 기록됨
- 네트워크 로그는 `network.requests`, `network.responses`에 포함됨
  - API 응답 body(가능한 경우)도 함께 출력됨

## 5) 운영 팁

- 이 스크립트는 회귀 감지용입니다. 실패 시 바로 기능 결론을 내리지 말고,
  - 브라우저 네트워크 탭,
  - 서버 로그,
  - 실패 항목의 API 응답 body
  를 함께 확인해 원인을 확정하세요.
- 생성/삭제 테스트 글 제목 prefix는 `qa-auto-`입니다.
