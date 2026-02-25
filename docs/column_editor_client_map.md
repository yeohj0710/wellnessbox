# Column Editor Client Map

목적: `/admin/column/editor` 후속 작업 시 수정 포인트를 빠르게 찾고, UI/동작 회귀를 줄이기 위한 구조 안내.

## 1) 화면 엔트리

- `app/(admin)/admin/column/editor/page.tsx`
  - 어드민 가드 통과 후 `EditorAdminClient` 렌더.

## 2) 클라이언트 오케스트레이션

- `app/(admin)/admin/column/editor/EditorAdminClient.tsx`
  - 목록/상세/편집 상태를 관리하는 단일 오케스트레이터.
  - 라우팅 정책:
    - 새 글: `/admin/column/editor`
    - 수정: `/admin/column/editor?postId=<id>`
  - 핵심 핸들러:
    - `loadPosts` (목록 조회)
    - `openPost` (상세 조회 + 쿼리 동기화)
    - `handleSave` (초안/수정 저장)
    - `handlePublish` (발행/비공개)
    - `handleDelete` (삭제)
    - `handleSaveToWorkspace` (개발용 파일 저장)

## 3) UI 블록 경계

- `app/(admin)/admin/column/editor/_components/ColumnEditorHeader.tsx`
  - 상단 안내/링크 영역 전담.
- `app/(admin)/admin/column/editor/_components/ColumnPostListSidebar.tsx`
  - 목록 검색/상태필터/행 선택 UI 전담.
- `app/(admin)/admin/column/editor/_components/ColumnEditorWorkspace.tsx`
  - 편집/미리보기 탭, 본문 편집, 발행/삭제 액션 전담.
  - slug 자동 생성 정책:
    - 제목 변경 시 `slugEdited === false` 또는 빈 slug인 경우에만 자동 갱신
    - slug 직접 입력 시부터는 자동 갱신 중단

## 4) API 클라이언트 경계

- `app/(admin)/admin/column/editor/_lib/api.ts`
  - 에디터에서 호출하는 HTTP 경로를 모듈로 분리.
  - 제공 함수:
    - `fetchAdminColumnPosts`
    - `fetchAdminColumnPost`
    - `upsertAdminColumnPost`
    - `publishAdminColumnPost`
    - `deleteAdminColumnPost`
    - `saveAdminColumnMarkdownFile`
    - `uploadImageToCloudflare`
  - 공통 정책:
    - `cache: "no-store"` 강제
    - 실패 응답은 `error` body 우선으로 예외 처리

## 5) 타입/유틸 경계

- `app/(admin)/admin/column/editor/_lib/types.ts`
  - DTO, 응답, 편집 폼, 상태 enum을 모아 타입 계약 유지.
- `app/(admin)/admin/column/editor/_lib/utils.ts`
  - 태그 파싱, slug 생성, 폼 -> 업서트 payload 변환 등 순수 유틸.
  - `INITIAL_FORM`, `estimateReadingMinutes`, `buildDevFileMarkdown`를 통해
    UI 초기값/미리보기/dev 저장 포맷을 한 곳에서 유지.
  - 서버/클라이언트 공통으로 쓰기 쉬운 순수 함수 형태 유지.

## 6) 후속 작업 규칙

- 목록/상세/저장 API 스펙이 바뀌면:
  1) `_lib/types.ts` 계약 업데이트
  2) `_lib/api.ts` 응답 파서 업데이트
  3) `EditorAdminClient.tsx` 뷰 로직 순으로 반영
- 에디터 UX(필드 추가/삭제) 변경은:
  - 먼저 `EditorForm` + `buildUpsertPayload`를 맞춘 뒤 UI를 변경.
- 화면 배치 변경은:
  - `_components/*`에서 처리하고, 오케스트레이터에는 상태/핸들러만 남기는 구조를 유지.
- 이미지 업로드 정책 변경은:
  - `PORTING_EDITOR_IMAGE_UPLOAD.md`를 기준으로 `_lib/api.ts` 경계에서만 처리.
