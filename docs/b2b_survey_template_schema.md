# B2B 설문 템플릿/점수화/버전 운영 규칙

## 목표

설문 문항이 바뀌어도:

- 과거 응답이 깨지지 않고
- 레포트 포맷은 동일하게 유지되며
- 월별 추이(점수/지표)가 이어지도록 한다.

## 핵심 원칙

- 코드 하드코딩 금지: 섹션/문항/선택지/점수는 템플릿 데이터가 소스 오브 트루스
- published 템플릿 immutable: 수정 금지, 변경은 v2 생성
- 응답 저장은 templateId + questionId 기반
- 레포트/추이는 원본 응답이 아니라 ComputedMetrics(표준 지표)로 표현

## 표준 지표 스키마(레포트 포맷 통일용)

v1/v2가 달라도 레포트 포맷을 동일하게 유지하려면, 아래 표준 지표로 변환한다.

- overallScore: 0~100
- sectionScores: { S01: 72, S02: 55, ... }
- topIssues: [{ key:"S02", label:"수면, 피로", score:55, evidence:["..."] }, ...]
- flags: { highBP:true, highGlucose:false, ... }
- trend: 최근 3~6개월 sectionScores/overallScore 배열
- guidance: { summary:"...", actions:["...","..."] }

## 템플릿 JSON(권장 구조)

- templateKey, version, status(draft/published/archived)
- sections:
  - id: "COMMON" | "S01".."S24"
  - displayName, description
  - questions:
    - id(안정키): "C01", "C27", "S01_Q01"...
    - prompt: 문항 텍스트
    - type: single/multi/number/text
    - required
    - options:
      - id, label, score(답지 점수)
- q27Mapping:
  - q27OptionId -> sectionId
  - maxSelected = 5

## 월별 누적

- SurveyResponse는 periodKey(YYYY-MM) 필수
- ComputedMetrics는 매달 저장하여 추이 표시

## 운영 UX 요구

- 섹션 선택은 한글명 칩/체크박스로, 최대 5개 제한/경고/현재선택 표시
- 완료율/필수문항 완료율/마지막 저장시각 표시
- “없음/모름” 단축 입력 제공
