# B2B 임직원 건강 레포트 스펙 (WellnessBox)

## 목적

- 임직원: QR → 본인인증(카카오, /health-link 재사용) → NHIS(검진/복약) 연동 → 웹에서 읽기 → **PDF 다운로드**
- 관리자/약사: 설문 입력/분석/코멘트/AI 종합평가 관리 → **PPTX/PDF Export**

## UX 원칙(핵심)

- 웹 화면은 인쇄 프리뷰처럼 A4 종이 프레임을 강제하지 않는다.
- 읽기 좋은 일반 페이지(반응형)로 제공한다.
- 다운로드 시에만 A4 산출물(PDF/PPTX)을 만든다.
- 임직원: PDF만 / 관리자: PPTX+PDF
- 불필요한 zip 배치 Export UI는 제거/숨김.

## 데이터 흐름

1. 임직원 입력(name/birth/phone) + 카카오 인증
2. 하이픈 NHIS fetch → 최신 검진 1 + 최근 복약 3 → DB 저장(호출 최소화)
3. 관리자: 종이 설문 입력(템플릿 기반)
4. 분석 엔진: 설문 점수화 + 검진/복약 + 약사/AI 문구 + 누적(월별) → ComputedMetrics 저장
5. 레포트: ComputedMetrics 중심으로 표시 + 월별 추이

## 설문 구조(필수)

- 공통 1~27
- 27번 선택(최대 4~5개) → 해당 섹션(S01~S24)만 추가 입력
- 섹션명은 실제 한글명을 보여준다(placeholder 금지)

## 버전 관리(필수)

- SurveyTemplate(key+version), published immutable
- 변경은 v2 신규 생성
- SurveyResponse: templateId + periodKey(YYYY-MM)
- SurveyAnswer: questionId 기반 저장
- 추이는 ComputedMetrics(표준 지표 스키마)로 유지

## NHIS(하이픈) 정책

- 호출 최소화: 최초 1회 저장 후 DB 캐시, 재연동 버튼만 재호출(+dedupe)
- 상태 표기: none(0), fetch_failed, unknown 구분

## Export 정책

- PPTX: editable object(text/shape)
- PDF: soffice 우선, 없으면 Playwright printToPDF (A4, header/footer 없음)
- validation: background/allowOverlap 예외, spacing 안정화
