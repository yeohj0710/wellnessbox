# Column Editor Client Map

목적: `/admin/column/editor` 후속 작업 시 진입점을 빠르게 찾고, 상태 변경과 UI 변경의 시작 파일을 즉시 구분하기 위한 맵입니다.

## 1) Entry

- `app/(admin)/admin/column/editor/page.tsx`
  - 관리자 가드를 통과한 뒤 `EditorAdminClient`를 렌더합니다.
- `app/column/editor/page.tsx`
  - 레거시 경로입니다. 별도 클라이언트 없이 `/admin/column/editor`로 즉시 redirect 합니다.

## 2) Root boundaries

- `app/(admin)/admin/column/editor/EditorAdminClient.tsx`
  - 로딩 오버레이, 공통 notice/error, 2단 레이아웃만 담당합니다.
  - 핵심 상태/동작은 훅이 반환한 `sidebarProps`, `workspaceProps`로 연결합니다.
- `app/(admin)/admin/column/editor/_lib/use-column-editor-controller.ts`
  - 목록 검색/필터/상세 선택 오케스트레이션
  - 에디터 폼 상태와 UI prop 조립
- `app/(admin)/admin/column/editor/_lib/use-column-editor-post-actions.ts`
  - 저장/발행/삭제/dev 파일 저장
  - 발행 가능 여부와 mutation 상태
- `app/(admin)/admin/column/editor/_lib/use-column-editor-markdown-media.ts`
  - textarea/file input ref
  - 이미지 붙여넣기/선택 업로드와 markdown 삽입

## 3) UI blocks

- `app/(admin)/admin/column/editor/_components/ColumnEditorHeader.tsx`
  - 상단 안내와 이동 링크
- `app/(admin)/admin/column/editor/_components/ColumnPostListSidebar.tsx`
  - 목록 검색, 상태 필터, 선택 UI
- `app/(admin)/admin/column/editor/_components/ColumnEditorWorkspace.tsx`
  - 작성/미리보기 탭, 본문 편집, 발행/삭제 액션

## 4) API and helpers

- `app/(admin)/admin/column/editor/_lib/types.ts`
  - DTO, 응답, 폼 상태 계약
- `app/(admin)/admin/column/editor/_lib/api.ts`
  - 칼럼 관리자 API 클라이언트
- `app/(admin)/admin/column/editor/_lib/utils.ts`
  - slug/tag/form payload/preview/dev 파일 생성 유틸리티

## 5) Follow-up order

1. 목록 선택/폼 상태를 바꾸려면 `use-column-editor-controller.ts`부터 봅니다.
2. 저장/발행/삭제 동작을 바꾸려면 `use-column-editor-post-actions.ts`부터 봅니다.
3. 업로드 UX를 바꾸려면 `use-column-editor-markdown-media.ts`부터 봅니다.
4. 레이아웃이나 문구를 바꾸려면 `_components/*`부터 봅니다.
5. `/column/editor`는 redirect-only 이므로, 별도 route-local client를 찾지 않습니다.

## 6) Validation

- `npm run qa:column-editor:legacy-redirect`
- `npm run qa:column-editor:controller-extraction`
- `npm run qa:column-editor:controller-subhooks`
- `npm run lint`
- `npm run build`
