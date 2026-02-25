# coding-terrace -> wellnessbox 포팅 문서 (편집기 + 이미지 업로드)

작성 기준: 현재 `coding-terrace` 코드베이스 분석 결과  
범위: 게시판 글쓰기/댓글 편집기의 이미지 업로드 및 Markdown 삽입 흐름, Cloudflare 설정, 이식 체크리스트

## 1) 전체 흐름 요약 (Ctrl+V -> 업로드 -> URL 삽입 -> 저장/표시)

1. 글쓰기 라우트에서 `PostForm` 렌더링
- `app/board/new/page.tsx`
- `app/technote/new/page.tsx`
- 두 라우트 모두 `components/postForm.tsx` 사용

2. 에디터(텍스트영역)에서 붙여넣기/파일선택 이벤트 수신
- `components/postForm.tsx`
- `onPaste` -> `lib/handlePaste.ts`
- 파일 입력 `onChange` -> `lib/handleImageChange.ts`

3. 업로드 URL 발급(서버 측)
- `lib/handlePaste.ts`, `lib/handleImageChange.ts`에서 `getUploadUrl()` 호출
- `lib/upload.ts`의 서버 액션이 Cloudflare Images Direct Upload API 호출:
  - `POST https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`
  - `Authorization: Bearer {CLOUDFLARE_API_KEY}`

4. 브라우저가 Cloudflare `uploadURL`로 실제 파일 업로드
- `lib/handlePaste.ts`, `lib/handleImageChange.ts`
- `FormData`에 `file` 필드로 전송
- 응답 `result.variants[]` 중 `.../public` URL 선택

5. 에디터 본문에 Markdown 이미지 태그 삽입
- `lib/handlePaste.ts`, `lib/handleImageChange.ts`
- 삽입 문자열 형식: `![이미지 설명](https://.../public)\n`
- 현재 커서 위치(`selectionStart`, `selectionEnd`) 기준으로 본문 문자열에 삽입

6. 글 저장
- `components/postForm.tsx` 제출 시 `lib/post.ts`의 `uploadPost()`/`updatePost()` 호출
- DB `Post.content`에 Markdown 원문 저장 (`prisma/schema.prisma`)

7. 글 조회 시 렌더링
- `app/board/[idx]/page.tsx`, `app/technote/[idx]/page.tsx` -> `components/postView.tsx`
- `ReactMarkdown` 기반 렌더링, 이미지 클릭 모달 지원

8. 동일 업로드 로직 재사용 범위
- 댓글/대댓글: `components/commentSection.tsx`, `components/comment.tsx`
- 프로필 이미지: `components/profileForm.tsx`

## 2) 환경변수/설정 목록 (코드에서 실제 참조되는 값 전체)

주의: 아래 예시는 모두 가짜값입니다.

| 변수명 | 용도 | 값 형식(가짜 예시) | 사용 위치 |
|---|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Images Direct Upload API 계정 식별자 | `0123456789abcdef0123456789abcdef` | `lib/upload.ts` |
| `CLOUDFLARE_API_KEY` | Cloudflare Images API 호출용 토큰(Bearer) | `cf_api_token_example_xxx` | `lib/upload.ts` |
| `COOKIE_PASSWORD` | `iron-session` 암호화 키 | `32자_이상_랜덤_문자열_example` | `lib/session.ts` |
| `NEXT_PUBLIC_VAPID_KEY` | 웹푸시 공개키(클라이언트/서버 공용) | `BEXAMPLE_PUBLIC_VAPID_KEY` | `components/postForm.tsx`, `components/commentSection.tsx`, `components/comment.tsx`, `lib/notification.ts`, `app/api/send-notification/route.ts`, `app/api/notify-post-author/route.ts`, `app/api/notify-comment-author/route.ts`, `app/api/weather/route.ts` |
| `PRIVATE_VAPID_KEY` | 웹푸시 개인키(서버 전용) | `EXAMPLE_PRIVATE_VAPID_KEY` | `app/api/send-notification/route.ts`, `app/api/notify-post-author/route.ts`, `app/api/notify-comment-author/route.ts`, `app/api/weather/route.ts` |
| `OPERATORS` | 운영자 계정 ID 목록(쉼표 구분) | `admin1,admin2` | `lib/auth.ts` |
| `SITE_URL` | 외부 브라우저 열기용 베이스 URL | `https://wellnessbox.example.com` | `lib/openExternalInKakao.ts` |
| `PYTHON_API_SERVER_URL` | 외부 Python API 서버 URL | `https://python-api.example.com` | `app/api/hello/route.ts`, `app/api/weather/route.ts`, `app/api/wake-server/route.ts` |
| `POSTGRES_PRISMA_URL` | Prisma DB 연결 URL(pooled) | `postgres://user:pass@host:5432/db?sslmode=require` | `prisma/schema.prisma` |
| `POSTGRES_URL_NON_POOLING` | Prisma directUrl(non-pooling) | `postgres://user:pass@host:5432/db?sslmode=require` | `prisma/schema.prisma` |

### 업로드 기능과 직접 연관된 핵심 env
- 필수: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY`
- (기능 외 운영 기본): `POSTGRES_*`, `COOKIE_PASSWORD` 등

## 3) Cloudflare 구성요소와 생성/연결 순서

현재 코드 기준으로 실제 사용하는 Cloudflare 구성요소:
- 사용: **Cloudflare Images (Direct Upload API + Variants + Delivery URL)**
- 미사용: **R2, Workers, Pages** (업로드 경로에는 등장하지 않음)

필수 리소스:
1. Cloudflare Account
2. Cloudflare Images 활성화
3. Images Variant 최소 2개
- `public` (본문 삽입 URL에서 사용)
- `avatar` (코드에서 `/public` -> `/avatar` 변환하여 썸네일/프로필에 사용)
4. API Token (Images Direct Upload 호출 권한 포함)
5. Account ID
6. (선택) 커스텀 이미지 도메인

체크리스트:
- [ ] Cloudflare Dashboard에서 Images 활성화
- [ ] Variant `public` 생성
- [ ] Variant `avatar` 생성
- [ ] API Token 발급 후 `CLOUDFLARE_API_KEY`로 설정
- [ ] Account ID를 `CLOUDFLARE_ACCOUNT_ID`로 설정
- [ ] 앱 호스팅 환경(예: Vercel) 서버 env에 값 입력
- [ ] 배포 후 붙여넣기 업로드로 `.../public` URL 삽입 확인
- [ ] 프로필/썸네일에서 `/avatar` 변환 URL 정상 표시 확인

## 4) API/엔드포인트 스펙

### A. 업로드 URL 발급 (서버 액션 내부에서 호출)

내부 진입점:
- `lib/upload.ts`의 `getUploadUrl()` (Next.js 서버 액션)

외부 API:
- `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/images/v2/direct_upload`

Request:
- Method: `POST`
- Headers:
  - `Authorization: Bearer {CLOUDFLARE_API_KEY}`
- Body: 없음

Response(성공 예시, 필드 구조 요약):
```json
{
  "success": true,
  "result": {
    "id": "image_id",
    "uploadURL": "https://upload.imagedelivery.net/.../image_id"
  }
}
```

Response(실패):
- `success: false` 혹은 HTTP `4xx/5xx`
- 코드 동작: `lib/upload.ts`에서 에러 텍스트 로깅 후 `{ success: false, error }` 반환

### B. 실제 파일 업로드

호출 위치:
- `lib/handlePaste.ts`
- `lib/handleImageChange.ts`

Request:
- Method: `POST`
- URL: 위 A 단계에서 받은 `uploadURL`
- Headers: 브라우저가 `multipart/form-data` 자동 설정
- Body:
  - `file`: 이미지 바이너리 (`FormData`)

Response(성공 후 사용 필드):
```json
{
  "result": {
    "variants": [
      "https://imagedelivery.net/.../public",
      "https://imagedelivery.net/.../avatar"
    ]
  }
}
```

클라이언트 후처리:
- `variants`에서 `endsWith("/public")` URL 선택
- 본문에 `![이미지 설명](URL)` 삽입

제한(코드 기준):
- 붙여넣기: `item.kind === "file"` && `item.type.startsWith("image/")`
- 파일선택: `<input accept="image/*" multiple>`
- 파일 크기 제한: 코드에 별도 없음(실제 제한은 Cloudflare/계정 정책에 따름)

에러 케이스와 처리:
1. 권한/토큰 오류(401/403 등)
- 발생 지점: A 단계
- 처리: 업로드 중단, 콘솔 에러, 일부 경로에서 alert 표시

2. 업로드 URL 만료/무효, 용량 초과, 타입 거부(4xx)
- 발생 지점: B 단계
- 처리: `response.ok` 실패 시 중단

3. `variants`에 `/public` 없음
- 처리: URL 추출 실패로 삽입 중단

4. 네트워크 예외
- 코드상 일부 경로에서 상세 사용자 에러 메시지가 부족(운영 시 보완 권장)

## 5) 보안/운영 포인트

### CORS / 허용 도메인
- 앱 코드에서 별도 CORS allowlist를 직접 구현하지 않음
- 브라우저는 Cloudflare가 발급한 `uploadURL`로 직접 업로드
- 즉, `uploadURL` 자체가 권한 토큰 역할을 수행

### Public URL 구성 방식
- URL은 Cloudflare 응답 `variants`를 그대로 사용
- 앱이 URL을 조합하지 않음
- 단, 일부 화면은 `url.replace("/public", "/avatar")` 규칙 사용:
  - `components/postView.tsx`
  - `components/comment.tsx`
  - `components/postList.tsx`
  - `components/menuLinks.tsx`

### 캐시/만료
- `uploadURL`은 임시 URL(즉시 업로드 용도)
- 최종 이미지 URL(`.../public`, `.../avatar`)은 CDN 전달 URL
- 앱 코드에서 이미지 캐시 TTL을 직접 제어하지 않음

### 파일명/폴더 규칙
- 코드에 커스텀 파일명/폴더 규칙 없음
- Cloudflare Images가 image ID 기반으로 관리

### 배포 시 env 세팅 위치
1. Cloudflare Dashboard
- Images 활성화
- Variant(`public`, `avatar`)
- API Token/Account ID 확보

2. 호스팅 환경(예: Vercel Project Settings -> Environment Variables)
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY`는 **서버 전용**
- `NEXT_PUBLIC_*`는 클라이언트 노출 가능 변수임을 인지하고 사용

### 링크/도메인 하드코딩 교체 포인트 (wellnessbox 이식 시 필수)
- `components/postForm.tsx` (`postUrl`이 `https://codingterrace.com/board/...`로 고정)
- `app/layout.tsx` (`metadataBase`, `openGraph.url`)
- `lib/metadata.ts` (`siteUrl`)
- `app/board/[idx]/page.tsx`, `app/technote/[idx]/page.tsx` (OG URL)
- `components/notificationPanel.tsx` (고정 URL)
- `lib/openExternalInKakao.ts` (`SITE_URL` 미설정 시 기본값이 `codingterrace.com`)

## 6) wellnessbox 포팅 가이드 (실전)

### 최소 구현 단위 (업로드 + Markdown URL 삽입만)

패키지 추가 없이 재현 가능: **가능**

필수 단위:
1. 서버 측 업로드 URL 발급 유틸
- 복사 후보: `lib/upload.ts`
- 역할: Cloudflare Direct Upload API 호출, `uploadURL` 반환

2. 클라이언트 붙여넣기 핸들러
- 복사 후보: `lib/handlePaste.ts`
- 역할: Ctrl+V 이미지 업로드 + 커서 위치 Markdown 삽입

3. 클라이언트 파일선택 핸들러
- 복사 후보: `lib/handleImageChange.ts`
- 역할: 파일 선택 업로드 + Markdown 삽입

4. 에디터 컴포넌트 연결
- 참고 후보: `components/postForm.tsx`
- 필요한 상태: `content`, `isUploadingImages`, `contentRef`
- 필요한 이벤트: `onPaste`, 파일 input `onChange`, 제출 시 업로드 중 차단

5. 서버 저장 액션
- 참고 후보: `lib/post.ts` (`uploadPost`, `updatePost`)
- 핵심: 본문 `content`를 문자열로 저장

### 기존 화면까지 동일하게 맞추는 단위 (Markdown 렌더 + sanitize + 코드 하이라이트)

패키지 추가 없이 재현 가능: **조건부**
- wellnessbox에 이미 아래 패키지가 있으면 추가 없음
- 없으면 추가 필요

관련 파일:
- `components/postView.tsx`
- `lib/customSchema.ts`
- `lib/remarkYoutubeEmbed.ts`

필요 패키지(현 프로젝트 기준):
- `react-markdown`
- `remark-gfm`
- `remark-breaks`
- `rehype-raw`
- `rehype-sanitize`
- `rehype-highlight`
- `highlight.js`
- `unist-util-visit`

패키지 추가를 피하고 싶을 때 대안:
1. 1차 이식은 textarea 저장/조회(plain text)만 먼저 적용
2. 이미지는 Markdown 원문 URL을 클릭 링크로만 노출
3. 이후 단계에서 렌더러/하이라이트를 점진 적용

### 추가 재사용 후보 (선택)
- 댓글 이미지 업로드까지 함께 이식:
  - `components/commentSection.tsx`
  - `components/comment.tsx`
- 프로필 이미지 업로드까지 함께 이식:
  - `components/profileForm.tsx`

## 7) 로컬 스모크 테스트 (짧은 체크리스트)

1. 서버 env에 `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY` 설정 후 실행
2. 글쓰기 페이지 진입 (`/board/new` 또는 이식된 작성 페이지)
3. 에디터에 이미지 Ctrl+V
4. 본문에 `![이미지 설명](https://.../public)` 형태가 삽입되는지 확인
5. 글 저장 후 상세 페이지에서 이미지 렌더링 확인
6. 파일선택 업로드도 동일 동작 확인

---

## 참고: 이 문서의 결론

- 업로드 핵심은 `Cloudflare Images Direct Upload` 2단계 호출이며, 내부 `/api/upload` 라우트 없이 `server action + Cloudflare uploadURL` 구조다.
- 이식의 실질 필수는 `lib/upload.ts`, `lib/handlePaste.ts`, `lib/handleImageChange.ts`, 에디터 이벤트 결선이다.
- `public`/`avatar` variant 네이밍이 코드에 직접 의존하므로 Cloudflare 쪽 이름을 동일하게 맞추는 것이 가장 중요하다.
