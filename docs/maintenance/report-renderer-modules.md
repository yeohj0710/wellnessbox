# Report Renderer 메모

## 목적

- `components/b2b/ReportRenderer.tsx`의 책임을 줄여서 후속 에이전트가 수정 지점을 바로 찾게 합니다.
- 컨테이너 측정, issue overlay 계산, 레이아웃 노드 렌더링을 분리합니다.

## 현재 구조

- 메인 조립: `components/b2b/ReportRenderer.tsx`
- 컨테이너 폭/mm 환산 측정 hook: `components/b2b/report-renderer/use-container-metrics.ts`
- issue 박스 계산, 노드 렌더링 helper: `components/b2b/report-renderer/render-utils.tsx`
- 외부 props/type: `components/b2b/report-renderer/types.ts`

## 수정 기준

- 전체 페이지 배치, print 스타일, scale 계산 변경
  `ReportRenderer.tsx`
- 디버그 overlay 색상/라벨/issue box 규칙 변경
  `render-utils.tsx`
- ResizeObserver 기반 측정 로직 변경
  `use-container-metrics.ts`

## 다음 후보

- `components/b2b/ReportSummaryCards.tsx`
- `lib/b2b/public-survey.ts`

현재 `ReportRenderer`는 레이아웃 조립 중심 파일로 정리됐고, 다음 큰 핫스팟은 실제 리포트 콘텐츠 계산과 설문 도메인 로직입니다.
