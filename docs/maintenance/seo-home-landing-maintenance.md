# SEO / 홈 랜딩 유지보수 메모

## 목적

- 검색 노출 관련 변경 지점을 빠르게 찾을 수 있도록 SEO 공통 계층을 한 곳에 정리합니다.
- 홈 랜딩의 반복 섹션을 데이터 중심으로 관리하도록 구조를 고정합니다.

## SEO 소유 파일

- 공통 SEO 유틸: `lib/seo.ts`
- 루트 메타데이터 / JSON-LD: `app/layout.tsx`
- 사이트맵: `app/sitemap.tsx`
- robots: `app/robots.ts`
- 웹 앱 메타: `app/manifest.ts`

## 공개 페이지 메타데이터 원칙

- 공개 랜딩/정보 페이지는 가능하면 `createPageMetadata(...)`를 사용합니다.
- 비공개 성격의 페이지는 `createNoIndexMetadata(...)` 또는 `noIndex: true`를 사용합니다.
- 기본 OG 이미지는 `lib/seo.ts:getDefaultOpenGraphImages()`에서 관리합니다.
- 다국어 canonical / hreflang은 각 레이아웃에서 `alternates.languages`로 맞춥니다.

## 현재 noindex 처리된 주요 세그먼트

- `app/(admin)/layout.tsx`
- `app/(dev)/layout.tsx`
- `app/(pharm)/layout.tsx`
- `app/(rider)/layout.tsx`
- `app/auth/layout.tsx`
- `app/my-data/layout.tsx`
- `app/test/layout.tsx`
- `app/(orders)/my-orders/layout.tsx`
- `app/agent-playground/layout.tsx`

## 홈 랜딩 소유 파일

- 조립/레이아웃: `app/(components)/landingSection2.tsx`
- 카피/아이콘/섹션 데이터: `app/(components)/landingSection2.content.ts`

## 홈 랜딩 수정 규칙

- 카피, 아이콘, 뱃지, CTA 라벨, 이미지 경로 변경은 먼저 `landingSection2.content.ts`에서 찾습니다.
- 섹션 배치나 공통 UI 블록 변경은 `landingSection2.tsx`의 재사용 컴포넌트에서 수정합니다.
- 같은 UI 패턴이 3회 이상 반복되면 데이터화 또는 보조 컴포넌트 추출을 우선 검토합니다.

## 작업 전 점검

1. 공개 페이지인지, 비공개 페이지인지 먼저 구분합니다.
2. sitemap/robots에 포함 또는 제외되어야 하는지 확인합니다.
3. 루트/세그먼트 metadata 중 어디에 둘지 결정합니다.
4. 텍스트 변경이 크면 `npm run audit:encoding`을 먼저 실행합니다.

## 검증

1. `npm run audit:encoding`
2. `npm run lint`
3. `npm run build`
