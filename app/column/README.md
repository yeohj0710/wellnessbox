# 웰니스박스 칼럼 운영 메모

## 콘텐츠 위치

- 칼럼 원문: `app/column/_content/*.md`

## 지원 frontmatter

```md
---
title: 칼럼 제목
description: 검색 설명 문구
date: 2026-02-25
draft: false
tags:
  - 태그1
  - 태그2
slug: my-column-slug
---
```

- `description`이 없으면 `summary`를 대체로 읽습니다.
- `draft: true` 글은 목록/태그/RSS/상세 공개에서 제외됩니다.

## 편집기

- 경로: `/column/editor`
- 기본 정책: 개발환경에서만 열립니다.
- 운영에서 열려면 `COLUMN_EDITOR_ENABLED=true`가 필요하며, 업로드/저장 API는 관리자 세션이 필요합니다.
- 기능:
  - 마크다운 편집 + 미리보기
  - `Ctrl+V` 이미지 붙여넣기
  - 파일 선택 이미지 업로드
  - `.md` 다운로드 / 클립보드 복사 / dev 로컬 파일 저장

## 이미지 업로드(Cloudflare Direct Upload)

- 서버: `/api/column/upload-image`에서 `uploadURL` 발급
- 브라우저: `uploadURL`로 직접 업로드 후 `variants`의 `/public` URL 사용
- 필수 env:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_KEY` 또는 `CLOUDFLARE_API_TOKEN` 또는 `CLOUDFLARE_IMAGES_API_TOKEN`

## 로컬 저장 API

- 경로: `/api/column/editor/save`
- 동작: `app/column/_content/{slug}.md` 파일에 UTF-8로 저장
