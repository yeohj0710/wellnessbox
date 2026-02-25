# B2B 임직원 레포트 Dev Runbook (ENV/DB/Seed/Export)

## 0) 세션 시작 체크

```bash
npm run audit:encoding
npm run check:db-env
# 가능하면
npm run preflight:agent
```

- `audit:encoding` 실패 시 기능 수정 전에 인코딩 이슈를 먼저 해결합니다.
- `check:db-env`는 Prisma 연결 ENV 정합성을 먼저 점검합니다.

## 1) DB ENV 우선순위/정규화 규칙

애플리케이션은 기존 `.env` 키 구조를 유지하면서 아래 우선순위로 정규화합니다.

- `DATABASE_URL` 우선순위
  1. `DATABASE_URL`
  2. `WELLNESSBOX_PRISMA_URL`
  3. `POSTGRES_PRISMA_URL`
- `DIRECT_URL` 우선순위
  1. `DIRECT_URL`
  2. `WELLNESSBOX_URL_NON_POOLING`
  3. `POSTGRES_URL_NON_POOLING`

추가 동작:

- `WELLNESSBOX_PRISMA_URL`이 비어 있으면 정규화된 `DATABASE_URL` 값으로 보완
- `WELLNESSBOX_URL_NON_POOLING`이 비어 있으면 정규화된 `DIRECT_URL` 값으로 보완

허용 URL 접두어:

- `postgresql://`
- `postgres://`
- `prisma://`
- `prisma+postgres://`

## 2) P6001/ENV 오류 대응

다음 에러가 보이면 ENV 형식을 우선 확인합니다.

- `P6001`
- `DATABASE_URL must start with prisma:// or prisma+postgres://`
- `DIRECT_URL`/`WELLNESSBOX_PRISMA_URL` 관련 초기화 오류

점검 순서:

```bash
npm run check:db-env
```

실패 시:

1. `.env`에 위 우선순위 키 중 최소 1개씩(`DATABASE_URL` 그룹, `DIRECT_URL` 그룹) 설정
2. URL 접두어가 허용 형식인지 확인
3. 서버 재시작 후 재확인

## 3) Build/Prerender 안정성

- Prisma 클라이언트는 lazy 초기화로 변경되어 import 시점이 아니라 실제 사용 시점에 연결을 시도합니다.
- 빌드/프리렌더 단계에서는 DB 강제 접근 경로를 피하고, API/동적 경로에서만 DB를 사용합니다.
- 빌드 전 권장:

```bash
npm run check:db-env
npm run build
```

## 4) Demo Seed

관리자 API:

- `POST /api/admin/b2b/demo/seed`

CLI:

```bash
npm run b2b:seed:demo-reports
```

기본 데모 데이터:

- 임직원 2명
- 최근 3개월 누적 데이터
- 설문/검진/복약/약사코멘트/분석/리포트 포함

## 5) Export 점검

- 임직원: PDF만 (`/api/b2b/employee/report/export/pdf`)
- 관리자: PPTX + PDF (`/api/admin/b2b/reports/[reportId]/export/*`)
- 배치 ZIP export는 운영 정책상 비활성화 가능(`B2B_ENABLE_BATCH_EXPORT`)

PDF 변환 우선순위:

1. `soffice` (LibreOffice)
2. Playwright headless PDF
3. 둘 다 불가 시 `501` + 설치 안내

## 6) 최종 검증

```bash
npm run audit:encoding
npm run lint
npm run build
```

운영 흐름 수동 점검:

1. 임직원 로그인/기존 조회
2. 카카오 인증 후 동기화(또는 최신정보 다시 연동)
3. 월별 리포트 조회/전환
4. 임직원 PDF 다운로드
5. 관리자 설문/분석/약사코멘트 저장
6. 관리자 PPTX/PDF 다운로드
