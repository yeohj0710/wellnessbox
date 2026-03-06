# B2B 설문 동기화 런북

`/survey`와 `/admin/b2b-reports`의 설문 로직 동기화를 유지하기 위한 점검 기준입니다.

## 단일 소스 원칙

- 설문 응답 판정/유효성 검사: `lib/b2b/public-survey.ts`
- 설문 템플릿 정규화: `lib/b2b/survey-template.ts`
- 데이터 원본: `data/b2b/survey.common.json`, `data/b2b/survey.sections.json`

UI 레이어는 표시/포커스/내비게이션만 담당하고, 필수/선택/응답 가능 판정은 공통 로직을 우선 사용합니다.

## 핵심 점검 경로

- 일반 사용자 설문: `app/survey/*`
- 관리자 설문 편집: `app/(admin)/admin/b2b-reports/_components/*`
- 관리자 설문 API: `lib/b2b/admin-employee-survey-route.ts`

## 회귀 방지 QA

아래 명령 하나로 설문 동기화 핵심 회귀를 점검합니다.

```bash
npm run qa:b2b:survey-sync-core
```

구조 리팩토링 회귀(공개 설문 모듈 분리 상태) 점검:

```bash
npm run qa:b2b:survey-structure
```

관리자 입력 화면 자동 재로딩 안정화 점검:

```bash
npm run qa:b2b:admin-background-refresh
```

내부 실행 항목:

1. `qa:b2b:survey-required`
2. `qa:b2b:c27-deselection-sync`
3. `qa:b2b:admin-survey-sync`
4. `qa:b2b:employee-sync-guard`

## 장애 트리아지 순서

1. 템플릿 데이터(`data/b2b/*.json`)의 `required`, `displayIf`, `maxSelect` 확인
2. `lib/b2b/public-survey.ts`에서 해당 문항 키의 검증 분기 확인
3. `/survey`, `/admin/b2b-reports` UI에서 동일 문항 키가 같은 payload로 저장되는지 확인
4. `qa:b2b:survey-sync-core` 실행 후 실패 케이스부터 수정

## 변경 시 체크리스트

1. 필수/선택 문구를 바꿨다면 양쪽 라우트 모두 동일하게 반영했는가
2. C27 섹션 선택 해제 시 상세 문항 응답 삭제가 즉시 반영되는가
3. 단일 선택 자동 스크롤/포커스가 다중 선택 문항에는 적용되지 않는가
4. `npm run lint`, `npm run build`를 모두 통과하는가
