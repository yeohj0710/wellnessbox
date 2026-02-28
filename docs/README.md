# WellnessBox 문서 허브

## 목적
- 이 문서는 `docs/` 전체 문서의 진입점이다.
- 새 세션의 Codex/개발자가 문서를 빠르게 찾고, 누락 없이 읽는 순서를 고정한다.
- 현재 프로젝트에서 문서가 많은 문제를 줄이기 위해 `문서 분류`, `형식 기준`, `전체 카탈로그`, `R&D 핸드오프`를 분리해 관리한다.

## 문서 분류 체계
- `docs/rnd/`: TIPS R&D 요구사항/평가 기준/학습 파이프라인/진행 현황/핸드오프
- `docs/rnd_impl/`: R&D 구현 참고 노트(요구사항 충돌 시 우선순위 낮음)
- `docs/engineering/`: 엔지니어링 운영 규칙/체크맵
- `docs/maintenance/`: 리팩터링/핫스팟 유지보수 기록
- `docs/scenarios/`: 시나리오 중심 클라이언트 흐름 문서
- `docs/` 루트의 `b2b_*`, `*_client_map`, `qa_*`: B2B/리포트/QA 실무 문서

## 새 세션 빠른 시작 (Codex/개발자 공통)
1. 루트 가드레일 확인: `AGENTS.md`
2. 문서 구조 확인: `docs/DOC_TYPES_AND_FORMAT.md`
3. 전체 문서 위치 확인: `docs/DOCS_CATALOG.md`
4. R&D 작업일 때:
   - `docs/rnd/SESSION_HANDOFF.md`
   - `docs/rnd/RND_DOCS_INDEX.md`
   - `docs/rnd/01_kpi_and_evaluation.md`
5. 배포 전 상태 확인:
   - `npm run audit:encoding`
   - `npm run lint`
   - `npm run build`

## 필수 참조 문서
- 문서 형식 기준: `docs/DOC_TYPES_AND_FORMAT.md`
- 전체 문서 카탈로그(누락 없는 경로 목록): `docs/DOCS_CATALOG.md`
- R&D 인덱스: `docs/rnd/RND_DOCS_INDEX.md`
- R&D 새 세션 인수인계: `docs/rnd/SESSION_HANDOFF.md`

## 배포 안정성 기본 원칙
- R&D 대용량 산출물은 Git/Vercel 업로드에서 제외한다.
  - `.gitignore`: `tmp/` (하위 `tmp/rnd/`, `tmp/pdfs/` 포함)
  - `.vercelignore`: `tmp/` (하위 `tmp/rnd/`, `tmp/pdfs/` 포함)
- 배포 가능성 확인은 `next build` 기반으로 검증하고, 결과는 세션 보고에 남긴다.
