# 핫스팟 리팩토링 로드맵 (운영 기준)

후속 세션에서 빠르게 작업 우선순위를 잡을 수 있도록, 함수 핫스팟과 분해 단위를 정리합니다.

기준 파일: `C:/dev/wellnessbox-rnd/docs/legacy_from_wellnessbox/agents/FUNCTION_HOTSPOTS.md`

## 현재 우선순위 (UI/업무 영향도 기준)

1. `app/survey/survey-page-client.tsx` (`SurveyPageClient`, 1800+ lines)
2. `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
3. `app/(features)/employee-report/EmployeeReportClient.tsx`
4. `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`

## 이미 적용된 분해 패턴

- TopBar 반응형 판단 로직 분리:
  - `components/common/topBar.layout.ts`
- 관리자 설문 편집 내비게이션 훅 분리:
  - `app/(admin)/admin/b2b-reports/_lib/use-survey-editor-navigation.ts`
- 공개 설문 자동 계산/중복 매핑/ID 정규화 로직 분리:
  - `app/survey/_lib/survey-page-auto-compute.ts`
- 공개 설문 섹션 이동/포커스/스크롤 로직 훅 분리:
  - `app/survey/_lib/use-survey-section-navigation.ts`
- 관리자 B2B 리포트 배경 새로고침 안정화 훅 분리:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-background-refresh.ts`
- 임직원 레포트 상태 전이(관리자 차단/리포트 미존재/동기화 가이드) 공통 훅 분리:
  - `app/(features)/employee-report/_lib/use-employee-report-state-actions.ts`
- 임직원 데이터 운영 콘솔 busy/알림 공통 액션 훅 분리:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-busy-action.ts`
- 임직원 데이터 운영 콘솔 폼 상태/입력 정규화/저장 payload 빌더 훅 분리:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-forms.ts`
- 임직원 데이터 운영 콘솔 액션 핸들러(검색/생성/초기화/삭제) 훅 분리:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-actions.ts`

## 권장 분해 단위 (공통)

1. `data shaping`: API/템플릿 -> 렌더링 모델 변환
2. `navigation state`: 섹션 이동, 포커스 이동, 자동 스크롤
3. `mutation handlers`: onChange/onSave/onSync
4. `render sections`: 카드/패널 단위 컴포넌트 분리

## 주의사항

- 설문 로직은 항상 `lib/b2b/public-survey.ts`를 기준으로 유지한다.
- `/survey`와 `/admin/b2b-reports`는 공통 유효성/선택 규칙이 깨지지 않도록 QA를 먼저 보강 후 리팩토링한다.
- 문자열/복사 문구 수정은 한국어 기준(`ko-KR`)을 기본으로 한다.

## 리팩토링 완료 체크리스트

1. `npm run audit:encoding`
2. `npm run qa:b2b:survey-structure`
3. `npm run qa:b2b:admin-background-refresh`
4. `npm run qa:employee-report:state-actions`
5. `npm run qa:b2b:employee-data-busy-action`
6. `npm run qa:b2b:employee-data-forms`
7. `npm run qa:b2b:employee-data-actions`
8. `npm run qa:b2b:survey-sync-core`
9. `npm run lint`
10. `npm run build`
