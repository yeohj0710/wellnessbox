# Public Survey Modules

## 목적

- `lib/b2b/public-survey.ts`를 후속 작업 시 빠르게 읽을 수 있게 책임 단위로 분리합니다.
- 응답 값 정규화/검증 로직과 설문 흐름 조립 로직의 수정 지점을 나눕니다.

## 현재 구조

- 공개 설문 흐름 조립, 선택 섹션 판정, 질문 리스트/분석 입력 생성:
  `lib/b2b/public-survey.ts`
- 응답 값 정규화, multi/group answer 처리, 검증:
  `lib/b2b/public-survey-answer-utils.ts`
- C27 선택 섹션 정책 SSOT:
  `lib/b2b/survey-section-resolver.ts`

## 수정 기준

- 입력값을 어떻게 문자열/배열/group 값으로 해석할지 변경:
  `lib/b2b/public-survey-answer-utils.ts`
- multi 선택 토글, 기타 입력값, validation 메시지 변경:
  `lib/b2b/public-survey-answer-utils.ts`
- 표시 대상 질문 목록, visible question pruning, 분석 입력 조립 변경:
  `lib/b2b/public-survey.ts`
- C27 선택 섹션 우선순위 정책 변경:
  `lib/b2b/survey-section-resolver.ts`

## 메모

- 외부 import는 계속 `lib/b2b/public-survey.ts`를 기준으로 유지합니다.
- `public-survey-answer-utils.ts`는 순수 함수만 두고, 템플릿 전체 순회나 분석 입력 조립은 넣지 않습니다.
- 설문 저장/동기화 이슈를 볼 때는 `public-survey.ts`와 `survey-section-resolver.ts`를 같이 확인하는 것이 가장 빠릅니다.
