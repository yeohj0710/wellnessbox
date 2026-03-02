# B2B 건강 설문 데이터 가이드 (최신)

이 폴더는 B2B 건강 설문/리포트의 기준 데이터입니다.

- 공통 설문: `survey.common.json` (`C01`~`C27`)
- 상세 설문: `survey.sections.json` (`S01`~`S24`)
- 리포트 문구: `report.texts.json`
- 점수 규칙: `scoring.rules.json`

최신 반영 기준:

- `웰니스박스 건강 설문지_2603021901.docx`
- `웰니스박스 건강 설문지_2603021901.pdf`
- 반영 버전: `1.1.0`

## 상세 운영 문서

- 시스템/로직 상세: `data/b2b/B2B_SURVEY_SYSTEM_GUIDE.md`
- 테스트 매트릭스: `data/b2b/B2B_SURVEY_TEST_MATRIX.md`

새 세션에서 B2B 설문/리포트 작업을 시작할 때는 위 두 문서를 먼저 확인하세요.

## 진행 흐름

1. 공통 설문 `C01`~`C27` 작성
2. `C27`에서 선택한 분야(최대 4~5개)에 해당하는 상세 설문 작성
3. 점수 산출
4. 리포트 생성

## 점수 규칙 요약

- 모든 선택지 점수는 `0~1`
- 점수가 높을수록 위험도/관리 필요도 높음
- 생활습관 위험도: 공통 `C10`~`C26` 기반
- 건강관리 필요도: 선택된 상세 섹션(`S01`~`S24`) 평균
- 최종 건강점수:
  - `healthScore = 100 - ((lifestyleRiskPercent + healthNeedAveragePercent) / 2)`

세부 계산식은 `scoring.rules.json`을 기준으로 합니다.

## 최신 설문 반영 시 핵심 변경 사항

### 공통 설문

- 문항 문구를 최신 원문으로 전면 동기화
- `C05`~`C08`:
  - `있음:` 항목 목록을 최신 원문 기준으로 갱신
  - `없음` 옵션 유지
- `C09`:
  - 최신 원문 순서로 갱신
  - `없음` 옵션 제거 (원문 기준)
  - 원문 표기 `호홉기` 반영
- `C21`:
  - 보기 문구를 최신 원문 기준으로 갱신
- `C27`:
  - 최신 원문 순서로 갱신
  - 최대 선택 5개 유지
  - 원문 표기 `호홉기` 반영
  - `호홉기`는 내부적으로 `S24`(호흡기)와 매핑되도록 alias 유지

### 상세 설문

- `S01`~`S24` 모든 문항의 질문/보기 문구를 최신 원문으로 동기화
- 섹션 타이틀을 최신 목차 표기와 일치하도록 갱신
  - 예: `구강·치아`, `콜레스테롤, 중성지방`, `관절, 뼈`
- `S02_Q07`:
  - `없음` 보기 포함(최신 원문 기준)
- `S21_Q03`~`S21_Q07`:
  - 보기 체계를 최신 원문 기준 5개로 통일
  - (`0번`, `1번`, `1~2번`, `3~4번`, `5번`)
  - 구형 `2~3번` variant 옵션 제거

### 리포트 문구

- `report.texts.json` 내 섹션 제목(`title`)을 최신 섹션 제목과 일치하도록 동기화

## 데이터 수정 시 주의사항

1. `survey.common.json`의 `C27` 라벨/alias와 `Sxx` 매핑을 깨지 않도록 유지
2. 선택지 문구 변경 시 score 값(0~1)이 의도대로 유지되는지 확인
3. `report.texts.json`의 `sectionAnalysisAdvice`, `supplementDesignTextBySectionId` 키(`S01`~`S24`)와 제목 정합성 유지
4. 파일 인코딩은 UTF-8, 줄바꿈은 LF 유지

## 권장 검증

변경 후 최소 아래를 수행하세요.

1. `npm run audit:encoding`
2. `npm run qa:b2b:survey-readiness`
3. `npm run lint`
4. `npm run qa:b2b:score-engine`
5. `npm run qa:b2b:wellness-scoring`
6. `npm run qa:b2b:export-smoke`
