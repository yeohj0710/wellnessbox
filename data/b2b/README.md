# 웰니스 설문/레포트 데이터 패키지 (JSON)

이 폴더는 **웰니스 설문지(공통+상세)**와 **점수화 규칙**, **레포트에 삽입할 문구(영역별 코멘트/루틴/맞춤 영양제 문구)**를
Next.js(예: Vercel) 프로젝트에서 그대로 불러다 쓰기 좋은 형태(JSON)로 정리한 데이터입니다.

- 공통 질문지(1~27): **생활습관 위험도** 계산에 사용
- 상세 질문지(S01~S24): 공통 27번에서 사용자가 고른 영역(최대 4~5개)의 답변으로 **건강관리 필요도** 계산에 사용
- 위 2개 점수를 이용해 최종 **건강점수** 계산
- 레포트 문구:
  - 상세 설문(영역별) 문구: **해당 문항 점수가 0.5 이상**이면 문구 출력
  - 공통 설문(생활습관 추천 루틴) 문구: **1점 문항**이 있으면 그 문항 문구 출력, **1점이 없으면 0.5점 문항** 문구 출력
  - “OOO님을 위한 맞춤 영양제 설계” 문구: 영역 점수 높은 순으로 출력(상위 N개 등 UI 정책은 서비스에서 결정)

---

## 1) 파일 구성

### 1. `survey.common.json`

공통 질문지(1~27)를 정의합니다.

- **비점수 문항(1~9, 27)**: 인적/기초 정보, 기저질환/가족력/알러지/복용약/복용 중 건기식, 개선 희망 영역 선택
- **점수 문항(10~26)**: 생활습관 위험도 계산에 사용 (각 선택지에 0~1 점수 포함)

### 2. `survey.sections.json`

상세 질문지(S01~S24)를 정의합니다.  
각 섹션은 공통 27번에서 선택되는 “영역”이며, 섹션 내부 문항은 **모두 0~1 점수(관리 필요도/위험도)**를 가집니다.

- 섹션 ID: `S01` ~ `S24`
- 섹션 문항 ID: 예) `S07_Q03` (S07의 3번 문항)

### 3. `report.texts.json`

레포트에 출력할 문구(문장/문단)를 모은 파일입니다.

- `sectionAnalysisAdvice`: **상세 섹션(S01~S24)별** 문항 코멘트(문항번호 → 문구)
- `lifestyleRoutineAdviceByCommonQuestionNumber`: **공통(10~26) 문항번호 → 생활습관 루틴 문구**
- `supplementDesignTextBySectionId`: **영역(S01~S24)별 맞춤 영양제 설계 문구(문단 배열)**

### 4. `scoring.rules.json`

점수 계산(스코어링)과 레포트 문구 출력 조건을 정의합니다.

- 생활습관 위험도(공통 10~26)
- 건강관리 필요도(선택한 상세 섹션)
- 최종 건강점수(100점 만점)
- 레포트 출력 로직(문항 점수 기준)

---

## 2) 데이터 모델(요약)

### 공통 질문(`survey.common.json`)

각 질문은 아래 형태를 가집니다.

- `id`: `C01` ~ `C27`
- `number`: 설문지 번호
- `prompt`: 질문 텍스트
- `type`:
  - `single_choice`: 단일 선택(라디오)
  - `multi_select_with_none`: 다중 선택 + “없음(배타)” 옵션
  - `multi_select_limited`: 다중 선택 + 최대 선택 개수 제한
  - `number`: 숫자 입력
  - `group`: 여러 입력 필드(키/몸무게) 묶음
- 점수 문항인 경우:
  - `scoring.enabled: true`
  - `options[].score`: 0~1 (높을수록 안 좋음)

### 상세 섹션(`survey.sections.json`)

각 섹션은:

- `id`: `S01`~`S24`
- `title`: 영역명
- `questions[]`: 섹션 문항
  - `id`: `Sxx_Qyy`
  - `number`: 섹션 내 문항 번호(1부터)
  - `prompt`
  - `options[]`: 선택지(각각 score 포함)
  - `optionsPrefix`: 보기 앞에 붙는 안내(예: “5번 중”)

---

## 3) 설문 진행 방식(문서 기준)

1. 사용자는 **공통 질문지(1~27)**를 모두 작성
2. 공통 27번에서 “개선하고 싶거나 불편한 증상(영역)”을 **최대 4~5개 선택**
3. 선택한 영역에 해당하는 **상세 질문지(S01~S24 중 일부)**를 추가 작성
4. 점수 산출 및 레포트 생성

---

## 4) 점수화 규칙(핵심)

> 모든 점수는 **0~1 범위**이며, **점수가 높을수록 안 좋음(위험도/관리 필요도 ↑)** 입니다.

### 4.1 생활습관 위험도 (공통 질문지 기반)

`scoring.rules.json → lifestyleRisk`를 따릅니다.

영역(4축)과 문항 구성:

- **식습관**: C10~C18 (9문항) → `식습관점수 = (C10..C18 점수 합) / 9`
- **면역관리**: C19~C22 (4문항) → `면역관리점수 = (C19..C22 합) / 4`
- **수면**: C23 + C26 (2문항) → `수면점수 = (C23 + C26) / 2`
- **활동량**: C24 + C25 (2문항) → `활동량점수 = (C24 + C25) / 2`

표현(레포트 UI):

- 위 4개 값을 **레이더/스탯(다이아몬드 형태)**로 시각화 가능
- 값이 높을수록 해당 축의 생활습관 위험이 큼

> 문서에 “생활습관 위험도 점수”의 **전체 합산 방식**이 명확히 적혀있지 않아, 본 패키지에서는
> 기본값으로 **4개 축 점수를 동일 가중 평균**하여 전체 생활습관 위험도(Overall)를 계산하도록 두었습니다.  
> (필요 시 서비스 정책에 맞게 전체 합산식을 변경할 수 있도록 `scoring.rules.json`에 분리해 둠)

- `lifestyleRiskOverallNormalized = avg(식습관, 면역관리, 수면, 활동량)`
- `lifestyleRiskPercent = lifestyleRiskOverallNormalized * 100`

### 4.2 건강관리 필요도 (상세 질문지 기반)

`scoring.rules.json → healthManagementNeed`를 따릅니다.

- 사용자가 선택한 섹션(4~5개)에 대해,
- 각 섹션 점수는:
  - `sectionNeedNormalized = (섹션 문항 점수 합) / (섹션 총 문항 수)`
  - `sectionNeedPercent = sectionNeedNormalized * 100`
- 전체 평균:
  - `healthNeedAverageNormalized = avg(선택한 섹션들의 sectionNeedNormalized)`
  - `healthNeedAveragePercent = healthNeedAverageNormalized * 100`

### 4.3 최종 건강점수 (0~100, 높을수록 좋음)

문서 공식:

- `healthScore = 100 - ((생활습관 위험도 점수 + 건강관리 필요도 평균) / 2)`

본 패키지 기본 구현(권장):

- `healthScore = 100 - ((lifestyleRiskPercent + healthNeedAveragePercent) / 2)`
- 결과는 `0~100`으로 clamp 권장

---

## 5) 레포트 문구 출력 규칙

### 5.1 “종합 건강 분석”(상세 설문 기반)

- `report.texts.json → sectionAnalysisAdvice`
- **조건**: 상세 설문 문항 중 **점수 ≥ 0.5**인 문항만 문구를 출력
- 출력 방법 예시:
  - 선택한 섹션별로, 해당 섹션의 문항들 중 조건을 만족하는 항목을 찾아
  - `sectionAnalysisAdvice[Sxx].adviceByQuestionNumber["문항번호"]`를 출력

### 5.2 “생활 습관 추천 루틴”(공통 설문 기반)

- `report.texts.json → lifestyleRoutineAdviceByCommonQuestionNumber`
- **조건**:
  1. 공통 10~26 중 **1점**인 문항이 있으면 → 그 문항들의 문구를 출력
  2. **1점 문항이 하나도 없으면** → **0.5점 문항**들의 문구를 출력
- (서비스 정책에 따라) 출력 개수 제한이 필요하면 상위 N개만 노출하도록 조정 가능

### 5.3 “OOO님을 위한 맞춤 영양제 설계”

- `report.texts.json → supplementDesignTextBySectionId`
- 문서에 “(점수 높은 순서대로)”라고 되어 있어,
  - 섹션 점수(건강관리 필요도)를 내림차순 정렬 후
  - 상위 N개 섹션의 문구를 출력하는 방식이 일반적입니다.
- N은 UI 정책에 맞게 설정(기본값 예: 5개, `scoring.rules.json → reportGeneration.supplementDesign.defaultTopN`)

---

## 6) 꼭 확인해야 하는 문서 간 불일치(중요)

### 6.1 S21(전립선) 3~7번 선택지 불일치

- **답지 PDF**에는 “5번 중 0/1/1~2/2~3/3~4/5번” **6개 선택지**가 존재합니다.
- **설문지 PDF(종이 양식)**에는 “2~3번” 선택지가 빠져 **5개 선택지**로 보입니다.

본 패키지의 기본 `survey.sections.json`은 **답지(점수체계) 기준**으로 6개 선택지를 제공합니다.  
다만, 종이 설문 응답을 그대로 입력해야 하는 경우를 위해
`S21_Q03`~`S21_Q07`에는 `variants.paperPdf_웰니스_설문지.pdf`로 **종이 설문 옵션 세트(5개)**도 함께 넣어두었습니다.

> 서비스 운영에서 종이 설문지를 계속 사용할 예정이라면,
> **종이 설문지 PDF를 답지와 동일하게 수정**(‘2~3번’ 선택지 추가)하는 것을 권장합니다.

### 6.2 공통 27번 “호흡기” 표기 오타

공통 27번 선택지에서 “호흡기”가 **‘호홉기’**로 표기되어 있습니다(설문지 PDF).  
데이터에서는 `labelPaper`에 원문(호홉기)을 보관하고, 기본 표시는 “호흡기 건강”으로 정규화했습니다.

---

## 7) 구현 팁(Next.js/TypeScript 예시)

```ts
import common from "./survey.common.json";
import sections from "./survey.sections.json";
import texts from "./report.texts.json";
import rules from "./scoring.rules.json";

// 1) 공통 10~26 점수 합산
function getOptionScore(question, selectedValue) {
  const opt = question.options.find((o) => o.value === selectedValue);
  return opt?.score ?? 0;
}

// 2) 생활습관 위험도(4축)
function calcLifestyleDomains(commonAnswers) {
  // commonAnswers: { [questionId]: selectedValue }
  const byId = Object.fromEntries(common.questions.map((q) => [q.id, q]));
  const sum = (ids: string[]) =>
    ids.reduce(
      (acc, id) => acc + getOptionScore(byId[id], commonAnswers[id]),
      0
    );

  const diet =
    sum(rules.lifestyleRisk.domains.find((d) => d.id === "diet").questionIds) /
    9;
  const immune =
    sum(
      rules.lifestyleRisk.domains.find((d) => d.id === "immuneManagement")
        .questionIds
    ) / 4;
  const sleep = sum(["C23", "C26"]) / 2;
  const activity = sum(["C24", "C25"]) / 2;

  return { diet, immune, sleep, activity };
}

// 3) 섹션 점수(건강관리 필요도)
function calcSectionNeed(section, sectionAnswers) {
  // sectionAnswers: { [questionId]: selectedValue }
  const sum = section.questions.reduce(
    (acc, q) => acc + getOptionScore(q, sectionAnswers[q.id]),
    0
  );
  return sum / section.questions.length; // 0~1
}
```
