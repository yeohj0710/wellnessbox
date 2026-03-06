# TopBar 반응형 모드 기준 가이드

`components/common/topBar.header.tsx`의 데스크톱/드로어 전환 기준을 정리한 문서입니다.

## 전환 원칙

1. 뷰포트가 `1024px` 미만이면 드로어 모드로 전환합니다.
2. 데스크톱 폭에서도 아래 조건 중 하나라도 만족하면 드로어 모드로 전환합니다.
   - 네비게이션 필요 폭(`nav.scrollWidth`)이 사용 가능 폭을 초과하는 경우
   - 헤더 한 줄 컨테이너(`row`)가 가로 오버플로우되는 경우

## 소스 오브 트루스

- 레이아웃 판단 순수 함수: `components/common/topBar.layout.ts`
- 실제 헤더 적용: `components/common/topBar.header.tsx`

## 핵심 상수

- `desktopMenuMinViewport = 1024`
- `leftGroupGapPx = 24`
- `layoutSafetyPx = 20`
- `widthEpsilonPx = 2`

`layoutSafetyPx`는 경계값에서 폰트/자간 변화로 줄바꿈이 발생하는 상황을 방지하기 위한 여유 폭입니다.

## 검증 방법

1. 순수 함수 정책 검증

```bash
npm run qa:topbar:layout-mode
```

2. 실제 브라우저 반응형 검증

```bash
npm run qa:topbar:responsive
```

## 회귀 체크 포인트

- 1024~1280px 구간에서 불필요한 데스크톱 강제 노출이 없어야 함
- 1366px 이상에서 공간이 충분할 때 데스크톱 모드로 전환되어야 함
- 데스크톱 모드에서 `overflowing` 또는 `wrapped`가 `true`면 실패로 간주

