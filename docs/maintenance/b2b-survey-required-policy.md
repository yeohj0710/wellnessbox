# B2B 설문 `필수/선택` 정책 가이드

이 문서는 `/survey`와 `/admin/b2b-reports`의 문항 필수 여부가 왜/어디서 결정되는지 빠르게 파악하기 위한 운영 가이드입니다.

## 소스 오브 트루스

- 템플릿 로더 진입점: `lib/wellness/data-loader.ts`
- 공통 문항 매핑: `lib/wellness/data-loader-template.common.ts`
- 세부 섹션 매핑: `lib/wellness/data-loader-template.sections.ts`
- 공통 필수 판정 함수: `lib/wellness/data-loader-template.shared.ts:resolveTemplateQuestionRequired`
- 응답 검증(저장 전): `lib/b2b/public-survey.ts:validateSurveyQuestionAnswer`

즉, 필수/선택 정책을 바꿀 때는 **shared 판정 함수 + QA 스크립트**를 같이 수정하는 것이 원칙입니다.

## 현재 정책

### 공통 문항(`common`)

- 기본값: `필수`
- 예외(자동 `선택`):
  - 데이터에서 `required: false` 명시
  - `displayIf` 조건 문항
  - 조건부 안내 문구(예: 여성/남성의 경우, 해당 사항이 없으면 다음으로 이동) 감지
  - `없음/해당 없음`류 옵션 제거로 선택 생략이 가능한 케이스
  - `multi_select_*` 타입

### 세부 섹션 문항(`sections`)

- 기본값: `선택`
- 예외(자동 `필수`):
  - 데이터에서 `required: true`를 명시한 경우만 필수

## 운영 시 주의사항

- DB 템플릿은 `ensureActiveB2bSurveyTemplate`에서 파일 템플릿과 동기화됩니다.
- 로컬/배포에서 캐시된 템플릿이 남아 보이면 앱 재시작 후 재확인합니다.
- `/survey`와 관리자 설문은 동일 템플릿 로더를 사용하므로 정책은 동시에 반영됩니다.

## 변경 후 필수 검증 명령

1. `npm run qa:b2b:survey-required`
2. `npm run qa:b2b:admin-survey-sync`
3. `npm run lint`
4. `npm run build`
5. `npm run audit:encoding`

## 빠른 점검 체크리스트

- [ ] 공통 필수 문항(`C01~`)이 의도대로 유지되는가
- [ ] 조건부 문항(여성/남성/해당 시 선택)이 선택으로 보이는가
- [ ] 세부 섹션 문항이 기본 선택으로 노출되는가
- [ ] `/survey`, `/admin/b2b-reports`에서 라벨(`필수/선택`)이 동일한가
