# B2B Admin Report Actions Sub-hook Refactor

## Goal
- Reduce hotspot pressure in `useB2bAdminReportActions`.
- Separate unrelated concerns for faster follow-up edits:
  - CRUD/재계산/검증
  - PDF 내보내기
  - 설문 입력 토글/정규화
  - 에디터 dirty-state 동기화

## Scope
- Main composer hook:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-actions.ts`
- New sub-hooks:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-crud-actions.ts`
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-export-actions.ts`
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-survey-input-actions.ts`
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-editor-state-actions.ts`

## Additional cleanup
- 사용자 알림 문구를 한국어로 정리해 인코딩 깨진 메시지 노출 위험을 제거.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-actions-extraction`
3. `npm run qa:b2b:admin-report-crud-subhooks`
4. `npm run qa:b2b:admin-report-selection-lifecycle`
5. `npm run qa:b2b:admin-report-workspace-extraction`
6. `npm run lint`
7. `npm run build`
