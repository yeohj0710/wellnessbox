# B2B 건강 리포트 점수 엔진 가이드

## 목적
- 데이터가 일부/전체 누락되어도 리포트가 깨지지 않도록 점수 산출을 안정적으로 유지합니다.
- 향후 점수 산출식을 교체할 때, 엔진 코드를 크게 건드리지 않고 규칙 파일만 바꾸도록 구조를 분리합니다.

## 핵심 파일
- 점수 엔진: `lib/b2b/report-score-engine.ts`
- 점수 규칙 프로파일: `lib/b2b/report-score-profile.ts`
- payload 조립(엔진 호출): `lib/b2b/report-payload.ts`

## 현재 구조
1. `report-payload.ts`에서 원본 데이터(설문/검진/복약/분석요약)를 모아 `resolveReportScores(...)`를 호출합니다.
2. `report-score-engine.ts`는 아래 우선순위로 점수를 산출합니다.
   - 1순위: 분석 요약 점수(`analysisSummary.*Score`)
   - 2순위: 원천 데이터 기반 추정값
   - 3순위: 데이터 부족 시 `missing` 상태
3. `report-score-profile.ts`는 가중치/상태 점수/위험도 구간을 관리합니다.

## 무데이터/예외 처리 원칙
- 점수가 계산 불가능하면 `value: null`, `status: "missing"`으로 반환합니다.
- 전체 점수(`overall`)는 구성 점수(설문/검진/복약) 중 계산 가능한 항목만 가중 평균합니다.
- 구성 점수가 전부 없으면 전체 점수도 `missing`으로 반환합니다.
- 위험도(`riskLevel`)는
  - 분석 요약 위험도가 있으면 그 값을 우선 사용
  - 없으면 전체 점수 기준으로 `report-score-profile.ts`의 `riskBands`를 적용

## 커스터마이징 방법
### 1) 가중치 변경
- 파일: `lib/b2b/report-score-profile.ts`
- 대상: `DEFAULT_REPORT_SCORE_PROFILE.weights`

### 2) 검진 상태별 점수 변경
- 파일: `lib/b2b/report-score-profile.ts`
- 대상: `healthMetricStatusScores`, `healthMetricFallbackScore`

### 3) 복약 상태 점수 변경
- 파일: `lib/b2b/report-score-profile.ts`
- 대상: `medicationScores`

### 4) 위험도 구간 변경
- 파일: `lib/b2b/report-score-profile.ts`
- 대상: `riskBands` (높은 점수 구간부터 평가됨)

## 새 점수 모델 도입 가이드
1. `report-score-profile.ts`에 새 프로파일을 추가합니다.
2. `resolveReportScores(input, profile)`의 2번째 인자로 주입합니다.
3. 기존 UI는 `summary` + `details`를 그대로 사용하므로 화면 코드 변경을 최소화할 수 있습니다.

## 변경 시 체크리스트
- `npm run audit:encoding`
- `npm run qa:b2b:score-engine`
- `npm run lint`
- `npm run build`
- `/employee-report`와 `/admin/b2b-reports`에서 점수 카드/위험도/사유 문구 정상 표시 확인
