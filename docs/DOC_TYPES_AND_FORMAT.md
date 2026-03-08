# 문서 유형 및 형식 기준

## 기본 원칙
- `wellnessbox`에는 서비스 운영과 유지보수에 필요한 문서만 둔다.
- R&D 요구사항, 평가, 설계, 진행, 실험 기록은 `wellnessbox-rnd`를 기준으로 본다.
- 새 문서를 만들기 전에 `AGENTS.md`의 저장소 경계를 먼저 확인한다.

## 서비스 저장소에 둘 수 있는 문서

### Index
- 목적: 특정 영역 문서로 진입하는 인덱스 제공
- 예시:
  - `docs/README.md`
  - `docs/DOCS_CATALOG.md`
  - `docs/engineering/README.md`
  - `docs/maintenance/README.md`
  - `docs/b2b/README.md`
  - `docs/maps/README.md`
  - `docs/qa/README.md`

### Standard
- 목적: 문서 구조, 작성 규칙, 갱신 규칙 정의
- 예시:
  - `docs/DOC_TYPES_AND_FORMAT.md`

### Runbook / Policy / Maintenance / Scenario / QA / Map
- 목적: 서비스 운영, 유지보수, QA, 시나리오, 화면/기능 구조 설명
- 위치:
  - `docs/engineering/*.md`
  - `docs/maintenance/*.md`
  - `docs/b2b/*.md`
  - `docs/maps/*.md`
  - `docs/qa/*.md`
  - `docs/scenarios/*.md`

## 서비스 저장소에 두지 않는 문서

### R&D Spec / Impl / Progress / Handoff
- canonical 위치:
  - `C:/dev/wellnessbox-rnd/docs/context/master_context.md`
  - `C:/dev/wellnessbox-rnd/docs/imported/wellnessbox/legacy-rnd-docs/*.md`
  - `C:/dev/wellnessbox-rnd/docs/imported/wellnessbox/legacy-rnd-impl/*.md`
- 예시:
  - KPI 평가 기준
  - 모듈별 R&D 요구사항
  - R&D 구현 노트
  - R&D 진행 기록
  - R&D 세션 핸드오프

## 작성 규칙
- 파일명은 문서 목적이 바로 드러나게 유지한다.
- 문서를 이동하거나 삭제하면 아래를 함께 갱신한다.
  - `docs/DOCS_CATALOG.md`
  - 해당 영역 `README.md`
  - 관련 참조 문서와 QA 스크립트
- 서비스 문서에서 외부 R&D 문서를 참조할 때는 `C:/dev/wellnessbox-rnd/...` 절대 경로를 사용한다.

## 검증
1. `npm run audit:encoding`
2. `npm run lint`
3. `npm run build`
