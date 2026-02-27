# Agent Preflight Checklist

Purpose: speed up new coding sessions by checking structural risks first, before feature work.

## 1) Fast Baseline

Run these in order:

```bash
npm run audit:encoding
npm run audit:hotspots
npm run lint
npm run build
# Optional (DB-connected env): client ID linkage/quality audit
npm run audit:clients
# Optional (C~E regression smoke): column/employee-report/b2b-export
npm run qa:cde:regression
# Optional (local auto-runner): start/reuse dev server then run C~E regression
npm run qa:cde:regression:local
# Optional (B2B score-engine safety): missing/fallback/risk derivation checks
npm run qa:b2b:score-engine
# Optional (B2B export smoke): validation + PPTX/PDF status
npm run qa:b2b:export-smoke
```

Or run one command:

```bash
npm run preflight:agent
```

If `npm run build` fails at `prisma:generate` with `EPERM ... query_engine ... rename` on Windows:
- Close processes that may hold Prisma engine files (for example Prisma Studio or other Node processes using Prisma).
- Re-run `npm run prisma:generate`.
- The command now auto-retries with backoff and prints a focused lock message.

`audit:encoding` gives:
- mojibake and suspicious broken-text pattern checks across text/code files

`audit:hotspots` gives:
- runtime code hotspots + script hotspots by line count (refactor candidates)
- critical route guard checks for admin/rag/push endpoints
- implementation map:
  - `scripts/audit-hotspots.ts` = scan + orchestration shell
  - `scripts/lib/hotspot-report.cts` = hotspot section build/print helpers
  - `scripts/lib/hotspot-audit-checks.cts` = guard/session/route-export check runners

`agent:guard-map` map:
- `scripts/agent/generate-api-guard-map.cts` = orchestration + strict failure policy
- `scripts/lib/guard-map.cts` = route scan/classification/grouping + markdown rendering

`agent:skills-catalog` map:
- `scripts/agent/generate-skill-catalog.cts` = orchestration shell (root validation + write)
- `scripts/lib/skill-catalog.cts` = skill file discovery + frontmatter parse + markdown rendering

`audit:clients` gives (optional):
- client cookie/client row/user linkage quality trends
- short-lived client ratio and user-agent concentration for hygiene checks

## 2) Non-Negotiable Invariants

- Route auth/ownership must use `lib/server/route-auth.ts` guards.
- Order stock mutation must stay in `lib/order/mutations.ts:createOrder` transaction.
- Prisma client must stay singleton via `lib/db.ts`.
- User-facing UI copy defaults to Korean (`ko-KR`) unless explicitly requested otherwise.
- Admin gate must stay aligned across:
  - `app/api/verify-password/route.ts`
  - `lib/admin-token.ts`
  - `middleware.ts`

## 3) High-Impact Hotspots

When touching these files, prefer block-level extraction over in-place growth:

- `app/chat/hooks/useChat.ts`
- `app/(components)/homeProductSection.tsx`
- `lib/chat/context.ts`
- `components/order/orderDetails.tsx`
- `app/my-data/page.tsx`
- `app/chat/components/recommendedProductActions.utils.ts`

## 4) Refactor Rule of Thumb

- Split only when boundaries are clear (pure helper, UI fragment, parser/mapper).
- Keep behavior equivalent first; optimize behavior in a separate pass.
- For auth/order/push changes, do manual flow checks after build:
  - login
  - checkout complete
  - my-orders lookup
  - push subscribe/status

## 5) Navigation Shell Notes

- `lib/useLoginStatus.ts` is the canonical source for `LoginStatus` type + normalization.
- Chat action planner split:
  - `app/api/chat/actions/route.ts` = model call + request/response orchestration
  - `lib/chat/action-intent-rules.ts` = regex intent rules + runtime-context flags + fallback action feedback
- Chat hook split:
  - `app/chat/hooks/useChat.ts` = lifecycle orchestration + state wiring
  - `app/chat/hooks/useChat.agentGuide.ts` = capability ranking + guide examples
  - `app/chat/hooks/useChat.sendMessageFlow.ts` = send branch selection
  - `app/chat/hooks/useChat.actionFlow.ts` = cart/action decision branch handlers
  - `app/chat/hooks/useChat.copy.ts` = chat copy constants + error text mapping
  - `app/chat/hooks/useChat.lifecycle.ts` = bootstrap data loaders
  - `app/chat/hooks/useChat.bootstrap.ts` = bootstrap effect wrappers
  - `app/chat/hooks/useChat.ui.ts` = drawer/scroll helpers
  - `app/chat/hooks/useChat.interactionGuard.ts` = duplicate action guard
  - `app/chat/hooks/useChat.derived.ts` = summary/context payload builders + guide visibility logic
- Chat message bubble split:
  - `app/chat/components/MessageBubble.tsx` = bubble shell + loading/copy interaction orchestration
  - `app/chat/components/messageBubble.markdown.tsx` = markdown plugin list + renderer map/image fallback policy
  - `app/chat/components/messageBubble.format.ts` = message text normalization helper
- Chat profile modal split:
  - `app/chat/components/ProfileModal.tsx` = profile modal shell + drag/reset/save orchestration
  - `app/chat/components/ProfileModalForm.tsx` = profile field form section + labeled input/select/chips blocks
  - `app/chat/components/useProfileModalState.ts` = profile modal local-state + keyboard/scroll lock + drag state
- Desktop dock split:
  - `components/chat/DesktopChatDock.tsx` = dock shell and trigger
  - `components/chat/DesktopChatDockPanel.tsx` = UI composition shell
  - `components/chat/useDesktopChatDockLayout.ts` = layout state + viewport clamp + dock layout emit
  - `components/chat/useDesktopChatDockPointer.ts` = pointer move loop + drag/resize commit/persist
  - `components/chat/DesktopChatDock.layout.ts` = geometry/storage/event primitives
  - `components/chat/DesktopChatDockPanelHeader.tsx` = dock header actions
  - `components/chat/DesktopChatDockResizeOverlay.tsx` = resize hint and handles
  - `components/chat/DesktopChatDockPanel.loading.ts` = loading metadata helper
  - `components/chat/DesktopChatDockMessageFeed.tsx` = message feed composition
- Home product section split:
  - `app/(components)/homeProductSection.tsx` = page-level orchestration and UI composition
  - `app/(components)/homeProductSection.helpers.ts` = filter/cart/cache pure helpers
  - `app/(components)/homeProductSection.copy.ts` = package labels + user-facing copy constants
  - `app/(components)/useHomeProductPharmacy.ts` = nearby pharmacy resolve/retry state machine
  - `app/(components)/useHomeProductActions.ts` = detail/cart open-close + return-route/scroll restore callbacks
  - `app/(components)/useHomeProductSectionEffects.ts` = stable effect-hook barrel import surface
  - `app/(components)/useHomeProductSectionEffects.ui.ts` = cart/hash/open-cart/footer sync effects
  - `app/(components)/useHomeProductSectionEffects.query.ts` = package/category/product/cart query-sync effects
  - `app/(components)/useHomeProductSectionEffects.lifecycle.ts` = bootstrap/cache/recovery/address lifecycle effects
  - `app/(components)/useHomeProductSectionEffects.computation.ts` = totals/filter/cart-prune/symptom-category computation effects
  - `app/(components)/homeProductSectionEffects.types.ts` = shared effect input type aliases
- My-data page split:
  - `app/my-data/page.tsx` = route-level guard + section composition
  - `app/my-data/myDataPageData.ts` = session/actor/appUser + my-data query orchestration
  - `app/my-data/myDataPageSections.tsx` = account/orders/assessment/check-ai/chat section rendering blocks
- Order-complete page split:
  - `app/(orders)/order-complete/page.tsx` = payment verification + order-create orchestration + notification UI
  - `app/(orders)/order-complete/orderCompleteFlow.ts` = payment context/order draft parsing + payment outcome normalization + checkout/payment storage cleanup
- Assess C-section split:
  - `app/assess/components/CSection.tsx` = C-section UI shell + option grid composition
  - `app/assess/components/useCSectionController.ts` = C-section state/submission/persist/transition orchestration
  - `app/assess/components/CSectionOptionGrid.tsx` = option grid/button rendering block
  - `app/assess/components/cSection.helpers.ts` = result normalization + question-type/answer-normalization + grid-col helpers
  - `app/assess/components/LoadingOverlay.tsx` = shared loading overlay with dot animation
  - `app/assess/data/c-bank.ts` = C-section 질문 텍스트(한국어 원문 source of truth)
  - `app/assess/data/c-options.ts` = C-section 선택지 텍스트(한국어 원문 source of truth)
- Header/nav ownership:
  - `components/common/topBar.tsx` = shell orchestration (route transitions + action wiring)
  - `components/common/topBar.header.tsx` = top header rendering
  - `components/common/topBar.drawer.tsx` = drawer rendering + overlay
  - `components/common/topBar.hooks.ts` = login/cart/scroll/logo hooks
  - `components/common/menuLinks.tsx` = menu controller state (admin reveal, AI dropdown, timers)
  - `components/common/menuLinks.desktop.tsx` = desktop menu rendering
  - `components/common/menuLinks.drawer.tsx` = drawer menu rendering
  - `components/common/menuLinks.shared.tsx` = shared badges/visibility/operator links
- Profile image editor split:
  - `app/me/profileImageEditor.tsx` = modal shell + crop editor wiring
  - `app/me/useProfileImageEditorController.ts` = crop state/zoom/drag/wheel/apply orchestration
  - `app/me/profileImageEditor.previewPane.tsx` = crop grid + live preview rendering block
  - `app/me/profileImageEditor.controls.tsx` = zoom slider + reset/cancel/apply actions
  - `app/me/profileImageEditor.helpers.ts` = crop math + canvas render + image decode helpers
- Me profile surface split:
  - `app/me/meClient.tsx` = me page state orchestration + modal wiring
  - `app/me/meProfileSection.tsx` = profile card image picker + field rows rendering
  - `app/me/useMeProfileMutations.ts` = profile save/unlink/upload side-effect hook
- Me account modal split:
  - `app/me/emailChangeModal.tsx` = 이메일 변경 모달 UI 셸 + 드래그 모달 wiring
  - `app/me/useEmailChangeModalState.ts` = 이메일 OTP 발송/검증 상태 + 요청 + 쿨다운/키보드 제어
  - `app/me/nicknameChangeModal.tsx` = 닉네임 변경 모달 UI 셸 + 드래그 모달 wiring
  - `app/me/useNicknameChangeModalState.ts` = 닉네임 중복검사/저장 상태 + 요청 + 키보드 제어
  - `app/me/phoneLinkSection.tsx` = 전화번호 OTP 연동 폼 UI 셸
  - `app/me/usePhoneLinkSectionState.ts` = 전화번호 OTP 전송/검증 상태 + 요청 + 폼 잠금/재수정 제어
  - `app/me/modalSpinner.tsx` = me 모달 공용 스피너 렌더러
- Google translate gate split:
  - `components/common/GoogleTranslateGate.tsx` = route-based translate gate + script loader shell
  - `public/scripts/google-translate-orchestrator.js` = translate orchestration runtime script
- Test report page split:
  - `app/test/page.tsx` = A4 report layout orchestration + fixture data composition
  - `app/test/reportBlocks.tsx` = gauge/bar/donut/legend/card visual block components
- Testimonials section split:
  - `app/(components)/testimonialsSection.tsx` = section shell + heading composition + carousel hook wiring
  - `app/(components)/useTestimonialsCarousel.ts` = auto-scroll/drag/wheel/progress orchestration
  - `app/(components)/testimonialsCarouselViewport.tsx` = carousel viewport + track + progress composition
  - `app/(components)/testimonialCard.tsx` = testimonial card rendering block
  - `app/(components)/testimonialsProgressBar.tsx` = progress indicator UI
  - `app/(components)/testimonials.types.ts` = testimonial item contract type
- If updating menu policy, keep desktop and drawer variants in sync.

## 6) Push Subscriptions

- `lib/notification/subscriptions.ts` is the public facade for role-specific subscription APIs.
- `lib/notification/subscriptions.shared.ts` owns shared DB/log + scoped where/upsert/status helpers.
- Keep route-level ownership guards intact; only persistence/logging logic belongs there.
- Push subscribe route map:
  - `lib/server/push-subscribe-route.ts` = role action orchestration + response shaping
  - `lib/server/push-subscribe-parse.ts` = role-specific `zod` body schemas + parse helpers/types
  - `lib/server/push-subscribe-auth.ts` = ownership/session guard wrappers + parse/authorize/execute runner
  - `lib/server/push-detach-route.ts` = detach policy by role scope (`customer` requires `orderId`)
- Push fanout ownership map:
  - `lib/notification/core.ts` = fanout orchestration + subscription/order summary fetch
  - `lib/notification/core.runtime.ts` = env/runtime policy + concurrency helpers
  - `lib/notification/core.error.ts` = push/prisma error classification guards
  - `lib/notification/core.delivery-gate.ts` = dedupe gate/finalize/dead-endpoint cleanup
  - `lib/notification/core.types.ts` = shared push role/target/outcome contracts

## 7) Result Normalizer Map

- Keep assessment/check-ai normalizer boundaries explicit:
  - `lib/server/result-normalizer.ts` = stable export surface only
  - `lib/server/result-normalizer.types.ts` = snapshot/result types + version constants
  - `lib/server/result-normalizer.shared.ts` = shared parsing/normalization primitives
  - `lib/server/result-normalizer.assess.ts` = assess question/score snapshots + summary
  - `lib/server/result-normalizer.check-ai.ts` = check-ai snapshot/score normalization
- If adding a new snapshot schema, extend `types` first, then wire assess/check-ai module.

## 8) Product Query Map

- Keep product boundaries explicit:
  - `lib/product/product.ts` = stable export surface + chat catalog pricing selection logic
  - `lib/product/product.shared.ts` = shared product where/select/order constants + rating-default mapper
  - `lib/product/product.catalog.ts` = home/list/name/summary product query paths
  - `lib/product/product.admin.ts` = admin CRUD + relation-id connect mapper
- In `use server` files, prefer async wrapper exports over direct re-export syntax.

## 9) NHIS Normalize Map

- Keep normalization responsibilities separated by module:
  - `lib/server/hyphen/normalize.ts`: top-level orchestrator/composer only
  - `lib/server/hyphen/normalize-shared.ts`: primitive/object/list helpers
  - `lib/server/hyphen/normalize-treatment.ts`: medical/medication flattening
  - `lib/server/hyphen/normalize-checkup.ts`: checkup list/yearly/overview shaping
  - `lib/server/hyphen/normalize-health-age.ts`: health-age summary projection
- `lib/server/hyphen/normalize-recommendation.ts`: recommendation timeline/caution derivation
- If adding a new NHIS target, add a dedicated normalize module first, then wire it in `normalize.ts`.

## 10) Health-Link Utility Map

- Keep `/health-link` utility boundaries explicit:
  - `app/(features)/health-link/utils.ts`: barrel export only (stable import surface)
  - `app/(features)/health-link/utils-format.ts`: label/date/table/json formatting helpers
  - `app/(features)/health-link/utils-session.ts`: session-expiry + fetch-failure message policy
- `app/(features)/health-link/utils-health-data.ts`: checkup/medication summarization logic
- For UI overflow bugs, prefer CSS containment/wrapping fixes in `HealthLinkClient.module.css` before changing data contracts.

## 11) Payment Verification Map

- Keep payment provider boundaries explicit:
  - `app/api/get-payment-info/route.ts` = request validation + provider-path orchestration + normalized error response shape
  - PortOne v1 (`inicis`) and v2 lookups should remain isolated helper paths to reduce token/response parsing drift.
- If adding payment methods, extend request validation first and then add provider helper branch.

## 12) Assess Storage Map

- Keep assess persistence boundaries explicit:
  - `app/assess/page.tsx` = assess route-level section render composition
  - `app/assess/useAssessFlow.ts` = question flow/evaluation orchestration + C-section transition/submit wiring
  - `app/assess/lib/assessStorage.ts` = localStorage snapshot load/save/clear + C-section previous-step rollback
- If adjusting assess persistence shape, update storage helper contracts before page orchestration logic.

## 13) Client Link Map

- Keep client-link identity boundaries explicit:
  - `lib/server/client-link.ts` = request attach/resolve orchestration surface
  - `lib/server/client-link.session.ts` = session-context resolution + appUser-client lookup
  - `lib/server/client-link.merge.ts` = preferred-client selection + cross-client data merge + masked logging helper
- For merge-policy edits, update `client-link.merge.ts` first and keep `client-link.ts` focused on flow orchestration.

## 14) Hyphen Client Map

- Keep Hyphen transport boundaries explicit:
  - `lib/server/hyphen/client.ts` = stable export surface + endpoint wrapper composition
  - `lib/server/hyphen/client.contracts.ts` = endpoint constants + request/response/common contract types
  - `lib/server/hyphen/client.runtime.ts` = env/auth timeout and common/step/cookie parsing helpers
  - `lib/server/hyphen/client.request.ts` = `hyphenPost` transport + `HyphenApiError` classification
- When adding endpoint wrappers, wire endpoint constants in `client.contracts.ts` first, then register wrapper export in `client.ts`.

## 15) NHIS Executor Map

- Keep NHIS fetch executor boundaries explicit:
  - `lib/server/hyphen/fetch-executor.ts` = fetch target orchestration, failure marking, and payload assembly
  - `lib/server/hyphen/fetch-executor.helpers.ts` = year/detail-key parsing, payload list merge, medication probe-window derivation
- Keep NHIS fetch-route boundaries explicit:
  - `lib/server/hyphen/fetch-route-helpers.ts` = request schema + execution-context resolution + failed-response shaping
  - `lib/server/hyphen/fetch-route-persist.ts` = execute/persist orchestration + safe attempt logging + AI enrichment + failure code normalization
  - `lib/server/hyphen/fetch-route-types.ts` = shared fetch-route type contracts
  - `lib/server/hyphen/fetch-route-constants.ts` = NHIS auth/session error-code constants
- If changing fetch sequencing/policy, edit `fetch-executor.ts`; if changing parsing windows/keys/year handling, edit `fetch-executor.helpers.ts`.

## 16) Module07 MVP Map

- Keep Module07 deterministic runtime boundaries explicit:
  - `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.ts` = end-to-end orchestration, validation loop, wiring/output assembly
  - `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.shared.ts` = run-id/source/sensitivity/group/sort/source-summary helpers
  - `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.artifacts.ts` = session artifact payload + evidence + lineage builders
- If editing algorithm contracts, keep builders in `mvp-engine.artifacts.ts` aligned first, then wire orchestration in `mvp-engine.ts`.

## 17) Module02/03/04/05/06/07 Contracts Map

- Keep Module02 contract boundaries explicit:
  - `lib/rnd/module02-data-lake/contracts.ts` = stable export surface only
  - `lib/rnd/module02-data-lake/contracts.model.ts` = constants + type contracts + record-id builders
  - `lib/rnd/module02-data-lake/contracts.guards.ts` = runtime payload guards + assert helpers
- Keep Module03 contract boundaries explicit:
  - `lib/rnd/module03-personal-safety/contracts.ts` = stable export surface only
  - `lib/rnd/module03-personal-safety/contracts.model.ts` = constants + type contracts
  - `lib/rnd/module03-personal-safety/contracts.guards.ts` = runtime payload guards + assert helpers
- Keep Module04 contract boundaries explicit:
  - `lib/rnd/module04-efficacy-quantification/contracts.ts` = stable export surface only
  - `lib/rnd/module04-efficacy-quantification/contracts.model.ts` = constants + type contracts
  - `lib/rnd/module04-efficacy-quantification/contracts.guards.ts` = runtime payload guards + assert helpers
- Keep Module05 contract boundaries explicit:
  - `lib/rnd/module05-optimization/contracts.ts` = stable export surface only
  - `lib/rnd/module05-optimization/contracts.model.ts` = constants + type contracts
  - `lib/rnd/module05-optimization/contracts.guards.ts` = runtime payload guards + assert helpers
- Keep Module05 scaffold boundaries explicit:
  - `lib/rnd/module05-optimization/scaffold.ts` = scaffold bundle orchestration surface
  - `lib/rnd/module05-optimization/scaffold.fixture-data.ts` = deterministic scaffold input/output/trace fixture data
  - `lib/rnd/module05-optimization/scaffold.assert.ts` = scaffold cross-payload integrity assertions
  - `lib/rnd/module05-optimization/scaffold.types.ts` = scaffold bundle type contracts
- Keep Module06 contract boundaries explicit:
  - `lib/rnd/module06-closed-loop-ai/contracts.ts` = stable export surface only
  - `lib/rnd/module06-closed-loop-ai/contracts-types.ts` = constants + type contracts
  - `lib/rnd/module06-closed-loop-ai/contracts-validators.ts` = runtime validator export surface
  - `lib/rnd/module06-closed-loop-ai/contracts-validators-primitives.ts` = primitive/shared validators
  - `lib/rnd/module06-closed-loop-ai/contracts-validators-loop-input.ts` = loop-input payload guards + assert helpers
  - `lib/rnd/module06-closed-loop-ai/contracts-validators-loop-output.ts` = loop-output payload guards + assert helpers
- Keep Module07 contract boundaries explicit:
  - `lib/rnd/module07-biosensor-genetic-integration/contracts.ts` = stable export surface only
  - `lib/rnd/module07-biosensor-genetic-integration/contracts.model.ts` = constants + type contracts
  - `lib/rnd/module07-biosensor-genetic-integration/contracts.guards.ts` = runtime payload guards + assert helpers
- If changing schema/type shape, update each module's `contracts.model.ts` first, then align runtime guards.

## 18) B2B Score Engine Map

- 점수 산출 분리 경계:
  - `lib/b2b/report-score-engine.ts` = 점수 산출 오케스트레이션(우선순위/결측 처리/사유(detail) 구성)
  - `lib/b2b/report-score-profile.ts` = 가중치/상태별 점수/위험도 밴드 정책
  - `lib/b2b/report-payload.ts` = DB 조회 오케스트레이션 + payload 조립
  - `lib/b2b/report-payload-medication.ts` = 복약 row 추출/품질 정렬/이력 백필 전용 모듈
  - `lib/b2b/report-payload-health.ts` = health payload facade re-export surface
  - `lib/b2b/report-payload-health-metrics.ts` = 검진 지표 추출 + 단위 정규화
  - `lib/b2b/report-payload-health-medication.ts` = medication container 파싱 + 방문 단위 통합
  - `lib/b2b/report-payload-health-fetch.ts` = partial/failedTargets 파싱
  - `lib/b2b/report-payload-analysis.ts` = analysis payload 파싱/정규화(요약/설문/검진/추이/AI)
  - `lib/b2b/report-payload-types.ts` = 최종 payload 계약 타입
- 점수 정책 교체는 프로파일 파일부터 수정하고, 엔진은 가능한 한 조합만 담당하게 유지.
- 상세 가이드: `docs/b2b_report_payload_map.md`

## 19) C~E QA Selector Map

- `scripts/qa/verify-cde-regression.cjs`는 employee-report 자동검증 시 텍스트 매칭 대신 `data-testid`를 우선 사용.
- selector 계약 문서: `docs/qa_cde_regression_selectors.md`
- UI 리팩터 시 selector 변경이 필요하면, QA 스크립트와 문서를 반드시 한 번에 동기화.

## 20) B2B Admin Report Client Map

- `admin/b2b-reports` 경계:
  - 오케스트레이션: `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
  - UI 블록:
    - `app/(admin)/admin/b2b-reports/_components/B2bAdminOpsHero.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bEmployeeSidebar.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bEmployeeOverviewCard.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bNoteEditorPanel.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bAnalysisJsonPanel.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bLayoutValidationPanel.tsx`
  - 설문 입력 필드 UI: `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx`
  - 클라이언트 타입: `app/(admin)/admin/b2b-reports/_lib/client-types.ts`
  - 클라이언트 API: `app/(admin)/admin/b2b-reports/_lib/api.ts`
  - 클라이언트 유틸: `app/(admin)/admin/b2b-reports/_lib/client-utils.ts`
  - 공용 payload 타입: `lib/b2b/report-summary-payload.ts`
- 상세 가이드: `docs/b2b_admin_report_client_map.md`

## 21) B2B Report Summary Map

- `components/b2b/ReportSummaryCards.tsx`는 표현/뷰모델 조합 중심으로 유지.
- 파생 데이터 계산/정규화는 `components/b2b/report-summary/view-model.ts`에서 처리.
- 공용 표시 헬퍼는 `components/b2b/report-summary/helpers.ts`에서 유지.
- payload 계약 변경은 `lib/b2b/report-summary-payload.ts`부터 수정 후 컴파일 에러를 따라 반영.
- score 정책 변경은 `lib/b2b/report-score-profile.ts`, `lib/b2b/report-score-engine.ts`에서 처리.
- 상세 가이드: `docs/b2b_report_summary_map.md`

## 22) Column Editor Map

- `/admin/column/editor` 유지보수 경계:
  - 오케스트레이션: `app/(admin)/admin/column/editor/EditorAdminClient.tsx`
  - UI 블록:
    - `app/(admin)/admin/column/editor/_components/ColumnEditorHeader.tsx`
    - `app/(admin)/admin/column/editor/_components/ColumnPostListSidebar.tsx`
    - `app/(admin)/admin/column/editor/_components/ColumnEditorWorkspace.tsx`
  - 타입 계약: `app/(admin)/admin/column/editor/_lib/types.ts`
  - API 호출: `app/(admin)/admin/column/editor/_lib/api.ts`
  - 순수 유틸: `app/(admin)/admin/column/editor/_lib/utils.ts`
- 상세 가이드: `docs/column_editor_client_map.md`

## 23) Wellness Data Loader Map

- Keep wellness survey data-loader boundaries explicit:
  - `lib/wellness/data-loader.ts` = JSON schema parse + in-memory cache + template loader entry
  - `lib/wellness/data-loader-template.ts` = template assembly orchestration (`C27` rule values + version/rules wiring)
  - `lib/wellness/data-loader-template.mappers.ts` = mapper export surface (barrel)
  - `lib/wellness/data-loader-template.common.ts` = common question template mapping helpers
  - `lib/wellness/data-loader-template.sections.ts` = section template + section-catalog mapping helpers
  - `lib/wellness/data-loader-template.version.ts` = template major-version parser policy
  - `lib/wellness/data-loader-template.shared.ts` = shared question type + template-question type normalizer
  - `lib/wellness/data-template-types.ts` = B2B survey template type contracts
- If changing user-facing placeholder/description copy in survey template, edit `data-loader-template.ts` first and keep Korean-first copy policy.

## 24) Employee Report Client Map

- `/employee-report` 유지보수 경계:
  - 오케스트레이션: `app/(features)/employee-report/EmployeeReportClient.tsx`
  - 타입 계약: `app/(features)/employee-report/_lib/client-types.ts`
  - API 경계: `app/(features)/employee-report/_lib/api.ts`
  - 요청/가이드 유틸: `app/(features)/employee-report/_lib/client-utils.ts`
  - UI 블록:
    - `app/(features)/employee-report/_components/EmployeeReportIdentitySection.tsx`
    - `app/(features)/employee-report/_components/EmployeeReportSummaryHeaderCard.tsx`
    - `app/(features)/employee-report/_components/EmployeeReportSyncGuidanceNotice.tsx`
- 상세 가이드: `docs/employee_report_client_map.md`

## 25) Module03 Scheduler Handoff Validation Map

- Keep handoff validation boundaries explicit:
  - `scripts/rnd/module03/run-scheduler-handoff-validation.ts` = orchestration entry (args -> runtime flow -> summary emit)
  - `scripts/rnd/module03/scheduler-handoff-validation-cli.ts` = handoff CLI parse/default policy helpers
  - `scripts/rnd/module03/scheduler-handoff-validation-runtime.ts` = stable export surface for handoff runtime helper modules
  - `scripts/rnd/module03/scheduler-handoff-validation-runtime-types.ts` = handoff runtime constants/contracts (`MODULE_ID`, `KPI_ID`, `ValidationPaths`, `ValidationInputResolution`)
  - `scripts/rnd/module03/scheduler-handoff-validation-runtime-input.ts` = handoff input generation/resolution + path helpers
  - `scripts/rnd/module03/scheduler-handoff-validation-runtime-exec.ts` = stable export surface for handoff runtime env/runner helper modules
  - `scripts/rnd/module03/scheduler-handoff-validation-runtime-exec-env.ts` = handoff secret-binding + runtime env override helpers
  - `scripts/rnd/module03/scheduler-handoff-validation-runtime-exec-runners.ts` = handoff deployment/infra/dry-run runner invocation + verification helpers
  - `scripts/rnd/module03/scheduler-handoff-validation-artifacts.ts` = stable export surface for handoff validation parser/summary helpers
  - `scripts/rnd/module03/scheduler-handoff-validation-types.ts` = deployment/dry-run/handoff summary contracts
  - `scripts/rnd/module03/scheduler-handoff-validation-parsers.ts` = stable export surface for deployment/dry-run parser modules
  - `scripts/rnd/module03/scheduler-handoff-validation-parse-deployment.ts` = deployment bundle parser + identity/section validation helpers
  - `scripts/rnd/module03/scheduler-handoff-validation-parse-dry-run.ts` = dry-run report parser + verification section validation helpers
  - `scripts/rnd/module03/scheduler-handoff-validation-summary.ts` = handoff summary section + summary composition helpers
  - `scripts/rnd/module03/run-generate-scheduler-deployment-bundle.cjs` = deployment bundle generation runner
  - `scripts/rnd/module03/run-generate-scheduler-infra-binding.cjs` = infra binding runner
  - `scripts/rnd/module03/run-scheduler-dry-run-window.cjs` = dry-run execution runner
- For changes to handoff flow, edit helpers in this order:
  - argument parsers (`parseWindowEndArg`, `parseOutDirArg`, `parseInputPathArg`, `parseSampleRowCountArg`, `parseSchedulerNameArg`, `parseEnvironmentArg`) in `scheduler-handoff-validation-cli.ts`
  - path/input helpers (`buildValidationPaths`, `resolveValidationInput`) in `scheduler-handoff-validation-runtime-input.ts`
  - runtime env/secret-binding helpers (`buildSecretBindingMap`, `buildRuntimeEnvValues`, `toRuntimeEnvOverrides`) in `scheduler-handoff-validation-runtime-exec-env.ts`
  - runner/runtime helpers (`assertSchedulerRunnersAvailable`, `runDeploymentBundleGeneration`, `runInfraBindingGeneration`, `runDryRunValidation`) in `scheduler-handoff-validation-runtime-exec-runners.ts`
  - deployment parser helpers (`parseDeploymentBundle`) in `scheduler-handoff-validation-parse-deployment.ts`
  - dry-run parser helpers (`parseDryRunReport`) in `scheduler-handoff-validation-parse-dry-run.ts`
  - summary shape helpers in `scheduler-handoff-validation-summary.ts` (`buildSummaryInputSection`, `buildSummarySecretsSection`, `buildSummaryVerificationSection`, `buildValidationSummary`)

## 26) Module03 Scheduler Production Gate Map

- Keep production-gate boundaries explicit:
  - `scripts/rnd/module03/run-scheduler-production-gate.ts` = production gate orchestration (args -> handoff -> readiness -> gate artifact)
  - `scripts/rnd/module03/scheduler-production-gate-cli.ts` = production gate CLI parse/default policy helpers
  - `scripts/rnd/module03/scheduler-production-gate-runtime.ts` = production gate runtime helpers (runner availability/path build/handoff/readiness execution)
  - `scripts/rnd/module03/scheduler-production-gate-artifacts.ts` = readiness report parser + gate artifact builder helpers
  - `scripts/rnd/module03/scheduler-production-gate-types.ts` = production gate contracts + module/kpi constants
  - `scripts/rnd/module03/run-scheduler-handoff-validation.cjs` = handoff validation runner
  - `scripts/rnd/module03/run-validate-scheduler-production-readiness.cjs` = readiness validation runner
- For production-gate flow changes, edit helpers in this order:
  - argument parsers in `scheduler-production-gate-cli.ts` (`parseInputPath`, `parseSchedulerName`, `parseEnvironmentArgs`, `parseOptionalSampleRowCount`, `parseValidatedKeyValuePairs`, `parseArgs`)
  - path/runtime helpers in `scheduler-production-gate-runtime.ts` (`assertProductionGateRunnersAvailable`, `buildProductionGatePaths`, `runHandoffValidation`, `runReadinessValidation`)
  - artifact helpers in `scheduler-production-gate-artifacts.ts` (`parseReadinessReport`, `buildProductionGateArtifact`)

## 27) Module03 Scheduler Readiness Checks Map

- Keep readiness-check boundaries explicit:
  - `scripts/rnd/module03/scheduler-readiness-checks.ts` = readiness check orchestration entry
  - `scripts/rnd/module03/scheduler-readiness-checks.types.ts` = readiness check contracts/options/context types
  - `scripts/rnd/module03/scheduler-readiness-checks.shared.ts` = shared helper/context builder utilities
  - `scripts/rnd/module03/scheduler-readiness-checks.execution.ts` = execution/input/environment check groups
  - `scripts/rnd/module03/scheduler-readiness-checks.integrity.ts` = env coverage + secret hygiene + scheduler-template check groups
  - `scripts/rnd/module03/scheduler-readiness-artifacts.ts` = summary/infra artifact contracts and parsing
- For readiness-check rule changes, edit helpers in this order:
  - context/helper policy (`buildReadinessCheckContext`, `addCheck`, `areSetsEqual`, `isPlaceholderSecretRef`, `isRndDefaultSecretRef`) in `scheduler-readiness-checks.shared.ts`
  - execution/input checks (`addExecutionChecks`, `addInputAndEnvironmentChecks`) in `scheduler-readiness-checks.execution.ts`
  - env/binding integrity checks (`addRequiredEnvCoverageChecks`) in `scheduler-readiness-checks.integrity.ts`
  - secret hygiene checks (`addSecretRefChecks`) in `scheduler-readiness-checks.integrity.ts`
  - command template check (`addSchedulerTemplateCheck`) in `scheduler-readiness-checks.integrity.ts`

## 28) Module03 Scheduler Infra Binding Map

- Keep infra-binding boundaries explicit:
  - `scripts/rnd/module03/generate-scheduler-infra-binding.ts` = infra binding orchestration (args parse + bundle load + binding merge + artifact emit)
  - `scripts/rnd/module03/scheduler-infra-binding-artifacts.ts` = stable export surface for infra-binding parser/builder helpers
  - `scripts/rnd/module03/scheduler-infra-binding-types.ts` = deployment/infra-binding contracts
  - `scripts/rnd/module03/scheduler-infra-binding-parsers.ts` = deployment bundle parser helpers
  - `scripts/rnd/module03/scheduler-infra-binding-builders.ts` = infra binding artifact builder helpers
  - `scripts/rnd/module03/scheduler-secret-bindings.ts` = secret-binding file/CLI parser + merge/conflict rules
  - `scripts/rnd/module03/run-generate-scheduler-infra-binding.cjs` = infra-binding generator runner
- For bundle parser changes, edit helpers in this order:
  - identity/object guards (`assertBundleIdentity`, `requireBundleObject`) in `scheduler-infra-binding-parsers.ts`
  - array/template parsers (`parseStringArrayOrThrow`, `parseBindingsTemplateOrThrow`) in `scheduler-infra-binding-parsers.ts`
  - section parsers (`parseSchedulerSection`, `parseWarehouseSection`, `parseSecretsSection`, `parseArtifactsSection`, `parseVerificationSection`) in `scheduler-infra-binding-parsers.ts`
  - binding parser/merge helpers (`loadBindingsFromFile`, `loadBindingsFromCli`, `mergeBindings`) in `scheduler-secret-bindings.ts`
  - artifact builders (`buildInfraBindingArtifact`) in `scheduler-infra-binding-builders.ts`

## 29) Module03 Scheduler Dry-Run Window Map

- Keep dry-run window boundaries explicit:
  - `scripts/rnd/module03/run-scheduler-dry-run-window.ts` = dry-run orchestration (infra load -> scheduler execution -> output verification -> report emit)
  - `scripts/rnd/module03/scheduler-dry-run-artifacts.ts` = stable export surface for dry-run parser/plan helpers
  - `scripts/rnd/module03/scheduler-dry-run-types.ts` = dry-run cli/infra/report contracts + module/kpi constants
  - `scripts/rnd/module03/scheduler-dry-run-infra.ts` = stable export surface for dry-run infra CLI/parser modules
  - `scripts/rnd/module03/scheduler-dry-run-infra-cli.ts` = dry-run CLI/default parser + input/window flag validation
  - `scripts/rnd/module03/scheduler-dry-run-infra-parser.ts` = infra-binding artifact parser + artifact path resolver
  - `scripts/rnd/module03/scheduler-dry-run-plan.ts` = stable export surface for dry-run scheduler arg/output helper modules
  - `scripts/rnd/module03/scheduler-dry-run-plan-args.ts` = scheduler arg composition + retention/env/failure-webhook flag helpers
  - `scripts/rnd/module03/scheduler-dry-run-plan-output.ts` = expected output verification + default output path helpers
  - `scripts/rnd/module03/run-adverse-event-evaluation-scheduler.cjs` = scheduler runtime runner
- For dry-run parser/arg-flow changes, edit helpers in this order:
  - cli/default helpers (`parseCliArgs`) in `scheduler-dry-run-infra-cli.ts`
  - infra parser helpers (`assertInfraBindingIdentity`, `requireInfraSectionObject`, `parseInfra*Section`, `resolveArtifactPath`) in `scheduler-dry-run-infra-parser.ts`
  - arg composition helpers (`resolveSchedulerArtifactPaths`, `buildBaseSchedulerArgs`, `applyRetentionMonthsArg`, `applyRequiredEnvArg`, `applyFailureWebhookArgs`) in `scheduler-dry-run-plan-args.ts`
  - output helper (`verifyExpectedOutputs`, `buildDefaultOutPath`) in `scheduler-dry-run-plan-output.ts`
  - dry-run execution helpers (`assertSchedulerRunnerExists`, `toProcessOutput`, `buildDryRunExecutionError`, `runSchedulerDryRun`) in `run-scheduler-dry-run-window.ts`
  - orchestration/report helper (`main`) in `run-scheduler-dry-run-window.ts`

## 30) Module03 Scheduler Deployment Bundle Map

- Keep deployment-bundle boundaries explicit:
  - `scripts/rnd/module03/generate-scheduler-deployment-bundle.ts` = deployment-bundle orchestration (args parse -> bundle build -> output emit)
  - `scripts/rnd/module03/scheduler-deployment-bundle-cli.ts` = deployment-bundle CLI orchestration entry
  - `scripts/rnd/module03/scheduler-deployment-bundle-cli-defaults.ts` = deployment-bundle CLI default constants
  - `scripts/rnd/module03/scheduler-deployment-bundle-cli-fields.ts` = deployment-bundle CLI field parser + validation helpers
  - `scripts/rnd/module03/scheduler-deployment-bundle-artifacts.ts` = command derivation + bundle section builders + final bundle composition
  - `scripts/rnd/module03/scheduler-deployment-bundle-types.ts` = deployment-bundle contracts + module/kpi identity constants
  - `scripts/rnd/module03/run-generate-scheduler-deployment-bundle.cjs` = deployment-bundle generator runner
- For deployment-bundle changes, edit helpers in this order:
  - default constants in `scheduler-deployment-bundle-cli-defaults.ts`
  - argument parsers (`parseGeneratedAtArg`, `parseCadenceCronArg`, `parseTimezoneArg`, `parseRetentionMonthsArg`, `parseSchemaMapPathArg`, `parseSqlTemplatePathArg`, `parseFailureWebhookEnvKeyArg`, `parseFailureWebhookTimeoutEnvKeyArg`) in `scheduler-deployment-bundle-cli-fields.ts`
  - argument wiring (`parseArgs`) in `scheduler-deployment-bundle-cli.ts`
  - command derivation (`buildCommandArgs`, `buildCommandTemplate`, `resolveDeploymentRequiredEnvKeys`) in `scheduler-deployment-bundle-artifacts.ts`
  - section builders (`buildWarehouseSection`, `buildSecretsSection`, `buildArtifactsSection`, `buildVerificationSection`) in `scheduler-deployment-bundle-artifacts.ts`
  - final composition (`buildBundle`) in `scheduler-deployment-bundle-artifacts.ts`

## 31) Module03 Scheduler Orchestrator Map

- Keep scheduler-orchestrator boundaries explicit:
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly.ts` = scheduler entry + failure-alert wrapping
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly-cli.ts` = scheduler CLI/default parser + input/path/webhook validation helpers
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly-runtime.ts` = runtime orchestration (input precedence warn -> env guard -> export/archive execution -> handoff emit)
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly-artifacts.ts` = handoff artifact/latest pointer builders + output write/summary helpers
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly-export.ts` = stable export surface for export runtime/archive reader helpers
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly-export-runtime.ts` = export command rendering + export input resolution + archive runner invocation
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly-archive-readers.ts` = archive latest/manifest readers + strict identity parsing
  - `scripts/rnd/module03/orchestrate-adverse-event-evaluation-monthly-failure-alert.ts` = failure alert emit path
- For orchestrator changes, edit helpers in this order:
  - argument parsing/validation helpers (`assertInputSourceProvided`, `parseOptionalExistingFileArg`, `parseRequiredExistingFileArg`, `parseFailureWebhookUrlArg`, `parseFailureWebhookTimeoutArg`, `parseArgs`) in `orchestrate-adverse-event-evaluation-monthly-cli.ts`
  - execution helpers (`warnWhenInputTakesPrecedence`, `runArchiveAndReadResults`, `runScheduler`) in `orchestrate-adverse-event-evaluation-monthly-runtime.ts`
  - export/runtime helpers (`resolveExportInput`, `readExportRows`, `runArchiveEvaluation`) in `orchestrate-adverse-event-evaluation-monthly-export-runtime.ts`
  - archive reader helpers (`readArchiveLatest`, `readArchiveManifestEntryCount`) in `orchestrate-adverse-event-evaluation-monthly-archive-readers.ts`
  - handoff builders/output helpers (`buildHandoffArtifact`, `buildHandoffLatestPointer`, `buildHandoffOutputs`, `writeHandoffOutputs`, `printSchedulerSummary`) in `orchestrate-adverse-event-evaluation-monthly-artifacts.ts`
  - failure-alert/webhook helpers (`deliverFailureWebhook`, `emitFailureAlert`) in `orchestrate-adverse-event-evaluation-monthly-failure-alert.ts`

## 32) Module02 KPI Rollup Map

- Keep Module02 rollup boundaries explicit:
  - `scripts/rnd/module02/evaluate-kpi-rollup.ts` = rollup orchestration (module runner execution -> output load -> rollup artifact emit)
  - `scripts/rnd/module02/kpi-rollup-artifacts.ts` = KPI contracts + KPI bundle builders + rollup summary helper
  - `scripts/rnd/module02/run-evaluation.cjs` = module02 evaluation runner
  - `scripts/rnd/module03~07/run-evaluation.cjs` = per-module evaluation runner chain
- For rollup changes, edit helpers in this order:
  - runner I/O helpers (`runModuleEvaluation`, `runAllModuleEvaluations`, `readModuleEvaluationOutputs`)
  - KPI builders (`buildKpi01`, `buildKpi02`, `buildKpi03`, `buildKpi04`, `buildKpi05Breakdown`, `buildKpi05Measurement`, `buildKpi06`, `buildKpi07`, `buildKpiBundle`) in `kpi-rollup-artifacts.ts`
  - rollup assembly helpers (`buildEnvironmentSnapshot`, `buildModuleArtifactEntries`, `buildRollupSummary`, `buildRollupReport`)

## 33) Module03 Monthly Archive Map

- Keep monthly-archive runner boundaries explicit:
  - `scripts/rnd/module03/archive-adverse-event-evaluation-monthly.ts` = archive orchestration (args parse -> ops run -> artifact assembly -> manifest/latest write -> log)
  - `scripts/rnd/module03/archive-adverse-event-evaluation-monthly-types.ts` = runner contracts/constants (`CliArgs`, default archive dir, ops runner path)
  - `scripts/rnd/module03/archive-adverse-event-evaluation-monthly-cli.ts` = runner CLI/default parser + arg/path validation
  - `scripts/rnd/module03/archive-adverse-event-evaluation-monthly-runtime.ts` = ops runner invocation + archive result logging helpers
  - `scripts/rnd/module03/monthly-archive-artifacts.ts` = stable export surface for archive parser/build helpers
  - `scripts/rnd/module03/monthly-archive-parsers.ts` = ops output + archive manifest parser helpers
  - `scripts/rnd/module03/monthly-archive-builders.ts` = archive path/entry/manifest/latest builder helpers
  - `scripts/rnd/module03/monthly-archive-retention.ts` = retention cutoff partition + archive prune + entry upsert policy helpers
  - `scripts/rnd/module03/monthly-archive-types.ts` = archive artifact contracts + module/kpi constants
  - `scripts/rnd/module03/run-adverse-event-evaluation-from-source.cjs` = ops evaluation runner
- For archive-runner changes, edit helpers in this order:
  - argument/validation helpers (`parseRequiredInputPathArg`, `parseOptionalExistingPathArg`, `parseRetentionMonthsArg`, `parseArgs`) in `archive-adverse-event-evaluation-monthly-cli.ts`
  - ops execution helpers (`assertOpsRunnerExists`, `buildOpsRunnerArgs`, `formatOpsEvaluationError`, `runOpsEvaluation`) in `archive-adverse-event-evaluation-monthly-runtime.ts`
  - ops/manifest parsers (`assertOpsOutputIdentity`, `parseOpsOutputReport`, `readOpsOutput`, `parseArchiveEntry*`, `readArchiveManifest`) in `monthly-archive-parsers.ts`
  - retention helpers (`upsertArchiveEntry`, `cutoffMonthStartUtcMs`, `partitionEntriesByCutoffMonth`, `pruneArchivedReports`, `pruneEmptyMonthDirectories`, `applyRetentionPolicy`) in `monthly-archive-retention.ts`
  - archive output helpers (`buildArchiveExecutionPaths`, `buildArchiveEntry`, `buildNextManifest`, `writeArchiveOutputs`) in `monthly-archive-builders.ts`
  - orchestration output helper (`logArchiveResults`) in `archive-adverse-event-evaluation-monthly-runtime.ts`

## 34) Module03 Production Readiness Validator Map

- Keep production-readiness validator boundaries explicit:
  - `scripts/rnd/module03/validate-scheduler-production-readiness.ts` = validator orchestration entry (args parse -> source load -> check compute -> report write -> exit policy)
  - `scripts/rnd/module03/validate-scheduler-production-readiness-types.ts` = validator contracts/constants
  - `scripts/rnd/module03/validate-scheduler-production-readiness-cli.ts` = validator CLI/default parser helpers
  - `scripts/rnd/module03/validate-scheduler-production-readiness-runtime.ts` = validator source-load/check-computation helpers
  - `scripts/rnd/module03/validate-scheduler-production-readiness-artifacts.ts` = validator report builder + exit policy helpers
  - `scripts/rnd/module03/scheduler-readiness-artifacts.ts` = stable export surface for readiness artifact parser/type modules
  - `scripts/rnd/module03/scheduler-readiness-artifacts.types.ts` = readiness artifact contracts/constants
  - `scripts/rnd/module03/scheduler-readiness-artifacts.parsers.ts` = stable export surface for readiness parser/path helper modules
  - `scripts/rnd/module03/scheduler-readiness-parse-common.ts` = shared readiness parser helpers (section guard/env-key array/secret-binding parser)
  - `scripts/rnd/module03/scheduler-readiness-parse-handoff.ts` = readiness handoff summary parser + identity/section validation helpers
  - `scripts/rnd/module03/scheduler-readiness-parse-infra.ts` = readiness infra-binding parser + identity/section validation helpers
  - `scripts/rnd/module03/scheduler-readiness-checks.ts` = readiness check orchestration entry
  - `scripts/rnd/module03/scheduler-readiness-checks.types.ts` = readiness check contracts/options/context types
  - `scripts/rnd/module03/scheduler-readiness-checks.shared.ts` = shared helper/context builder utilities
  - `scripts/rnd/module03/scheduler-readiness-checks.execution.ts` = execution/input/environment check groups
  - `scripts/rnd/module03/scheduler-readiness-checks.integrity.ts` = env coverage + secret hygiene + scheduler-template check groups
- For validator changes, edit helpers in this order:
  - argument/default parsing (`parseArgs`) in `validate-scheduler-production-readiness-cli.ts`
  - source loaders (`loadReadinessSource`) in `validate-scheduler-production-readiness-runtime.ts`
  - readiness handoff parser helpers (`parseHandoffSummary`) in `scheduler-readiness-parse-handoff.ts`
  - readiness infra parser helpers (`parseInfraBinding`) in `scheduler-readiness-parse-infra.ts`
  - readiness parser common helpers (`parseEnvironmentVariableArray`, `parseBindings`) in `scheduler-readiness-parse-common.ts`
  - readiness artifact path resolver (`resolveArtifactPath`) in `scheduler-readiness-artifacts.parsers.ts`
  - check execution (`computeReadinessChecks`) in `validate-scheduler-production-readiness-runtime.ts`
  - check group policy updates (`addExecutionChecks`, `addInputAndEnvironmentChecks`, `addRequiredEnvCoverageChecks`, `addSecretRefChecks`, `addSchedulerTemplateCheck`) in readiness-check modules
  - report assembly (`buildReadinessReport`) in `validate-scheduler-production-readiness-artifacts.ts`
  - output/exit policy (`handleReadinessExit`) in `validate-scheduler-production-readiness-artifacts.ts`

## 35) Module03 Ops Source Evaluation Map

- Keep ops-source evaluator boundaries explicit:
  - `scripts/rnd/module03/evaluate-adverse-event-count-from-source.ts` = orchestration entry (args -> schema/row parse -> KPI eval -> output emit)
  - `scripts/rnd/module03/evaluate-adverse-event-count-from-source-types.ts` = ops schema/cli contracts + module/kpi constants
  - `scripts/rnd/module03/evaluate-adverse-event-count-from-source-cli.ts` = CLI/default parser + input/evaluated-at validation helpers
  - `scripts/rnd/module03/evaluate-adverse-event-count-from-source-schema.ts` = schema-map parser + row-to-sample mapping helpers
  - `scripts/rnd/module03/evaluate-adverse-event-count-from-source-artifacts.ts` = ops evaluation output payload builder
- For ops-source evaluator changes, edit helpers in this order:
  - argument/default validation (`parseArgs`) in `evaluate-adverse-event-count-from-source-cli.ts`
  - schema parser helpers (`parseSchemaMap`) in `evaluate-adverse-event-count-from-source-schema.ts`
  - row mapping helpers (`parseReportedAt`, `parseBooleanLike`, `toSamples`) in `evaluate-adverse-event-count-from-source-schema.ts`
  - output composition (`buildOpsEvaluationOutput`) in `evaluate-adverse-event-count-from-source-artifacts.ts`
