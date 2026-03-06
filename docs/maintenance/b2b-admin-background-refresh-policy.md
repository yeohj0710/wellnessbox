# B2B 관리자 배경 새로고침 정책

`/admin/b2b-reports`에서 포커스 복귀/탭 전환 시 발생하는 불필요 재로딩을 줄이기 위한 운영 기준입니다.

## 목적

- 설문/코멘트 입력 중 의도치 않은 재로딩으로 draft가 덮어써지는 위험을 줄인다.
- 포커스 복귀 시 최신 데이터 동기화는 유지하되, 사용자 상호작용 직후에는 자동 갱신을 지연한다.

## 기준 로직

- 구현 위치: `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-background-refresh.ts`
- 기본 제한:
1. 최소 새로고침 간격: `15초`
2. 최근 상호작용 보호 구간: `8초`
- 상호작용 이벤트:
1. `pointerdown`
2. `keydown`
3. `input`
4. `compositionstart`
- 아래 조건에서는 배경 새로고침을 수행하지 않음:
1. `busy === true`
2. `isDetailLoading === true`
3. `hasUnsavedDraft === true`
4. 이미 배경 새로고침 요청이 진행 중일 때

## 회귀 방지 QA

```bash
npm run qa:b2b:admin-background-refresh
```

검사 항목:
1. `B2bAdminReportClient`가 인라인 포커스/가시성 이벤트 리스너를 직접 두지 않는지
2. 배경 새로고침 훅 사용 여부
3. 기본 간격(15초) 및 상호작용 보호 구간(8초) 유지 여부

## 변경 시 체크리스트

1. 자동 새로고침 간격을 변경했다면 운영 문서와 QA 스크립트를 같이 갱신했는가
2. `hasUnsavedDraft` 가드가 유지되는가
3. `npm run lint`, `npm run build`를 통과하는가
