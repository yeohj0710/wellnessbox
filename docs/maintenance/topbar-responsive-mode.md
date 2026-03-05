# TopBar 반응형 모드 기준 가이드

`components/common/topBar.header.tsx`의 데스크톱/드로어 전환 기준을 정리한 문서입니다.

## 전환 원칙

1. 뷰포트가 `1024px` 미만이면 무조건 드로어 모드입니다.
2. 데스크톱 폭에서도, 아래 조건 중 하나라도 만족하면 드로어 모드로 전환합니다.
   - 네비게이션 필요 폭(`nav.scrollWidth`)이 사용 가능 폭을 넘는 경우
   - 헤더 한 줄 영역(`row`)이 가로로 넘치는 경우

## 핵심 상수

- `DESKTOP_MENU_MIN_VIEWPORT = 1024`
- `LEFT_GROUP_GAP_PX = 24`
- `LAYOUT_SAFETY_PX = 20`
- `WIDTH_EPSILON_PX = 2`

`LAYOUT_SAFETY_PX`는 경계값에서 텍스트/폰트 변동으로 줄바꿈이 발생하는 것을 방지하기 위한 여유 폭입니다.

## 검증 방법

아래 명령으로 주요 해상도에서 모드 전환/오버플로우를 자동 점검합니다.

```bash
npm run qa:topbar:responsive
```

검증 스크립트: `scripts/qa/topbar-responsive-check.cjs`

## 회귀 체크 포인트

- 1024~1280px: 드로어 모드 유지
- 1366px 이상: 데스크톱 모드 전환
- 데스크톱 모드에서 `overflowing` 또는 `wrapped`가 `true`이면 실패 처리

