# NHIS Fetch Slim Runbook (Checkup 1 + Medication 3)

## Goal

- Always request low-cost targets only:
  - `checkupOverview` (검진 요약)
  - `medication` (투약 정보)
- Do not request high-cost targets in default flow:
  - `medical`, `healthAge`, `checkupList`, `checkupYearly`
- Shape normalized payload for `/health-link` to:
  - latest checkup batch only
  - latest medication 3 rows only

## External References

- Hyphen NHIS API page (product seq 79):
  - `https://hyphen.im/product-api/view?seq=79#product-api-specification`
- Hyphen free testbed notice (benefit seq 10):
  - `https://hyphen.im/benefit/view?seq=10`
  - Notice text says free test support started on **November 1, 2022** with **100/day + 100/month** test range.

## Implemented In Code

- `lib/server/hyphen/fetch-contract.ts`
  - default targets now include both `checkupOverview` + `medication`.
- `lib/server/hyphen/fetch-executor.ts`
  - summary fetch path executes:
    - one `checkupOverview` call
    - one `medication` call
  - removed multi-window medication probe fanout (single medication call).
- `lib/server/hyphen/normalize.ts`
  - trims normalized medication rows to latest 3.
  - trims checkup overview rows to latest checkup batch.

## Local Smoke Test (No External API Required)

- Command:
  - `npm run maintenance:nhis-smoke-fetch-slim`
- What it validates:
  - default target set is `["checkupOverview", "medication"]`
  - normalized medication list length is `3`
  - checkup overview is narrowed to latest batch

## Manual Testbed Verification (External)

1. Open Hyphen testbed and run linked NHIS auth flow.
2. In WellnessBox `/health-link`, run one summary fetch.
3. Validate response shape:
   - `data.normalized.checkup.overview` belongs to latest checkup batch only.
   - `data.normalized.medication.list.length <= 3`.
4. Validate call policy:
   - no call for `medical` target in default flow.
   - no call for `checkupList` / `checkupYearly` unless explicitly requested in high-cost mode.
5. Validate cache/cost behavior:
   - repeated same request should return cached response (`cached: true`) when available.
   - verify `cache.source` in fetch response.

## Recommended Validation Commands

- `npm run audit:encoding`
- `npm run maintenance:nhis-smoke-policy`
- `npm run maintenance:nhis-smoke-fetch-slim`
- `npm run maintenance:nhis-smoke-ai-summary`
- `npm run lint`
- `npm run build`

## B2B Preview/Export Manual Checks

1. `HYPHEN_MOCK_MODE=1` 설정 후 `/employee-report`에서 인증/동기화 수행
2. A4 미리보기 렌더 확인
   - `폭 맞춤` / `100% 크기` / `인쇄` 동작
   - 상단 `MOCK 데이터 사용 중` 배너 확인
3. `/admin/b2b-reports`에서 동일 임직원 선택 후 미리보기 비교
   - employee/admin 화면이 동일 레이아웃인지 확인
   - `레이아웃 검증` 실행 후 실패 시 이슈 목록(코드/노드/좌표) 표시 확인
   - `디버그 오버레이` 토글로 경계/이슈 박스 표시 확인
4. Export 검증
   - `PPTX Export` / `PDF Export` 성공 확인
   - 실패 시 400과 검증 이슈 payload 확인
5. 복약 상태 분기 확인
   - 정상: 최근 복약 3건 표시
   - 없음: "복약 이력 없음" 문구
   - 실패: "조회 실패" 문구
