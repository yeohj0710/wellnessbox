# Topbar Header Copy And Drawer Hook Refactor

## 목적
- `TopBarHeader`의 텍스트/레이아웃 계산 책임을 분리해 유지보수성을 높입니다.
- 상단바의 깨진 한글 표시 가능성을 줄이고, 한국어 UI 문구를 한 곳에서 관리합니다.

## 적용 내용
- 사용자 문구 상수 모듈 추가:
  - `components/common/topBar.copy.ts`
- 드로어 모드 계산 훅 추가:
  - `components/common/useTopBarDrawerMode.ts`
- 헤더 컴포넌트 정리:
  - `components/common/topBar.header.tsx`
  - `resolveTopBarDrawerMode` 직접 호출 제거
  - `TOPBAR_COPY` 기반 텍스트 렌더로 통일

## 회귀 방지 QA
- 스크립트:
  - `scripts/qa/check-topbar-header-structure.cts`
- NPM 명령:
  - `npm run qa:topbar:header-structure`

## 기대 효과
- 상단바 문구 수정 시 다중 파일을 뒤지지 않고 `topBar.copy.ts`만 보면 됩니다.
- 뷰 컴포넌트는 표시/이벤트에 집중하고, 레이아웃 계산은 훅 계층으로 분리됩니다.
