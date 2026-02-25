# B2B 임직원 건강레포트 수동 테스트 가이드

## 1. 사전 준비
1. `.env` 설정 확인
   - `HYPHEN_MOCK_MODE=1` (로컬 검증 시 권장)
   - `COOKIE_PASSWORD`
   - `WELLNESSBOX_PRISMA_URL`
   - `WELLNESSBOX_URL_NON_POOLING`
2. DB 마이그레이션 적용
   - `npx prisma migrate dev`
3. 설문 템플릿 시드
   - `npm run b2b:seed:survey-template`
4. 데모 데이터 시드(선택)
   - `npm run b2b:seed:demo-reports`
5. 개발 서버 실행
   - `npm run dev`

## 2. 직원 화면(`/employee-report`)
1. `/employee-report` 접속
2. 이름/생년월일(8자리)/휴대폰 입력
3. `카카오 인증 요청` 클릭
4. 카카오 인증 완료 후 `인증 완료 후 연동` 클릭
5. 기대 결과
   - 웹 화면은 일반 페이지(읽기용)로 표시
   - 인쇄 버튼 없음
   - `PDF 다운로드` 버튼으로만 산출물 다운로드
   - `최신 정보 다시 연동` 버튼 동작
   - 복약 상태가 `없음/조회 실패/미확정`을 구분해 노출
   - 최근 복약 3건, 검진 요약 1건 이상 노출

## 3. 세션 재사용/캐시 확인
1. `다른 사람 조회` 클릭 후 동일 정보 재입력
2. `기존 조회 정보 불러오기` 또는 인증/연동 절차 재진입
3. 기대 결과
   - 최근 연동 데이터 재사용 시 빠르게 진입
   - 필요할 때만 `최신 정보 다시 연동`으로 재호출

## 4. 관리자 화면(`/admin/b2b-reports`)
1. 관리자 로그인 후 `/admin/b2b-reports` 접속
2. 임직원 선택 후 period 선택
3. 설문 입력
   - 공통 1~27 문항 입력
   - Q27에서 섹션 최대 5개 선택
   - 선택 섹션(S01~S24) 문항만 입력
4. 버튼 동작 확인
   - `설문 저장`
   - `분석 재계산`
   - `AI 생성`
   - `리포트 재생성`
   - `레이아웃 검증`
   - `PPTX 다운로드`, `PDF 다운로드`
5. 기대 결과
   - 분석 카드/표가 점수/지표/리스크/추이를 반영
   - validation 실패 시 코드/좌표/노드 정보가 명확히 표시
   - A4 디버그 토글로 export 레이아웃 확인 가능

## 5. 데모 미리보기
1. `/admin/b2b-reports?demo=1` 접속 (관리자 세션 필요)
2. `데모 데이터 생성` 버튼 클릭
3. 기대 결과
   - demo 임직원 1~2명 생성/갱신
   - 최근 3개월 period 누적 데이터 조회 가능

## 6. 배치 ZIP 비활성 확인
1. 관리자 UI에서 배치 ZIP Export 버튼이 노출되지 않는지 확인
2. 필요 시 API 직접 호출 테스트
   - `POST /api/admin/b2b/reports/export-batch`
3. 기대 결과
   - 기본 설정(`B2B_ENABLE_BATCH_EXPORT` 미설정)에서는 410 응답

## 7. 권한 검증
1. 비로그인 상태에서 `/api/admin/b2b/*` 호출
2. 임직원 토큰 없이 `/api/b2b/employee/report` 호출
3. 기대 결과
   - 모두 인증 차단(401/403 계열)

## 8. 최종 검증 명령
1. `npm run audit:encoding`
2. `npm run lint`
3. `npm run build`
