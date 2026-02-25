# B2B 임직원 건강 리포트 Dev Runbook

## 1) 세션 시작 전 점검

```bash
npm run audit:encoding
npm run check:db-env
```

- 인코딩/DB ENV 이슈를 먼저 정리한 뒤 기능 검증을 진행합니다.
- 빌드 전에는 `npm run lint && npm run build`를 반드시 통과시킵니다.

## 2) 데모 데이터 준비

```bash
npm run b2b:seed:demo-reports
```

- 데모 임직원/검진/복약/설문/분석/리포트 스냅샷이 함께 생성됩니다.
- 기본 검증은 데모 임직원 최신 리포트 기준으로 수행합니다.

## 3) Export 파이프라인 검증

Export 파이프라인은 고정 순서를 유지합니다.

`generateLayout -> validate -> audit -> render`

### 3.1 직원 PDF

- 경로: `GET /api/b2b/employee/report/export/pdf?period=YYYY-MM`
- 기대값:
  - 레이아웃 정상: `200` + `application/pdf`
  - 엔진 미설치: `501` + `code=PDF_ENGINE_MISSING`
  - 레이아웃 실패: `400` + `code=LAYOUT_VALIDATION_FAILED`

직원 응답은 내부 검증 이슈(`issues/audit`)를 노출하지 않습니다.

### 3.2 관리자 PDF/PPTX

- 경로:
  - `GET /api/admin/b2b/reports/{reportId}/export/pptx`
  - `GET /api/admin/b2b/reports/{reportId}/export/pdf`
- 기대값:
  - PPTX 기본 성공: `200`
  - PDF는 엔진 환경에 따라 `200` 또는 `501`
  - 검증 실패 시 `400` + 구조화 응답(JSON):
    - `code`
    - `reason`
    - `debugId`
    - `audit`
    - `issues`

관리자 UI는 위 payload를 디버그 패널에 그대로 반영합니다.

### 3.3 PDF 엔진 우선순위

1. `soffice` (LibreOffice)
2. Playwright headless PDF
3. 둘 다 없으면 `501` + 설치 안내

현재 구현은 `soffice` 실행 예외(예: `ENOENT`)에도 Playwright fallback을 시도합니다.

## 4) 최신 정보 재연동(비용 가드 포함)

### 4.1 흐름

직원 화면에서 재연동 시 아래 흐름으로 진행됩니다.

1. init 필요 여부 확인
2. 필요 시 `init -> sign -> sync`
3. 기존 데이터 유지 + 부족 타깃 부분 동기화

### 4.2 비용 제어

- 강제 재연동 쿨다운: 기본 15분 (ENV로 10~30분 범위 조절)
- 중복 요청 dedupe: 동일 사용자/동일 요청 해시 in-flight 병합
- 캐시 우선 사용: valid cache -> history cache -> fresh fetch 순서

## 5) 복약/검진 상태 분기

리포트 payload에서 복약 상태는 다음으로 분기됩니다.

- `available`: 복약 행 확보
- `none`: 실제 0건
- `fetch_failed`: 타깃 조회 실패가 명확
- `unknown`: 미연동/파싱 불가/판정 불가

부분 동기화는 복약/검진 중 누락된 타깃만 추가 조회합니다.

## 6) AI 종합평가 검증

### 6.1 생성 경로

- 분석 재계산 API:
  - `POST /api/admin/b2b/employees/{employeeId}/analysis`
- 권장 body:
  - `periodKey`
  - `generateAiEvaluation: true`
  - `forceAiRegenerate: true` (필요 시)

### 6.2 확인 포인트

1. `analysis.aiEvaluation` 존재 확인
2. 동일 요청에서 반환된 `report.id` 생성 확인
3. `GET /api/admin/b2b/employees/{employeeId}/report?period=...`에서
   `latest.payload.analysis.aiEvaluation` 존재 확인

모델 표시는 `gpt-4o-mini` 기준입니다(프로젝트 기본 모델 해석 결과 반영).

## 7) 최종 체크리스트

```bash
npm run audit:encoding
npm run lint
npm run build
```

수동 검증:

1. `/employee-report` 진입 시 스켈레톤 로딩과 레이아웃 안정성 확인
2. 직원 PDF 요청 시 400 검증 실패가 아닌 정상/엔진 안내 응답 확인
3. `/admin/b2b-reports`에서 PPTX/PDF 내보내기 및 디버그 패널 확인
4. 재연동 쿨다운/부분 동기화/복약 상태 분기 확인
5. AI 종합평가 생성 후 리포트 payload 반영 확인
