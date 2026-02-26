# Report Summary 모듈 가이드

`components/b2b/ReportSummaryCards.tsx`와 B2B 리포트 요약 UI에서 사용하는 계산/가공 로직의 책임 분리 문서입니다.

## 파일 역할

- `helpers.ts`
  - 점수/톤/포맷 공통 유틸
  - 여러 리포트 컴포넌트에서 재사용 가능한 순수 함수
- `view-model.ts`
  - 관리자용 요약 리포트의 데이터 가공(view model) 전담
  - 차트/요약 카드에 바로 주입 가능한 구조 생성
- `card-insights.ts`
  - `ReportSummaryCards` 전용 문장 가공/리스크 라인 구성/지표 인사이트 생성
  - 렌더링 로직과 텍스트 가공 로직 분리를 통해 본 컴포넌트 복잡도 완화

## 수정 가이드

- UI 문구 톤/문장 변환 규칙 수정: `card-insights.ts`
- 점수/뱃지/상태 색상 규칙 수정: `helpers.ts`
- 관리자 요약 카드 구성/데이터 집계 수정: `view-model.ts`

## 최소 검증

- `npm run audit:encoding`
- `npm run lint`
- `npx next build`
