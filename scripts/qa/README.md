# QA Scripts

`scripts/qa` 폴더는 로컬 브라우저 회귀 확인용 스크립트를 담습니다.

## 실행 전제

- `.env`에 관리자 비밀번호가 있어야 합니다.
  - `ADMIN_PASSWORD` 또는 `QA_ADMIN_PASSWORD`
- Playwright 브라우저가 설치되어 있어야 합니다.
- 스크립트는 자체적으로 `next dev`를 임시 포트로 실행한 뒤 종료합니다.
- `qa:route-scroll` / `qa:b2b:export-smoke`는 내부적으로 공용 QA 락(`.next/qa-locks/qa-dev-server.lock`)을 사용합니다.
  - 동시에 실행하면 후행 작업은 락이 풀릴 때까지 대기합니다.
  - 락 파일이 비정상 종료로 남아도 일정 시간이 지나면 자동으로 stale lock으로 정리됩니다.

## 주요 명령

- `npm run qa:route-scroll`
  - 컬럼 카드 전체 클릭 동작 및 라우트 이동 시 스크롤 상단 리셋을 검증합니다.
- `npm run qa:b2b:export-smoke`
  - B2B 리포트 validation/PPTX/PDF export 기본 동작을 검증합니다.
  - 실행 중 `src/generated/layout.json`이 변경될 수 있어, 스크립트가 실행 전 스냅샷으로 복원합니다.
- `npm run qa:syntax`
  - `scripts/qa` 하위 `.cjs` 스크립트에 대해 `node --check` 문법 점검을 일괄 실행합니다.
- `npm run qa:smoke`
  - `qa:syntax` -> `qa:route-scroll` -> `qa:b2b:export-smoke`를 순차 실행하는 묶음 명령입니다.
- `npm run qa:cde:regression`
  - 칼럼 CRUD, 임직원 리포트 핵심 플로우를 포함한 통합 회귀 확인 스크립트입니다.
  - 오케스트레이션: `scripts/qa/verify-cde-regression.cjs`
  - 세부 시나리오 엔트리: `scripts/qa/lib/cde-regression-flow.cjs`
  - 세부 모듈:
    - `scripts/qa/lib/cde-regression/network-capture.cjs`
    - `scripts/qa/lib/cde-regression/column-admin-scenario.cjs`
    - `scripts/qa/lib/cde-regression/employee-report-scenario.cjs`

## 공용 유틸

- `scripts/qa/lib/dev-server.cjs`
  - dev 서버 실행/준비 대기/종료 공용 유틸
- `scripts/qa/lib/file-snapshot.cjs`
  - 실행 중 변경될 수 있는 파일의 스냅샷/복원 유틸
- `scripts/qa/lib/qa-lock.cjs`
  - QA 스크립트의 `next dev` 실행 구간에 대한 파일 락 유틸
- `scripts/qa/lib/cde-regression-flow.cjs`
  - CDE 회귀 시나리오(컬럼/임직원 리포트) 엔트리 유틸
- `scripts/qa/lib/cde-regression/*`
  - CDE 회귀 세부 단계를 모듈별로 분리한 유틸 모음
- `scripts/qa/lib/route-scroll/scenario.cjs`
  - route-scroll 회귀 시나리오(라우트 스크롤 리셋/카드 클릭 이동) 실행 유틸
- `scripts/qa/lib/b2b-export-smoke/scenario.cjs`
  - b2b export smoke(시드/검증/export) 시나리오 실행 유틸
