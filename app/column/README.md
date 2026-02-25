# 웰니스박스 칼럼 운영 가이드

## 1) 공개 라우트

- 목록: `/column`
- 상세: `/column/[slug]`
- 태그: `/column/tag/[tag]`
- RSS: `/column/rss.xml`
- 사이트맵: `/sitemap.xml`
- 로봇: `/robots.txt`

공개 페이지는 **DB 발행본 우선 + 파일 기반 fallback** 전략을 사용합니다.

## 2) 콘텐츠 소스 우선순위

1. `ColumnPost` 테이블의 `status=published`
2. `app/column/_content/*.md` 파일

동일 slug가 있으면 DB가 우선합니다.

## 3) 관리자 편집기

- 운영 경로: `/admin/column/editor`
- 레거시 경로 `/column/editor`는 관리자 편집기로 라우팅됩니다.
- 관리자 로그인(`admin` 세션/쿠키) 없이는 접근할 수 없습니다.

## 4) 관리자 CRUD API

- 목록/검색: `GET /api/admin/column/posts`
- 생성: `POST /api/admin/column/posts`
- 상세: `GET /api/admin/column/posts/[id]`
- 수정: `PATCH /api/admin/column/posts/[id]`
- 삭제: `DELETE /api/admin/column/posts/[id]`
- 발행/비공개: `POST /api/admin/column/posts/[id]/publish`

모든 API는 `requireAdminSession` 가드가 적용됩니다.

## 5) 데이터 모델(요약)

`ColumnPost` 주요 필드:

- `slug` (unique)
- `title`
- `excerpt`
- `contentMarkdown`
- `contentHtml` (optional)
- `tags` (`String[]`)
- `status` (`draft` | `published`)
- `publishedAt`
- `createdAt`, `updatedAt`
- `authorName`, `coverImageUrl` (optional)

## 6) 발행 흐름

1. 초안 생성(`draft`)
2. 마크다운 편집/미리보기
3. 저장(`PATCH`)
4. 발행(`publish=true`)
5. 필요 시 비공개(`publish=false`)
6. 삭제는 확인 후 `DELETE`

## 7) 이미지 업로드

- 엔드포인트: `POST /api/column/upload-image`
- 방식: Cloudflare Images Direct Upload URL 발급 후 클라이언트 직접 업로드
- 보안: Cloudflare 토큰/키는 서버에서만 사용
- 편집기에서는 `variants` 중 `public` URL을 본문에 삽입

필수 ENV:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_KEY` 또는
  `CLOUDFLARE_API_TOKEN` 또는
  `CLOUDFLARE_IMAGES_API_TOKEN`

## 8) Dev 전용 파일 저장 API

- 경로: `POST /api/column/editor/save`
- 정책:
  - 관리자 세션 필수
  - `NODE_ENV=production`에서는 차단(403)
  - 개발 환경에서만 `_content/*.md` 저장 용도로 사용

운영 편집은 DB CRUD를 기본으로 사용합니다.
