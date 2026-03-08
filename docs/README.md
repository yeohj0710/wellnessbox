# WellnessBox 문서 허브

## 목적
- 이 저장소에는 서비스 운영에 직접 필요한 문서만 둔다.
- R&D 원문, 설계, 진행 기록, 핸드오프 문서는 `wellnessbox-rnd`를 기준으로 본다.

## 문서 구조
- 공통 기준
  - `docs/DOC_TYPES_AND_FORMAT.md`
  - `docs/DOCS_CATALOG.md`
- 영역별 인덱스
  - `docs/engineering/README.md`
  - `docs/maintenance/README.md`
  - `docs/b2b/README.md`
  - `docs/maps/README.md`
  - `docs/qa/README.md`
- 시나리오 문서
  - `docs/scenarios/*.md`
- 외부 R&D 문서
  - `C:/dev/wellnessbox-rnd/docs/context/master_context.md`
  - `C:/dev/wellnessbox-rnd/docs/imported/wellnessbox/legacy-rnd-docs/`
  - `C:/dev/wellnessbox-rnd/docs/imported/wellnessbox/legacy-rnd-impl/`

## 빠른 시작
1. 저장소 경계 확인: `AGENTS.md`
2. 문서 규칙 확인: `docs/DOC_TYPES_AND_FORMAT.md`
3. 전체 위치 확인: `docs/DOCS_CATALOG.md`
4. 서비스 운영 문서 탐색:
   - `docs/engineering/README.md`
   - `docs/maintenance/README.md`
   - `docs/b2b/README.md`
   - `docs/maps/README.md`
   - `docs/qa/README.md`
5. R&D 문서 탐색:
   - `C:/dev/wellnessbox-rnd/docs/context/master_context.md`
   - `C:/dev/wellnessbox-rnd/docs/imported/wellnessbox/legacy-rnd-docs/SESSION_HANDOFF.md`
   - `C:/dev/wellnessbox-rnd/docs/imported/wellnessbox/legacy-rnd-docs/01_kpi_and_evaluation.md`

## 운영 규칙
- 이 저장소 안에 `docs/rnd/**`, `docs/rnd_impl/**` 형태의 R&D 문서를 다시 만들지 않는다.
- 문서 경로를 추가, 이동, 삭제하면 `docs/DOCS_CATALOG.md`와 해당 영역의 `README.md`를 함께 갱신한다.
- 텍스트 문서는 UTF-8, LF 기준을 유지한다.
