# My-Data Client Map

## 목적
- `/my-data` 후속 작업 시 데이터 로딩 경계와 섹션 렌더링 경계를 빠르게 분리해서 읽을 수 있게 합니다.
- 섹션별 UI 수정이 한 파일에 다시 몰리지 않도록 안정적인 export surface와 실제 소유 파일을 구분합니다.

## 진입 순서
- route composition: `app/my-data/page.tsx`
- 데이터 로딩: `app/my-data/myDataPageData.ts`
- 안정적 export surface: `app/my-data/myDataPageSections.tsx`
- 섹션 모듈:
  - `app/my-data/myDataPageOverviewSections.tsx`
  - `app/my-data/myDataPageOrderSection.tsx`
  - `app/my-data/myDataPageResultSections.tsx`
  - `app/my-data/myDataPageChatSection.tsx`
- 공통 레이블/배지 문구: `app/my-data/myDataPageLabels.ts`
- 공통 렌더링 primitives: `app/my-data/myDataPagePrimitives.tsx`

## 경계
- `page.tsx`
  - actor context 확인
  - collections 로딩
  - 마지막 활동 시각 계산
  - 섹션 조합
- `myDataPageSections.tsx`
  - 외부 import 호환성 유지용 re-export surface
- `myDataPageOverviewSections.tsx`
  - 잠금 안내
  - 헤더/배지
  - 요약 metric 카드
  - 계정 정보/세션 프로필
- `myDataPageOrderSection.tsx`
  - 주문 아코디언
  - 주문 상품 목록
- `myDataPageResultSections.tsx`
  - 정밀 검사
  - 빠른 검사
- `myDataPageChatSection.tsx`
  - 상담 세션 아코디언
  - 메시지 role/scope/status 표시

## 수정 순서 가이드
1. 데이터 조회/정렬/병합 문제:
   - `myDataPageData.ts` -> `page.tsx`
2. 배지/라벨 문구 문제:
   - `myDataPageLabels.ts`
3. 특정 섹션 UI 문제:
   - 해당 섹션 모듈만 수정
4. 공통 카드/아코디언 프레임 문제:
   - `myDataPagePrimitives.tsx`

## 빠른 검증
- `npm run qa:my-data:section-modules`
- `npm run qa:my-data:copy-localization`
- `npm run lint`
- `npm run build`
