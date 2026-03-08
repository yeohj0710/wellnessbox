# 관리자 상품 화면 모듈 메모

## 목적

- 관리자 상품 운영 화면의 탐색 비용을 낮춥니다.
- 상태 전이와 서버 호출, 정렬/검색 helper, 모달 UI 섹션의 책임을 분리합니다.
- 다음 세션의 코딩 에이전트가 수정 지점을 바로 찾을 수 있게 합니다.

## ProductManager 구조

- 메인 상태/액션 조립: `components/manager/productManager.tsx`
- 상품 타입/정렬/검색 helper: `components/manager/productManager.types.ts`
- 상품 모달/카드 UI 섹션: `components/manager/productManager.sections.tsx`
- 공통 관리자 UI 프리미티브: `components/manager/managerWorkspace.tsx`

## PharmacyProductManager 구조

- 메인 상태/액션 조립: `components/manager/pharmacyProductManager.tsx`
- 약국 상품 타입/정렬/검색 helper: `components/manager/pharmacyProductManager.types.ts`
- 약국 상품 모달/카드 UI 섹션: `components/manager/pharmacyProductManager.sections.tsx`
- 공통 관리자 UI 프리미티브: `components/manager/managerWorkspace.tsx`

## CategoryManager 구조

- 메인 상태/액션 조립: `components/manager/categoryManager.tsx`
- 카테고리 타입/정렬/검색 helper: `components/manager/categoryManager.types.ts`
- 카테고리 모달/카드 UI 섹션: `components/manager/categoryManager.sections.tsx`
- 공통 관리자 UI 프리미티브: `components/manager/managerWorkspace.tsx`

## 수정 기준

- 정렬/검색 규칙 변경
  `*.types.ts`
- 모달 필드 구성, 카드 표시 방식, 미리보기 UI 변경
  `*.sections.tsx`
- API 호출 순서, 제출/삭제 흐름, 상태 초기화 로직 변경
  각 매니저의 메인 `*.tsx`
- 공통 관리자 버튼/카드/모달 스타일 변경
  `managerWorkspace.tsx`

## 현재 분리 원칙

- 메인 파일은 상태와 서버 호출, 이벤트 흐름만 남깁니다.
- 반복되는 렌더링 블록과 큰 모달 섹션은 별도 UI 파일로 분리합니다.
- 정렬/검색처럼 순수 계산은 helper 파일로 이동합니다.

## 다음 후보

- `components/manager/managerWorkspace.tsx`
- `app/survey/survey-page-client.tsx`

관리자 상품/약국상품/카테고리 화면은 같은 분해 패턴을 적용해 정리했습니다. 다음 후보는 공통 UI 프리미티브 자체를 더 쪼개거나, 설문 클라이언트처럼 실제 기능 밀도가 높은 대형 파일입니다.
