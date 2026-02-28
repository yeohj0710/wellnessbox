# 전체 문서 카탈로그

## 기준
- 범위: `docs/` 하위의 모든 `.md` 파일
- 작성 시점: 2026-02-28
- 총 문서 수: 43개
- 산출 기준 명령:
  - `Get-ChildItem -Path docs -Recurse -File`

## A. 공통 인덱스/표준

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/README.md` | Index | docs 전체 진입점 | 새 세션 시작 시 | `docs/DOC_TYPES_AND_FORMAT.md`, `docs/DOCS_CATALOG.md` |
| `docs/DOC_TYPES_AND_FORMAT.md` | Standard | 문서 유형/형식 기준 | 문서 작성/정리 시 | `docs/DOCS_CATALOG.md` |
| `docs/DOCS_CATALOG.md` | Catalog | 전체 문서 위치/용도 목록 | 문서 탐색 시 | `docs/README.md` |

## B. R&D 요구사항/평가/운영

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/rnd/00_readme_how_to_use.md` | Spec-Guide | R&D 문서 계층/우선순위/로딩 규칙 | R&D 작업 시작 시 | `docs/rnd/01_kpi_and_evaluation.md` |
| `docs/rnd/01_kpi_and_evaluation.md` | Spec-Core | KPI/평가식/평가환경의 최종 판정 기준 | 모든 R&D 작업 필수 | 모듈 스펙 02~07 문서 |
| `docs/rnd/02_data_lake.md` | Spec | Data Lake 요구사항 | 모듈02 작업 시 | `docs/rnd_impl/02_data_lake_impl_notes.md` |
| `docs/rnd/03_personal_safety_validation_engine.md` | Spec | 개인화 안전 검증 엔진 요구사항 | 모듈03 작업 시 | `docs/rnd_impl/03_personal_safety_validation_engine_impl_notes.md` |
| `docs/rnd/04_efficacy_quantification_model.md` | Spec | 효능 정량화 모델 요구사항 | 모듈04 작업 시 | `docs/rnd_impl/04_efficacy_quantification_model_impl_notes.md` |
| `docs/rnd/05_optimization_engine.md` | Spec | 최적화 엔진 요구사항 | 모듈05 작업 시 | `docs/rnd_impl/05_optimization_engine_impl_notes.md` |
| `docs/rnd/06_closed_loop_ai.md` | Spec | Closed-loop AI 요구사항 | 모듈06 작업 시 | `docs/rnd_impl/06_closed_loop_ai_impl_notes.md` |
| `docs/rnd/07_biosensor_and_genetic_data_integration.md` | Spec | 바이오센서/유전자 연동 요구사항 | 모듈07 작업 시 | `docs/rnd_impl/07_biosensor_genetic_integration_impl_notes.md` |
| `docs/rnd/ai_training_pipeline.md` | Runbook | 단일 명령 통합 학습 파이프라인 사용법/산출물 | 학습 실행/검증 시 | `scripts/rnd/train-all-ai.ts` |
| `docs/rnd/PROGRESS.md` | Progress | R&D 구현 이력 누적 기록 | 세션 종료/재개 시 | `docs/rnd/SESSION_HANDOFF.md` |
| `docs/rnd/RND_DOCS_INDEX.md` | Index | R&D 문서/코드/산출물 위치 상세 맵 | R&D 탐색 시 | `docs/rnd/SESSION_HANDOFF.md` |
| `docs/rnd/SESSION_HANDOFF.md` | Handoff | 새 세션 연속 작업용 상태 요약/명령/리스크 | 세션 재개 시 최우선 | `docs/rnd/PROGRESS.md` |

## C. R&D 구현 참고 노트

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/rnd_impl/02_data_lake_impl_notes.md` | Impl-Note | 모듈02 구현 힌트 | 모듈02 구현 시 필요할 때 | `docs/rnd/02_data_lake.md` |
| `docs/rnd_impl/03_personal_safety_validation_engine_impl_notes.md` | Impl-Note | 모듈03 구현 힌트 | 모듈03 구현 시 필요할 때 | `docs/rnd/03_personal_safety_validation_engine.md` |
| `docs/rnd_impl/04_efficacy_quantification_model_impl_notes.md` | Impl-Note | 모듈04 구현 힌트 | 모듈04 구현 시 필요할 때 | `docs/rnd/04_efficacy_quantification_model.md` |
| `docs/rnd_impl/05_optimization_engine_impl_notes.md` | Impl-Note | 모듈05 구현 힌트 | 모듈05 구현 시 필요할 때 | `docs/rnd/05_optimization_engine.md` |
| `docs/rnd_impl/06_closed_loop_ai_impl_notes.md` | Impl-Note | 모듈06 구현 힌트 | 모듈06 구현 시 필요할 때 | `docs/rnd/06_closed_loop_ai.md` |
| `docs/rnd_impl/07_biosensor_genetic_integration_impl_notes.md` | Impl-Note | 모듈07 구현 힌트 | 모듈07 구현 시 필요할 때 | `docs/rnd/07_biosensor_and_genetic_data_integration.md` |

## D. 엔지니어링 운영 문서

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/engineering/agent-preflight.md` | Runbook | 에이전트 실행 전 체크 절차 | 린트/빌드/가드 점검 시 | `package.json` scripts |
| `docs/engineering/check-ai-maintenance-map.md` | Map | Check-AI 유지보수 맵 | check-ai 영역 수정 시 | 관련 API/컴포넌트 |
| `docs/engineering/hyphen-nhis-integration.md` | Runbook | NHIS 연동 운영 가이드 | 건강데이터 연동 수정 시 | `app/api/health/nhis/*` |

## E. 유지보수 문서

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/maintenance/refactor-hotspots.md` | Maintenance | 리팩터링 우선순위/핫스팟 추적 | 구조 개선 작업 시 | `npm run audit:hotspots` |

## F. QA/회귀 테스트 문서

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/qa_cde_regression.md` | QA | CDE 회귀 테스트 기준 | QA 수행 시 | QA 스크립트 |
| `docs/qa_cde_regression_local_runner.md` | QA-Runbook | 로컬 회귀 실행 방법 | 로컬 QA 시 | `docs/qa_cde_regression.md` |
| `docs/qa_cde_regression_selectors.md` | QA-Map | 테스트 셀렉터 정의 | Playwright 수정 시 | QA 스크립트 |

## G. 시나리오 문서

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/scenarios/ai-chat-agent-handoff.md` | Scenario | AI 채팅 에이전트 핸드오프 시나리오 | 채팅 흐름 점검 시 | `app/api/chat/*` |
| `docs/scenarios/chat-client-scenarios.md` | Scenario | 채팅 클라이언트 시나리오 | 채팅 UX 테스트 시 | 채팅 UI |
| `docs/scenarios/client-appuser-linking.md` | Scenario | 클라이언트-앱유저 연계 시나리오 | 인증/연계 플로우 점검 시 | auth/session 코드 |

## H. B2B/리포트/맵 문서

| 경로 | 유형 | 용도 | 언제 읽는가 | 연관 문서 |
| --- | --- | --- | --- | --- |
| `docs/b2b_admin_report_client_map.md` | Map | B2B 관리자 리포트 클라이언트 맵 | B2B 관리자 UI 수정 시 | B2B API/화면 |
| `docs/b2b_employee_report_dev_runbook.md` | Runbook | 임직원 리포트 개발 런북 | B2B 리포트 개발 시 | 관련 spec/map |
| `docs/b2b_employee_report_manual_test.md` | QA | 임직원 리포트 수동 테스트 | 배포 전 수동 QA 시 | B2B 리포트 |
| `docs/b2b_employee_report_spec.md` | Spec | 임직원 리포트 요구사항 | 기능 설계 시 | payload/summary map |
| `docs/b2b_report_design_system.md` | Design | B2B 리포트 디자인 시스템 | UI 스타일 변경 시 | B2B 리포트 화면 |
| `docs/b2b_report_payload_map.md` | Map | B2B 리포트 payload 구조 매핑 | API/스키마 변경 시 | score engine |
| `docs/b2b_report_redesign_worklog.md` | Worklog | B2B 리포트 리디자인 작업 이력 | 변경 이력 확인 시 | design system |
| `docs/b2b_report_score_engine.md` | Spec | B2B 리포트 스코어 엔진 기준 | 계산 로직 수정 시 | payload map |
| `docs/b2b_report_summary_map.md` | Map | B2B 리포트 요약 필드 매핑 | 요약/대시보드 수정 시 | payload map |
| `docs/b2b_survey_template_schema.md` | Schema | B2B 설문 템플릿 스키마 | 설문 구조 변경 시 | seed script |
| `docs/column_editor_client_map.md` | Map | 칼럼 에디터 클라이언트 맵 | 칼럼 에디터 수정 시 | column API |
| `docs/employee_report_client_map.md` | Map | 직원 리포트 클라이언트 맵 | 직원 리포트 UI 수정 시 | employee report API |

## 문서 탐색 추천 순서

### 1) 새 세션 공통
1. `AGENTS.md`
2. `docs/README.md`
3. `docs/DOCS_CATALOG.md`

### 2) R&D 연속 작업
1. `docs/rnd/SESSION_HANDOFF.md`
2. `docs/rnd/01_kpi_and_evaluation.md`
3. 현재 작업 모듈의 `docs/rnd/02~07` 1개
4. 필요할 때만 `docs/rnd_impl/해당 파일`

### 3) 배포 전
1. `npm run audit:encoding`
2. `npm run lint`
3. `npm run build`
